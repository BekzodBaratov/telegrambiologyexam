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

    console.log("[v0] O2 answers request params:", { examId, ungradedOnly, testCode, questionPosition })

    // First, let's check if there are ANY completed attempts for this exam
    const attemptsCheck = await sql`
      SELECT id, student_id, status, code_used 
      FROM student_attempts 
      WHERE exam_id = ${examId}
    `
    console.log("[v0] All attempts for exam:", attemptsCheck)

    // Check if there are O2 questions in the exam
    const o2QuestionsCheck = await sql`
      SELECT eq.position, q.id, q.text, qt.code
      FROM exam_questions eq
      JOIN questions q ON eq.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE eq.exam_id = ${examId} AND qt.code = 'O2'
    `
    console.log("[v0] O2 questions in exam:", o2QuestionsCheck)

    // Check if there are any student answers for O2 questions
    const answersCheck = await sql`
      SELECT sa.id, sa.attempt_id, sa.question_id, sa.answer, sa.teacher_score
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE qt.code = 'O2'
      LIMIT 10
    `
    console.log("[v0] Sample O2 answers:", answersCheck)

    // Build parameterized query for O2 answers
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
        AND att.status = $2
    `

    const params: (string | number | boolean)[] = [examId, "completed"]

    let paramIndex = 3

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

    console.log("[v0] Final query:", query)
    console.log("[v0] Query params:", params)

    const answers = await sql.unsafe(query, params)

    console.log("[v0] Query result count:", Array.isArray(answers) ? answers.length : "not array")
    console.log("[v0] First few answers:", Array.isArray(answers) ? answers.slice(0, 3) : answers)

    return NextResponse.json(Array.isArray(answers) ? answers : [])
  } catch (error) {
    console.error("[v0] Get O2 answers error:", error)
    return NextResponse.json({ message: "Server error", error: String(error) }, { status: 500 })
  }
}
