import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber || !/^\+998\d{9}$/.test(phoneNumber)) {
      return NextResponse.json({ message: "Noto'g'ri telefon raqam formati" }, { status: 400 })
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Invalidate previous OTPs for this phone
    await sql`
      UPDATE otp_verifications 
      SET is_used = true 
      WHERE phone_number = ${phoneNumber} AND is_used = false
    `

    // Store OTP in database
    await sql`
      INSERT INTO otp_verifications (phone_number, otp_code, expires_at)
      VALUES (${phoneNumber}, ${otpCode}, ${expiresAt})
    `

    // In production, integrate with SMS provider (e.g., Eskiz, PlayMobile)
    // For now, we'll log the OTP for testing
    console.log(`[OTP] Phone: ${phoneNumber}, Code: ${otpCode}`)

    // TODO: Send SMS via provider
    // await sendSMS(phoneNumber, `Sizning tasdiqlash kodingiz: ${otpCode}`)

    return NextResponse.json({
      success: true,
      message: "SMS yuborildi",
      // Remove this in production - only for testing
      ...(process.env.NODE_ENV === "development" && { debugOtp: otpCode }),
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ message: "SMS yuborishda xatolik" }, { status: 500 })
  }
}
