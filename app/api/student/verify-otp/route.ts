import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { registrationSchema } from "@/lib/validations"
import { checkRateLimit, sanitizeInput, validateTelegramId } from "@/lib/security"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const validation = registrationSchema.safeParse({
      ...body,
      telegramId: String(body.telegramId),
    })

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar" },
        { status: 400 },
      )
    }

    const { telegramId, phoneNumber, fullName, region, district } = validation.data
    const otpCode = body.otpCode

    const validTelegramId = validateTelegramId(telegramId)
    if (!validTelegramId) {
      return NextResponse.json({ message: "Noto'g'ri Telegram ID" }, { status: 400 })
    }

    const rateLimit = checkRateLimit(`verify:${phoneNumber}`, 5, 900)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Juda ko'p urinish. Iltimos, keyinroq qayta urinib ko'ring." },
        { status: 429 },
      )
    }

    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ message: "OTP kod 6 raqamdan iborat bo'lishi kerak" }, { status: 400 })
    }

    // Verify OTP - uses parameterized query (safe from SQL injection)
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

    const sanitizedName = sanitizeInput(fullName)
    const sanitizedRegion = sanitizeInput(region)
    const sanitizedDistrict = sanitizeInput(district)

    // Check if student already exists
    const [existingStudent] = await sql`
      SELECT * FROM students WHERE telegram_id = ${validTelegramId}
    `

    let studentId: number

    if (existingStudent) {
      // Update existing student
      const [updated] = await sql`
        UPDATE students 
        SET full_name = ${sanitizedName},
            region = ${sanitizedRegion},
            district = ${sanitizedDistrict},
            phone_number = ${phoneNumber},
            is_verified = true
        WHERE telegram_id = ${validTelegramId}
        RETURNING id
      `
      studentId = updated.id
    } else {
      // Create new student
      const [newStudent] = await sql`
        INSERT INTO students (telegram_id, full_name, region, district, phone_number, is_verified)
        VALUES (${validTelegramId}, ${sanitizedName}, ${sanitizedRegion}, ${sanitizedDistrict}, ${phoneNumber}, true)
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
