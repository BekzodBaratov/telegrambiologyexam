import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const groupId = Number.parseInt(id)

    // Delete all sub-questions first (they reference the group)
    await sql`DELETE FROM questions WHERE group_id = ${groupId}`

    // Then delete the group
    await sql`DELETE FROM question_groups WHERE id = ${groupId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete question group error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
