import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { deleteSession } from "@/lib/auth"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("admin_session")?.value

    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    cookieStore.delete("admin_session")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    // Still clear cookie even if DB delete fails
    const cookieStore = await cookies()
    cookieStore.delete("admin_session")
    return NextResponse.json({ success: true })
  }
}
