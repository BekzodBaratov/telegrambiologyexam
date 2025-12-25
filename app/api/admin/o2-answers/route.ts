import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")
    const ungradedOnly = searchParams.get("ungradedOnly") === "true"
    const testCode = searchParams.get("testCode")
    const questionPosition = searchParams.get("questionPosition")

    if (!examId) {
      return NextResponse.json({ message: "Exam ID is required" }, { status: 400 })
    }

    // and filter O2 questions correctly
    let query = `
      SELECT 
        sa.id,
        sa.attempt_id,
        s.full_name as student_name,
        eq.position as question_number,
        q.text as question_text,
        q.image_url as question_image_url,
        sa.answer,
        sa.image_urls,
        sa.teacher_score,
        q.max_score,
        att.code_used as test_code
      FROM student_answers sa
      JOIN student_attempts att ON sa.attempt_id = att.id
      JOIN students s ON att.student_id = s.id
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
      WHERE att.exam_id = $1 
        AND qt.code = 'O2'
        AND att.status = 'finished'
    `

    const params: (string | number)[] = [examId]
    let paramIndex = 2

    // Filter for ungraded only
    if (ungradedOnly) {
      query += ` AND sa.teacher_score IS NULL`
    }

    // Filter by test code
    if (testCode) {
      query += ` AND att.code_used = $${paramIndex}`
      params.push(testCode)
      paramIndex++
    }

    // Filter by question position
    if (questionPosition) {
      query += ` AND eq.position = $${paramIndex}`
      params.push(Number.parseInt(questionPosition))
      paramIndex++
    }

    query += ` ORDER BY s.full_name, eq.position`

    const answers = await sql.unsafe(query, params)

    return NextResponse.json(Array.isArray(answers) ? answers : [])
  } catch (error) {
    console.error("Get O2 answers error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
