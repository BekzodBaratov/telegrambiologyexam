import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { attemptId, answers } = await request.json()

    if (!attemptId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 })
    }

    for (const answer of answers) {
      // Get the question to check the correct answer
      const [question] = await sql`
        SELECT correct_answer, max_score FROM questions WHERE id = ${answer.questionId}
      `

      const isCorrect = question?.correct_answer
        ? question.correct_answer.toLowerCase() === (answer.answer || "").toLowerCase()
        : null

      const score = isCorrect ? question?.max_score || 1 : 0

      await sql`
        INSERT INTO student_answers (attempt_id, question_id, answer, image_urls, is_correct, score, updated_at)
        VALUES (
          ${attemptId},
          ${answer.questionId},
          ${answer.answer || null},
          ${answer.imageUrls ? JSON.stringify(answer.imageUrls) : null},
          ${isCorrect},
          ${score},
          NOW()
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
          answer = ${answer.answer || null},
          image_urls = ${answer.imageUrls ? JSON.stringify(answer.imageUrls) : null},
          is_correct = ${isCorrect},
          score = ${score},
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save answers error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
