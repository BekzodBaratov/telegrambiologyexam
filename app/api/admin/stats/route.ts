import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const [studentsCount] = await sql`SELECT COUNT(*) as count FROM students`
    const [attemptsCount] = await sql`SELECT COUNT(*) as count FROM student_attempts`
    const [completedCount] = await sql`SELECT COUNT(*) as count FROM student_attempts WHERE status = 'completed'`
    const [inProgressCount] = await sql`SELECT COUNT(*) as count FROM student_attempts WHERE status = 'in_progress'`

    const questionsByType = await sql`
      SELECT qt.code, COUNT(q.id) as count
      FROM question_types qt
      LEFT JOIN questions q ON q.question_type_id = qt.id
      GROUP BY qt.code
    `

    const typeMap: Record<string, number> = {}
    questionsByType.forEach((row) => {
      typeMap[row.code] = Number.parseInt(row.count)
    })

    return NextResponse.json({
      totalStudents: Number.parseInt(studentsCount.count),
      totalAttempts: Number.parseInt(attemptsCount.count),
      completedAttempts: Number.parseInt(completedCount.count),
      inProgressAttempts: Number.parseInt(inProgressCount.count),
      questionsByType: typeMap,
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
