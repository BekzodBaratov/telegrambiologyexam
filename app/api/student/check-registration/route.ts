import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { telegramId, code } = await request.json()

    if (!telegramId) {
      return NextResponse.json({ message: "Telegram ID topilmadi" }, { status: 400 })
    }

    // Check if student exists and is verified
    const [student] = await sql`
      SELECT * FROM students 
      WHERE telegram_id = ${telegramId}
    `

    if (student && student.is_verified) {
      // Check if student already took this test
      if (code) {
        const [existingAttempt] = await sql`
          SELECT sa.* FROM student_attempts sa
          WHERE sa.student_id = ${student.id} AND sa.code_used = ${code}
        `

        if (existingAttempt) {
          return NextResponse.json({
            registered: true,
            verified: true,
            studentId: student.id,
            alreadyTaken: true,
            message: "Siz bu testni allaqachon topshirgansiz",
          })
        }
      }

      return NextResponse.json({
        registered: true,
        verified: true,
        studentId: student.id,
        fullName: student.full_name,
      })
    }

    return NextResponse.json({
      registered: false,
      verified: false,
    })
  } catch (error) {
    console.error("Check registration error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
