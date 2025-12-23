import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { o2ScoreSchema } from "@/lib/validations"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 401 })
    }

    const body = await request.json()

    const validation = o2ScoreSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar" },
        { status: 400 },
      )
    }

    const { answerId, score, maxScore } = validation.data

    const [answer] = await sql`
      SELECT sa.id, q.max_score 
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      WHERE sa.id = ${answerId}
    `

    if (!answer) {
      return NextResponse.json({ message: "Javob topilmadi" }, { status: 404 })
    }

    const questionMaxScore = maxScore || answer.max_score || 25
    if (score > questionMaxScore) {
      return NextResponse.json({ message: `Ball ${questionMaxScore} dan oshmasligi kerak` }, { status: 400 })
    }

    await sql`
      UPDATE student_answers
      SET teacher_score = ${score}, updated_at = NOW()
      WHERE id = ${answerId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save O2 score error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
