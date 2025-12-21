import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const subjects = await sql`SELECT * FROM subjects ORDER BY id`
    return NextResponse.json(subjects)
  } catch (error) {
    console.error("Get subjects error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    const [subject] = await sql`
      INSERT INTO subjects (name)
      VALUES (${name})
      RETURNING *
    `

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Create subject error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
