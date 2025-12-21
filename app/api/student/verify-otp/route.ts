import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { telegramId, phoneNumber, otpCode, fullName, region, district } = await request.json()

    if (!telegramId || !phoneNumber || !otpCode || !fullName || !region || !district) {
      return NextResponse.json({ message: "Barcha maydonlar to'ldirilishi shart" }, { status: 400 })
    }

    // Verify OTP
    const [validOtp] = await sql`
      SELECT * FROM otp_verifications
      WHERE phone_number = ${phoneNumber}
        AND otp_code = ${otpCode}
        AND is_used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!validOtp) {
      return NextResponse.json({ message: "Noto'g'ri yoki muddati o'tgan kod" }, { status: 400 })
    }

    // Mark OTP as used
    await sql`
      UPDATE otp_verifications SET is_used = true WHERE id = ${validOtp.id}
    `

    // Check if student already exists
    const [existingStudent] = await sql`
      SELECT * FROM students WHERE telegram_id = ${telegramId}
    `

    let studentId: number

    if (existingStudent) {
      // Update existing student
      const [updated] = await sql`
        UPDATE students 
        SET full_name = ${fullName},
            region = ${region},
            district = ${district},
            phone_number = ${phoneNumber},
            is_verified = true
        WHERE telegram_id = ${telegramId}
        RETURNING id
      `
      studentId = updated.id
    } else {
      // Create new student
      const [newStudent] = await sql`
        INSERT INTO students (telegram_id, full_name, region, district, phone_number, is_verified)
        VALUES (${telegramId}, ${fullName}, ${region}, ${district}, ${phoneNumber}, true)
        RETURNING id
      `
      studentId = newStudent.id
    }

    return NextResponse.json({
      success: true,
      studentId,
      message: "Ro'yxatdan o'tish muvaffaqiyatli",
    })
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json({ message: "Tasdiqlashda xatolik" }, { status: 500 })
  }
}
