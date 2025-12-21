import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, taskCount, maxQuestionsPerExam, subjectId } = body

    const [section] = await sql`
      UPDATE sections
      SET title = ${title}, 
          task_count = ${taskCount}, 
          max_questions_per_exam = ${maxQuestionsPerExam || taskCount},
          subject_id = ${subjectId}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(section)
  } catch (error) {
    console.error("Update section error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await sql`DELETE FROM sections WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete section error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
