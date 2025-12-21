import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const attempts = await sql`
      SELECT sa.*, s.full_name as student_name, e.name as exam_name
      FROM student_attempts sa
      JOIN students s ON sa.student_id = s.id
      JOIN exams e ON sa.exam_id = e.id
      ORDER BY sa.started_at DESC
    `
    return NextResponse.json(attempts)
  } catch (error) {
    console.error("Get attempts error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
