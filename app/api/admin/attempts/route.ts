import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getPaginationFromRequest, createPaginatedResponse } from "@/lib/api-cache"

export async function GET(request: Request) {
  try {
    const pagination = getPaginationFromRequest(request.url)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase()
    const status = searchParams.get("status")

    // Build WHERE clause
    const conditions: string[] = []
    if (search) {
      conditions.push(
        `(LOWER(s.full_name) LIKE '%${search}%' OR s.telegram_id LIKE '%${search}%' OR sa.code_used LIKE '%${search}%')`,
      )
    }
    if (status && status !== "all") {
      conditions.push(`sa.status = '${status}'`)
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // Get total count first
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM student_attempts sa
      JOIN students s ON sa.student_id = s.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `
    const total = Number.parseInt(countResult[0]?.total || "0", 10)

    // Get paginated data with optimized query
    const offset = (pagination.page - 1) * pagination.limit

    const attempts = await sql`
      SELECT 
        sa.id,
        sa.student_id,
        sa.exam_id,
        sa.code_used,
        sa.status,
        sa.started_at,
        sa.finished_at,
        sa.final_score,
        sa.certificate_level,
        s.full_name as student_name,
        s.telegram_id,
        s.region,
        s.district,
        s.phone,
        e.name as exam_name,
        -- Simplified O2 check
        EXISTS (
          SELECT 1 FROM student_answers san
          JOIN questions q ON san.question_id = q.id
          JOIN question_types qt ON q.question_type_id = qt.id
          WHERE san.attempt_id = sa.id AND qt.code = 'O2'
        ) as has_o2,
        NOT EXISTS (
          SELECT 1 FROM student_answers san
          JOIN questions q ON san.question_id = q.id
          JOIN question_types qt ON q.question_type_id = qt.id
          WHERE san.attempt_id = sa.id AND qt.code = 'O2' AND san.teacher_score IS NULL
        ) as o2_fully_checked
      FROM student_attempts sa
      JOIN students s ON sa.student_id = s.id
      JOIN exams e ON sa.exam_id = e.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY sa.started_at DESC
      LIMIT ${pagination.limit}
      OFFSET ${offset}
    `

    return NextResponse.json(createPaginatedResponse(attempts, total, pagination))
  } catch (error) {
    console.error("Get attempts error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
