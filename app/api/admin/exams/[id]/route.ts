import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [exam] = await sql`
      SELECT 
        e.*,
        s.name as subject_name,
        COALESCE(
          (SELECT array_agg(eq.question_id ORDER BY eq.position) 
           FROM exam_questions eq 
           WHERE eq.exam_id = e.id), 
          '{}'
        ) as question_ids
      FROM exams e
      LEFT JOIN subjects s ON e.subject_id = s.id
      WHERE e.id = ${id}
    `

    if (!exam) {
      return NextResponse.json({ message: "Imtihon topilmadi" }, { status: 404 })
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error("Get exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, subjectId, testDuration, writtenDuration, isActive, questionIds } = body

    // Update exam
    const [exam] = await sql`
      UPDATE exams
      SET name = ${name}, 
          subject_id = ${subjectId}, 
          test_duration = ${testDuration}, 
          written_duration = ${writtenDuration},
          is_active = ${isActive ?? false}
      WHERE id = ${id}
      RETURNING *
    `

    // Update question links
    await sql`DELETE FROM exam_questions WHERE exam_id = ${id}`

    if (questionIds && questionIds.length > 0) {
      // Get questions ordered by their question_number
      const questions = await sql`
        SELECT id, question_number 
        FROM questions 
        WHERE id = ANY(${questionIds}::int[])
        ORDER BY question_number
      `

      for (let i = 0; i < questions.length; i++) {
        await sql`
          INSERT INTO exam_questions (exam_id, question_id, position)
          VALUES (${id}, ${questions[i].id}, ${i + 1})
        `
      }
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error("Update exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    const [exam] = await sql`
      UPDATE exams
      SET is_active = ${isActive}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(exam)
  } catch (error) {
    console.error("Toggle exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`DELETE FROM exam_questions WHERE exam_id = ${id}`
    await sql`DELETE FROM exam_sections WHERE exam_id = ${id}`
    await sql`DELETE FROM exams WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
