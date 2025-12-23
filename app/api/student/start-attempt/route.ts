import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateRandomization } from "@/lib/randomization"
import { codeEntrySchema } from "@/lib/validations"
import { checkRateLimit, validateTelegramId } from "@/lib/security"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, telegramId, studentId } = body

    const codeValidation = codeEntrySchema.safeParse({ code })
    if (!codeValidation.success) {
      return NextResponse.json(
        { message: codeValidation.error.errors[0]?.message || "Noto'g'ri kod formati" },
        { status: 400 },
      )
    }

    if (!studentId || typeof studentId !== "number") {
      return NextResponse.json({ message: "Student ID topilmadi" }, { status: 400 })
    }

    if (telegramId && !validateTelegramId(telegramId)) {
      return NextResponse.json({ message: "Noto'g'ri Telegram ID" }, { status: 400 })
    }

    const rateLimit = checkRateLimit(`attempt:${studentId}`, 10, 3600)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Juda ko'p urinish. Iltimos, keyinroq qayta urinib ko'ring." },
        { status: 429 },
      )
    }

    const [testCode] = await sql`
      SELECT tc.*, e.name as exam_name 
      FROM test_codes tc
      JOIN exams e ON tc.exam_id = e.id
      WHERE tc.code = ${code.toUpperCase()} 
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
      WHERE sa.student_id = ${studentId} AND sa.code_used = ${code.toUpperCase()}
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

    const { questionOrder, optionOrders, seed } = generateRandomization(questions)

    // Create attempt with secure seed stored
    const [attempt] = await sql`
      INSERT INTO student_attempts (student_id, exam_id, code_used, started_at, randomization_seed)
      VALUES (${studentId}, ${testCode.exam_id}, ${code.toUpperCase()}, NOW(), ${seed})
      RETURNING id
    `

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
