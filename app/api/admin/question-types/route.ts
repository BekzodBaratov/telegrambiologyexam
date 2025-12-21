import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const types = await sql`SELECT * FROM question_types ORDER BY id`
    return NextResponse.json(types)
  } catch (error) {
    console.error("Get question types error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
