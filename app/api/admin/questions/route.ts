import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")

    let questions
    if (subjectId) {
      questions = await sql`
        SELECT q.*, qt.code as question_type_code, s.title as section_title, s.subject_id
        FROM questions q
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN sections s ON q.section_id = s.id
        WHERE s.subject_id = ${subjectId}
        ORDER BY q.question_number
      `
    } else {
      questions = await sql`
        SELECT q.*, qt.code as question_type_code, s.title as section_title
        FROM questions q
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN sections s ON q.section_id = s.id
        ORDER BY q.question_number
      `
    }

    return NextResponse.json(questions)
  } catch (error) {
    console.error("Get questions error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sectionId, questionTypeId, text, options, correctAnswer, imageUrl } = body

    // Get section info and calculate next position
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

    // Check if section is full
    if (section.current_count >= section.task_count) {
      return NextResponse.json(
        {
          message: `Bu bo'limda ${section.task_count} ta savol bo'lishi mumkin. Hozirda ${section.current_count} ta savol mavjud.`,
        },
        { status: 400 },
      )
    }

    // Calculate question number: prev sections total + current position in section
    const questionNumber = section.prev_count + section.current_count + 1

    const [question] = await sql`
      INSERT INTO questions (section_id, question_number, question_type_id, text, options, correct_answer, image_url)
      VALUES (${sectionId}, ${questionNumber}, ${questionTypeId}, ${text}, ${options ? JSON.stringify(options) : null}, ${correctAnswer}, ${imageUrl})
      RETURNING *
    `

    return NextResponse.json(question)
  } catch (error) {
    console.error("Create question error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
