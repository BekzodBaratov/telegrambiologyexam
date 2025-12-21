import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { studentId, fullName } = await request.json()

    if (!studentId || !fullName) {
      return NextResponse.json({ message: "Student ID and full name are required" }, { status: 400 })
    }

    await sql`
      UPDATE students SET full_name = ${fullName} WHERE id = ${studentId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save name error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
