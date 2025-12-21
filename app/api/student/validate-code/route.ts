import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ message: "Kod kiritilishi shart" }, { status: 400 })
    }

    const [testCode] = await sql`
      SELECT tc.*, e.name as exam_name 
      FROM test_codes tc
      JOIN exams e ON tc.exam_id = e.id
      WHERE tc.code = ${code} 
        AND tc.is_active = true
        AND (tc.valid_from IS NULL OR tc.valid_from <= NOW())
        AND (tc.valid_to IS NULL OR tc.valid_to >= NOW())
    `

    if (!testCode) {
      // Check if code exists but is inactive or outside time window
      const [existingCode] = await sql`
        SELECT tc.*, 
          CASE 
            WHEN tc.is_active = false THEN 'inactive'
            WHEN tc.valid_from IS NOT NULL AND tc.valid_from > NOW() THEN 'not_started'
            WHEN tc.valid_to IS NOT NULL AND tc.valid_to < NOW() THEN 'expired'
            ELSE 'invalid'
          END as status_reason
        FROM test_codes tc
        WHERE tc.code = ${code}
      `

      if (existingCode) {
        if (existingCode.status_reason === "inactive") {
          return NextResponse.json({ message: "Bu kod faol emas" }, { status: 400 })
        }
        if (existingCode.status_reason === "not_started") {
          return NextResponse.json({ message: "Imtihon hali boshlanmagan" }, { status: 400 })
        }
        if (existingCode.status_reason === "expired") {
          return NextResponse.json({ message: "Imtihon vaqti tugagan" }, { status: 400 })
        }
      }

      return NextResponse.json({ message: "Noto'g'ri kod" }, { status: 400 })
    }

    if (testCode.used_count >= testCode.max_attempts) {
      return NextResponse.json({ message: "Bu kod uchun maksimal foydalanish soni tugagan" }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      examId: testCode.exam_id,
      examName: testCode.exam_name,
    })
  } catch (error) {
    console.error("Validate code error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
