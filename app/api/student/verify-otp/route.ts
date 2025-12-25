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

    const otpResults = await sql`
      SELECT * FROM otp_verifications
      WHERE phone_number = ${phoneNumber}
        AND otp_code = ${otpCode}
        AND is_used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    const validOtp = Array.isArray(otpResults) && otpResults.length > 0 ? otpResults[0] : null

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

    const existingResults = await sql`
      SELECT * FROM students WHERE telegram_id = ${validTelegramId}
    `
    const existingStudent = Array.isArray(existingResults) && existingResults.length > 0 ? existingResults[0] : null

    let studentId: number

    if (existingStudent) {
      // Try to update with new columns, fallback to basic columns if migration hasn't run
      try {
        const updateResults = await sql`
          UPDATE students 
          SET full_name = ${sanitizedName},
              region = ${sanitizedRegion},
              district = ${sanitizedDistrict},
              phone_number = ${phoneNumber},
              is_verified = true
          WHERE telegram_id = ${validTelegramId}
          RETURNING id
        `
        const updated = Array.isArray(updateResults) && updateResults.length > 0 ? updateResults[0] : null
        if (!updated) {
          throw new Error("Update returned no results")
        }
        studentId = updated.id
      } catch (updateError) {
        // Fallback: only update full_name if new columns don't exist
        console.error("Full update failed, trying basic update:", updateError)
        const basicUpdateResults = await sql`
          UPDATE students 
          SET full_name = ${sanitizedName}
          WHERE telegram_id = ${validTelegramId}
          RETURNING id
        `
        const updated =
          Array.isArray(basicUpdateResults) && basicUpdateResults.length > 0 ? basicUpdateResults[0] : null
        if (!updated) {
          return NextResponse.json({ message: "Talabani yangilashda xatolik" }, { status: 500 })
        }
        studentId = updated.id
      }
    } else {
      try {
        const insertResults = await sql`
          INSERT INTO students (telegram_id, full_name, region, district, phone_number, is_verified)
          VALUES (${validTelegramId}, ${sanitizedName}, ${sanitizedRegion}, ${sanitizedDistrict}, ${phoneNumber}, true)
          RETURNING id
        `
        const newStudent = Array.isArray(insertResults) && insertResults.length > 0 ? insertResults[0] : null
        if (!newStudent) {
          throw new Error("Insert returned no results")
        }
        studentId = newStudent.id
      } catch (insertError) {
        // Fallback: insert with basic columns only
        console.error("Full insert failed, trying basic insert:", insertError)
        const basicInsertResults = await sql`
          INSERT INTO students (telegram_id, full_name)
          VALUES (${validTelegramId}, ${sanitizedName})
          RETURNING id
        `
        const newStudent =
          Array.isArray(basicInsertResults) && basicInsertResults.length > 0 ? basicInsertResults[0] : null
        if (!newStudent) {
          return NextResponse.json({ message: "Talabani yaratishda xatolik" }, { status: 500 })
        }
        studentId = newStudent.id
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
