import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { registrationSchema } from "@/lib/validations"
import { checkRateLimit, sanitizeInput, validateTelegramId } from "@/lib/security"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] verify-otp body:", JSON.stringify(body))

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
    console.log("[v0] Parsed data:", { telegramId, phoneNumber, fullName, region, district, otpCode })

    const validTelegramId = validateTelegramId(telegramId)
    if (!validTelegramId) {
      return NextResponse.json({ message: "Noto'g'ri Telegram ID" }, { status: 400 })
    }
    console.log("[v0] validTelegramId:", validTelegramId)

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

    let validOtp = null
    try {
      const otpResults = await sql`
        SELECT * FROM otp_verifications
        WHERE phone_number = ${phoneNumber}
          AND otp_code = ${otpCode}
          AND is_used = false
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (otpResults && Array.isArray(otpResults) && otpResults.length > 0) {
        validOtp = otpResults[0]
      }
    } catch (otpError) {
      console.error("OTP query error:", otpError)
      return NextResponse.json({ message: "Tasdiqlashda xatolik" }, { status: 500 })
    }

    if (!validOtp) {
      return NextResponse.json({ message: "Noto'g'ri yoki muddati o'tgan kod" }, { status: 400 })
    }

    // Mark OTP as used
    try {
      await sql`UPDATE otp_verifications SET is_used = true WHERE id = ${validOtp.id}`
    } catch (markError) {
      console.error("Failed to mark OTP as used:", markError)
    }

    const sanitizedName = sanitizeInput(fullName)

    let existingStudent = null
    try {
      const existingResults = await sql`
        SELECT id, full_name FROM students WHERE telegram_id = ${validTelegramId}
      `
      if (existingResults && Array.isArray(existingResults) && existingResults.length > 0) {
        existingStudent = existingResults[0]
      }
    } catch (checkError) {
      console.error("Check existing student error:", checkError)
    }

    let studentId: number

    if (existingStudent) {
      try {
        const updateResults = await sql`
          UPDATE students 
          SET full_name = ${sanitizedName}
          WHERE telegram_id = ${validTelegramId}
          RETURNING id
        `
        if (updateResults && Array.isArray(updateResults) && updateResults.length > 0) {
          studentId = updateResults[0].id
        } else {
          studentId = existingStudent.id
        }
      } catch (updateError) {
        console.error("Update student error:", updateError)
        studentId = existingStudent.id
      }
    } else {
      try {
        const insertResults = await sql`
          INSERT INTO students (telegram_id, full_name)
          VALUES (${validTelegramId}, ${sanitizedName})
          RETURNING id
        `
        if (insertResults && Array.isArray(insertResults) && insertResults.length > 0) {
          studentId = insertResults[0].id
        } else {
          return NextResponse.json({ message: "Talabani yaratishda xatolik" }, { status: 500 })
        }
      } catch (insertError) {
        console.error("Insert student error:", insertError)
        return NextResponse.json({ message: "Talabani yaratishda xatolik" }, { status: 500 })
      }
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
