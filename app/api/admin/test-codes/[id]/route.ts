import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await sql`DELETE FROM test_codes WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete test code error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { maxAttempts, validFrom, validTo } = await request.json()

    const [testCode] = await sql`
      UPDATE test_codes 
      SET 
        max_attempts = ${maxAttempts},
        valid_from = ${validFrom || null},
        valid_to = ${validTo || null}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(testCode)
  } catch (error) {
    console.error("Update test code error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { isActive } = await request.json()

    const [testCode] = await sql`
      UPDATE test_codes 
      SET is_active = ${isActive}
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(testCode)
  } catch (error) {
    console.error("Toggle test code error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
