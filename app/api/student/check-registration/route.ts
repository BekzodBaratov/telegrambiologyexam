import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { telegramId, code } = await request.json()

    if (!telegramId) {
      return NextResponse.json({ message: "Telegram ID topilmadi" }, { status: 400 })
    }

    let student = null
    try {
      const results = await sql`
        SELECT id, full_name FROM students 
        WHERE telegram_id = ${telegramId}
      `
      if (results && Array.isArray(results) && results.length > 0) {
        student = results[0]
      }
    } catch (queryError) {
      console.error("Check student error:", queryError)
      return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
    }

    if (student) {
      // Check if student already took this test
      if (code) {
        let existingAttempt = null
        try {
          const attemptResults = await sql`
            SELECT id FROM student_attempts
            WHERE student_id = ${student.id} AND code_used = ${code}
          `
          if (attemptResults && Array.isArray(attemptResults) && attemptResults.length > 0) {
            existingAttempt = attemptResults[0]
          }
        } catch (attemptError) {
          console.error("Check attempt error:", attemptError)
        }

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
