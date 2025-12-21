import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")

    if (examId) {
      const codes = await sql`
        SELECT DISTINCT tc.code
        FROM test_codes tc
        WHERE tc.exam_id = ${examId}
        ORDER BY tc.code
      `
      return NextResponse.json(codes)
    }

    const codes = await sql`
      SELECT 
        tc.*, 
        e.name as exam_name,
        NOW() as server_time
      FROM test_codes tc
      JOIN exams e ON tc.exam_id = e.id
      ORDER BY tc.created_at DESC
    `
    return NextResponse.json(codes)
  } catch (error) {
    console.error("Get test codes error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { code, examId, maxAttempts, validFrom, validTo } = await request.json()

    // Check if code already exists
    const [existing] = await sql`SELECT id FROM test_codes WHERE code = ${code}`
    if (existing) {
      return NextResponse.json({ message: "Bu kod allaqachon mavjud" }, { status: 400 })
    }

    const [testCode] = await sql`
      INSERT INTO test_codes (code, exam_id, max_attempts, valid_from, valid_to)
      VALUES (${code}, ${examId}, ${maxAttempts}, ${validFrom || null}, ${validTo || null})
      RETURNING *
    `

    return NextResponse.json(testCode)
  } catch (error) {
    console.error("Create test code error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
