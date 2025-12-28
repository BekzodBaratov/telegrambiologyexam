import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { o2ScoreSchema } from "@/lib/validations"
import { getCurrentUser } from "@/lib/auth"

function getCertificateLevel(percentage: number): "C" | "C+" | "B" | "B+" | "A" | "A+" | null {
  if (percentage >= 70.0) return "A+"
  if (percentage >= 65.0) return "A"
  if (percentage >= 60.0) return "B+"
  if (percentage >= 55.0) return "B"
  if (percentage >= 50.0) return "C+"
  if (percentage >= 46.0) return "C"
  return null // No certificate for percentage < 46
}

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

    const { answerId, score } = validation.data

    const answerResult = await sql`
      SELECT sa.id, sa.attempt_id,
             att.status, att.part1_score, att.final_score
      FROM student_answers sa
      JOIN student_attempts att ON sa.attempt_id = att.id
      WHERE sa.id = ${answerId}
    `

    if (!Array.isArray(answerResult) || answerResult.length === 0) {
      return NextResponse.json({ message: "Javob topilmadi" }, { status: 404 })
    }

    const answer = answerResult[0]
    const attemptId = answer.attempt_id

    // If final_score is NOT NULL, the attempt is finalized and cannot be modified
    if (answer.final_score !== null) {
      return NextResponse.json(
        { message: "Bu urinish natijalari allaqachon tasdiqlangan va o'zgartirib bo'lmaydi" },
        { status: 403 },
      )
    }

    // Save the teacher score (0-100 scale)
    await sql`
      UPDATE student_answers
      SET teacher_score = ${score}, updated_at = NOW()
      WHERE id = ${answerId}
    `

    const o2AnswersResult = await sql`
      SELECT sa.teacher_score
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE sa.attempt_id = ${attemptId}
        AND qt.code = 'O2'
    `

    const o2Answers = Array.isArray(o2AnswersResult) ? o2AnswersResult : []

    // teacher_score = 0 is valid (treated as graded), only NULL means "not graded"
    const allO2Graded = o2Answers.length > 0 && o2Answers.every((a) => a.teacher_score !== null)

    let finalCalculated = false
    let certificateLevel: string | null = null
    let part2Score: number | null = null

    if (allO2Graded) {
      // Calculate part2_score as average of all O2 scores
      const totalO2Score = o2Answers.reduce((sum, a) => sum + (Number(a.teacher_score) || 0), 0)
      part2Score = o2Answers.length > 0 ? totalO2Score / o2Answers.length : 0

      const attemptStatus = answer.status
      const part1Score = answer.part1_score

      // 1. allO2Graded === true (already checked above)
      // 2. part1_score IS NOT NULL
      // 3. status === 'completed'
      if (attemptStatus === "completed" && part1Score !== null) {
        const finalScore = (Number(part1Score) + part2Score) / 2
        const percentage = finalScore // percentage equals final_score per spec
        certificateLevel = getCertificateLevel(percentage)

        await sql`
          UPDATE student_attempts
          SET 
            part2_score = ${part2Score},
            final_score = ${finalScore},
            percentage = ${percentage},
            certificate_level = ${certificateLevel},
            updated_at = NOW()
          WHERE id = ${attemptId}
        `
        finalCalculated = true
      } else {
        // Only update part2_score if preconditions not fully met
        await sql`
          UPDATE student_attempts
          SET part2_score = ${part2Score}, updated_at = NOW()
          WHERE id = ${attemptId}
        `
      }
    }

    return NextResponse.json({
      success: true,
      allO2Graded,
      o2Count: o2Answers.length,
      finalCalculated,
      certificateLevel,
      part2Score,
    })
  } catch (error) {
    console.error("Save O2 score error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
