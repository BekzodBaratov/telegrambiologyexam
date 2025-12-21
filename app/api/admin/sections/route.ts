import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const sections = await sql`
      WITH section_positions AS (
        SELECT 
          s.id,
          s.title,
          s.task_count,
          s.subject_id,
          sub.name as subject_name,
          COUNT(q.id)::int as current_count,
          COALESCE(
            SUM(prev.task_count) OVER (PARTITION BY s.subject_id ORDER BY s.id) - s.task_count + 1,
            1
          )::int as start_position
        FROM sections s
        LEFT JOIN subjects sub ON s.subject_id = sub.id
        LEFT JOIN questions q ON q.section_id = s.id
        LEFT JOIN sections prev ON prev.subject_id = s.subject_id AND prev.id <= s.id
        GROUP BY s.id, s.title, s.task_count, s.subject_id, sub.name, prev.task_count
      )
      SELECT DISTINCT ON (id)
        id,
        title,
        task_count,
        subject_id,
        subject_name,
        current_count,
        start_position,
        (start_position + task_count - 1) as end_position
      FROM section_positions
      ORDER BY id
    `

    // Simplified query if the above is too complex
    const simpleSections = await sql`
      SELECT 
        s.id,
        s.title,
        s.task_count,
        s.max_questions_per_exam,
        s.subject_id,
        sub.name as subject_name,
        COUNT(q.id)::int as current_count
      FROM sections s
      LEFT JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN questions q ON q.section_id = s.id
      GROUP BY s.id, s.title, s.task_count, s.max_questions_per_exam, s.subject_id, sub.name
      ORDER BY s.id
    `

    // Calculate positions manually
    let position = 1
    let lastSubjectId: number | null = null
    const sectionsWithPositions = simpleSections.map((section) => {
      if (lastSubjectId !== section.subject_id) {
        position = 1
        lastSubjectId = section.subject_id
      }
      const start = position
      const end = position + section.task_count - 1
      position = end + 1
      return {
        ...section,
        start_position: start,
        end_position: end,
      }
    })

    return NextResponse.json(sectionsWithPositions)
  } catch (error) {
    console.error("Get sections error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, taskCount, maxQuestionsPerExam, subjectId } = body

    const [section] = await sql`
      INSERT INTO sections (title, task_count, max_questions_per_exam, subject_id)
      VALUES (${title}, ${taskCount}, ${maxQuestionsPerExam || taskCount}, ${subjectId})
      RETURNING *
    `

    return NextResponse.json(section)
  } catch (error) {
    console.error("Create section error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
