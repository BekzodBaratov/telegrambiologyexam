import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateOptionId } from "@/lib/option-utils"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { sectionId, questionTypeId, text, options, correctAnswer, imageUrl } = body

    const [currentQuestion] = await sql`SELECT * FROM questions WHERE id = ${id}`

    if (!currentQuestion) {
      return NextResponse.json({ message: "Savol topilmadi" }, { status: 404 })
    }

    let questionNumber = currentQuestion.question_number

    if (sectionId !== currentQuestion.section_id) {
      const [section] = await sql`
        SELECT s.*, 
          (SELECT COALESCE(SUM(task_count), 0) 
           FROM sections 
           WHERE subject_id = s.subject_id AND id < s.id)::int as prev_count,
          (SELECT COUNT(*) FROM questions WHERE section_id = s.id)::int as current_count
        FROM sections s
        WHERE s.id = ${sectionId}
      `

      if (!section) {
        return NextResponse.json({ message: "Bo'lim topilmadi" }, { status: 400 })
      }

      if (section.current_count >= section.task_count) {
        return NextResponse.json(
          { message: `Bu bo'limda ${section.task_count} ta savol bo'lishi mumkin` },
          { status: 400 },
        )
      }

      questionNumber = section.prev_count + section.current_count + 1
    }

    let correctOptionId: string | null = null
    if (correctAnswer && correctAnswer.match(/^[A-Z]$/i)) {
      correctOptionId = generateOptionId(Number(id), correctAnswer)
    }

    const [question] = await sql`
      UPDATE questions
      SET section_id = ${sectionId},
          question_number = ${questionNumber},
          question_type_id = ${questionTypeId},
          text = ${text},
          options = ${options ? JSON.stringify(options) : null},
          correct_answer = ${correctAnswer},
          correct_option_id = ${correctOptionId},
          image_url = ${imageUrl}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(question)
  } catch (error) {
    console.error("Update question error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [question] = await sql`SELECT section_id, question_number FROM questions WHERE id = ${id}`

    if (!question) {
      return NextResponse.json({ message: "Savol topilmadi" }, { status: 404 })
    }

    await sql`DELETE FROM questions WHERE id = ${id}`

    await sql`
      UPDATE questions 
      SET question_number = question_number - 1
      WHERE section_id = ${question.section_id} 
        AND question_number > ${question.question_number}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete question error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
