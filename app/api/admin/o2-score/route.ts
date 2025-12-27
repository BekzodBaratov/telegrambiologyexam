import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { o2ScoreSchema } from "@/lib/validations"
import { getCurrentUser } from "@/lib/auth"

function getCertificateLevel(percentage: number): "C" | "B" | "B+" | "A" | "A+" | null {
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
      SELECT sa.id, sa.attempt_id, q.max_score,
             att.status, att.part1_score, att.certificate_level
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN student_attempts att ON sa.attempt_id = att.id
      WHERE sa.id = ${answerId}
    `

    if (!Array.isArray(answerResult) || answerResult.length === 0) {
      return NextResponse.json({ message: "Javob topilmadi" }, { status: 404 })
    }

    const answer = answerResult[0]
    const attemptId = answer.attempt_id
    const questionMaxScore = answer.max_score || 25

    if (answer.certificate_level !== null) {
      return NextResponse.json(
        { message: "Bu urinish natijalari allaqachon tasdiqlangan va o'zgartirib bo'lmaydi" },
        { status: 403 },
      )
    }

    if (score > questionMaxScore) {
      return NextResponse.json({ message: `Ball ${questionMaxScore} dan oshmasligi kerak` }, { status: 400 })
    }

    // Save the teacher score
    await sql`
      UPDATE student_answers
      SET teacher_score = ${score}, updated_at = NOW()
      WHERE id = ${answerId}
    `

    // Get all O2 answers for this attempt
    const o2AnswersResult = await sql`
      SELECT sa.teacher_score, q.max_score
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      WHERE sa.attempt_id = ${attemptId}
        AND qt.code = 'O2'
    `

    const o2Answers = Array.isArray(o2AnswersResult) ? o2AnswersResult : []

    // Check if all O2 questions have been graded
    const allGraded = o2Answers.every((a) => a.teacher_score !== null)

    let finalCalculated = false
    let certificateLevel: string | null = null

    if (allGraded && o2Answers.length > 0) {
      // Calculate total O2 score (sum of teacher_score)
      const totalO2Score = o2Answers.reduce((sum, a) => sum + (Number(a.teacher_score) || 0), 0)
      // Calculate max possible O2 score
      const maxO2Score = o2Answers.reduce((sum, a) => sum + (Number(a.max_score) || 25), 0)
      // Calculate part2_score as percentage (0-100 scale)
      const part2Score = maxO2Score > 0 ? (totalO2Score / maxO2Score) * 100 : 0

      const attemptStatus = answer.status
      const part1Score = answer.part1_score

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
        // Only update part2_score if preconditions not met
        await sql`
          UPDATE student_attempts
          SET part2_score = ${part2Score}, updated_at = NOW()
          WHERE id = ${attemptId}
        `
      }
    }

    return NextResponse.json({
      success: true,
      allO2Graded: allGraded,
      o2Count: o2Answers.length,
      finalCalculated,
      certificateLevel,
    })
  } catch (error) {
    console.error("Save O2 score error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
