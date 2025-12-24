import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { checkRateLimit, generateSecureOTP, sanitizeInput } from "@/lib/security"
import { z } from "zod"

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+998\d{9}$/, "Noto'g'ri telefon raqam formati"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const validation = phoneSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Noto'g'ri telefon raqam formati" },
        { status: 400 },
      )
    }

    const { phoneNumber } = validation.data
    const sanitizedPhone = sanitizeInput(phoneNumber)

    const rateLimit = checkRateLimit(`otp:${sanitizedPhone}`, 3, 300)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: "Juda ko'p urinish. Iltimos, 5 daqiqadan so'ng qayta urinib ko'ring.",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 },
      )
    }

    const otpCode = generateSecureOTP(6)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Invalidate previous OTPs for this phone
    await sql`
      UPDATE otp_verifications 
      SET is_used = true 
      WHERE phone_number = ${sanitizedPhone} AND is_used = false
    `

    // Store OTP in database
    await sql`
      INSERT INTO otp_verifications (phone_number, otp_code, expires_at)
      VALUES (${sanitizedPhone}, ${otpCode}, ${expiresAt})
    `

    // In production, integrate with SMS provider (e.g., Eskiz, PlayMobile)
    console.log(`[OTP] Phone: ${sanitizedPhone}, Code: ${otpCode}`)

    // TODO: Send SMS via provider
    // await sendSMS(sanitizedPhone, `Sizning tasdiqlash kodingiz: ${otpCode}`)

    return NextResponse.json({
      success: true,
      message: "SMS yuborildi",
      debugOtp: otpCode,
      // Only expose OTP in development
      // ...(process.env.NODE_ENV === "development" && { debugOtp: otpCode }),
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json({ message: "SMS yuborishda xatolik" }, { status: 500 })
  }
}
