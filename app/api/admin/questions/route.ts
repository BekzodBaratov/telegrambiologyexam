import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getPaginationFromRequest, createPaginatedResponse } from "@/lib/api-cache"
import { generateOptionId } from "@/lib/option-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")
    const typeCode = searchParams.get("type")
    const sectionId = searchParams.get("sectionId")
    const paginated = searchParams.get("paginated") === "true"

    // Build conditions
    const conditions: string[] = []
    if (subjectId) conditions.push(`s.subject_id = ${subjectId}`)
    if (typeCode && typeCode !== "all") conditions.push(`qt.code = '${typeCode}'`)
    if (sectionId && sectionId !== "all") conditions.push(`q.section_id = ${sectionId}`)

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    if (paginated) {
      const pagination = getPaginationFromRequest(request.url)

      // Get total count
      const countResult = await sql`
        SELECT COUNT(*) as total
        FROM questions q
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN sections s ON q.section_id = s.id
        ${whereClause ? sql.unsafe(whereClause) : sql``}
      `
      const total = Number.parseInt(countResult[0]?.total || "0", 10)

      const offset = (pagination.page - 1) * pagination.limit
      const questions = await sql`
        SELECT q.*, qt.code as question_type_code, s.title as section_title
        FROM questions q
        LEFT JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN sections s ON q.section_id = s.id
        ${whereClause ? sql.unsafe(whereClause) : sql``}
        ORDER BY q.question_number
        LIMIT ${pagination.limit}
        OFFSET ${offset}
      `

      return NextResponse.json(createPaginatedResponse(questions, total, pagination))
    }

    // Non-paginated (for backward compatibility)
    const questions = await sql`
      SELECT q.*, qt.code as question_type_code, s.title as section_title
      FROM questions q
      LEFT JOIN question_types qt ON q.question_type_id = qt.id
      LEFT JOIN sections s ON q.section_id = s.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY q.question_number
    `

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

    if (question && correctAnswer && correctAnswer.match(/^[A-Z]$/i)) {
      const correctOptionId = generateOptionId(question.id, correctAnswer)
      await sql`
        UPDATE questions 
        SET correct_option_id = ${correctOptionId}
        WHERE id = ${question.id}
      `
      question.correct_option_id = correctOptionId
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error("Create question error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
