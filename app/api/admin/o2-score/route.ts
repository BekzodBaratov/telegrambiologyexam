import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { answerId, score } = await request.json()

    if (!answerId || score === undefined) {
      return NextResponse.json({ message: "Answer ID and score are required" }, { status: 400 })
    }

    await sql`
      UPDATE student_answers
      SET teacher_score = ${score}, updated_at = NOW()
      WHERE id = ${answerId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save O2 score error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
