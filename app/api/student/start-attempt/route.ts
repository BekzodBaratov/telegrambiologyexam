import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateRandomization } from "@/lib/randomization"

export async function POST(request: Request) {
  try {
    const { code, telegramId, studentId } = await request.json()

    if (!code) {
      return NextResponse.json({ message: "Kod kiritilishi shart" }, { status: 400 })
    }

    if (!studentId) {
      return NextResponse.json({ message: "Student ID topilmadi" }, { status: 400 })
    }

    const [testCode] = await sql`
      SELECT tc.*, e.name as exam_name 
      FROM test_codes tc
      JOIN exams e ON tc.exam_id = e.id
      WHERE tc.code = ${code} 
        AND tc.is_active = true
        AND (tc.valid_from IS NULL OR tc.valid_from <= NOW())
        AND (tc.valid_to IS NULL OR tc.valid_to >= NOW())
    `

    if (!testCode) {
      return NextResponse.json({ message: "Noto'g'ri yoki faol bo'lmagan kod" }, { status: 400 })
    }

    if (testCode.used_count >= testCode.max_attempts) {
      return NextResponse.json({ message: "Bu kod uchun maksimal foydalanish soni tugagan" }, { status: 400 })
    }

    // Check if student already took this test
    const [existingAttempt] = await sql`
      SELECT sa.* FROM student_attempts sa
      WHERE sa.student_id = ${studentId} AND sa.code_used = ${code}
    `

    if (existingAttempt) {
      return NextResponse.json(
        {
          message: "Siz bu testni allaqachon topshirgansiz",
          alreadyTaken: true,
        },
        { status: 400 },
      )
    }

    const questions = await sql`
      SELECT 
        q.id,
        q.group_id,
        q.order_in_group,
        q.options,
        qt.code as question_type_code
      FROM questions q
      JOIN exam_questions eq ON q.id = eq.question_id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE eq.exam_id = ${testCode.exam_id}
      ORDER BY eq.position
    `

    // Create a new attempt first to get the attempt ID for seeding
    const [attempt] = await sql`
      INSERT INTO student_attempts (student_id, exam_id, code_used, started_at)
      VALUES (${studentId}, ${testCode.exam_id}, ${code}, NOW())
      RETURNING id
    `

    const { questionOrder, optionOrders } = generateRandomization(questions, attempt.id)

    await sql`
      UPDATE student_attempts 
      SET question_order = ${JSON.stringify(questionOrder)}::jsonb,
          option_orders = ${JSON.stringify(optionOrders)}::jsonb
      WHERE id = ${attempt.id}
    `

    // Update code usage
    await sql`
      UPDATE test_codes SET used_count = used_count + 1 WHERE id = ${testCode.id}
    `

    return NextResponse.json({
      attemptId: attempt.id,
      examId: testCode.exam_id,
      studentId: studentId,
      examName: testCode.exam_name,
    })
  } catch (error) {
    console.error("Start attempt error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
