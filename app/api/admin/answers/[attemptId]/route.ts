import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params

    const answers = await sql`
      SELECT sa.*, q.question_number, q.text as question_text, qt.code as question_type_code
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE sa.attempt_id = ${attemptId}
      ORDER BY q.question_number
    `

    return NextResponse.json(answers)
  } catch (error) {
    console.error("Get answers error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
