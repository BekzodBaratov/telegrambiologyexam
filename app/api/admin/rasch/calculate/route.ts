import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const MIN_ATTEMPTS_FOR_RASCH = 1

// correct_percent > 85 → -4
// 85 ≥ correct_percent > 75 → -3
// 75 ≥ correct_percent > 65 → -2
// 65 ≥ correct_percent > 55 → -1
// 55 ≥ correct_percent > 45 → 0
// 45 ≥ correct_percent > 35 → 1
// 35 ≥ correct_percent > 25 → 2
// 25 ≥ correct_percent > 15 → 3
// correct_percent ≤ 15 → 4
function calculateRaschBall(correctPercent: number): number {
  if (correctPercent > 85) return -4
  if (correctPercent > 75) return -3
  if (correctPercent > 65) return -2
  if (correctPercent > 55) return -1
  if (correctPercent > 45) return 0
  if (correctPercent > 35) return 1
  if (correctPercent > 25) return 2
  if (correctPercent > 15) return 3
  return 4
}

const requestSchema = z.object({
  examId: z.number().int().positive("Noto'g'ri exam ID"),
})

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 401 })
    }

    const body = await request.json()

    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Exam ID kiritilishi shart" },
        { status: 400 },
      )
    }

    const { examId } = validation.data

    const questions = await sql`
      WITH exam_answers AS (
        SELECT 
          sa.question_id,
          sa.is_correct
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        WHERE att.exam_id = ${examId}
          AND att.status = 'completed'
      )
      SELECT 
        q.id,
        q.question_number,
        q.text,
        qt.code as question_type,
        COALESCE(COUNT(ea.question_id), 0)::int as total_attempts,
        COALESCE(COUNT(CASE WHEN ea.is_correct = true THEN 1 END), 0)::int as correct_attempts
      FROM questions q
      JOIN exam_questions eq ON q.id = eq.question_id
      JOIN question_types qt ON q.question_type_id = qt.id
      LEFT JOIN exam_answers ea ON q.id = ea.question_id
      WHERE eq.exam_id = ${examId} 
        AND qt.code IN ('Y1', 'Y2', 'O1')
      GROUP BY q.id, q.question_number, q.text, qt.code
      ORDER BY q.question_number
    `

    if (questions.length === 0) {
      return NextResponse.json({
        message: "Bu imtihon uchun savollar topilmadi",
        results: [],
        processedCount: 0,
        skippedCount: 0,
        executionTimeMs: Date.now() - startTime,
      })
    }

    const results = []
    let processedCount = 0
    let skippedCount = 0

    const BATCH_SIZE = 50
    const batches = []

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE))
    }

    for (const batch of batches) {
      const updatePromises = []

      for (const q of batch) {
        const totalAttempts = Number(q.total_attempts) || 0
        const correctAttempts = Number(q.correct_attempts) || 0

        if (totalAttempts < MIN_ATTEMPTS_FOR_RASCH) {
          skippedCount++
          results.push({
            questionId: q.id,
            questionNumber: q.question_number,
            questionType: q.question_type,
            questionText: q.text?.substring(0, 80) + (q.text?.length > 80 ? "..." : ""),
            totalAttempts,
            correctAttempts,
            correctPercent: null,
            raschBall: null,
            status: "skipped",
          })
          continue
        }

        const correctPercent = (correctAttempts / totalAttempts) * 100
        const raschBall = calculateRaschBall(correctPercent)

        updatePromises.push(
          sql`
            UPDATE questions
            SET 
              total_attempts = ${totalAttempts},
              correct_attempts = ${correctAttempts},
              correct_percent = ${correctPercent},
              rasch_ball = ${raschBall},
              rasch_updated_at = NOW()
            WHERE id = ${q.id}
          `,
        )

        results.push({
          questionId: q.id,
          questionNumber: q.question_number,
          questionType: q.question_type,
          questionText: q.text?.substring(0, 80) + (q.text?.length > 80 ? "..." : ""),
          totalAttempts,
          correctAttempts,
          correctPercent: Math.round(correctPercent * 100) / 100,
          raschBall,
          status: "calculated",
        })

        processedCount++
      }

      // Execute batch updates
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
      }
    }

    results.sort((a, b) => a.questionNumber - b.questionNumber)

    const executionTimeMs = Date.now() - startTime

    console.log(
      `[Rasch] Calculation completed: ${processedCount} processed, ${skippedCount} skipped, ${executionTimeMs}ms`,
    )

    return NextResponse.json({
      message: `Rasch hisoblandi: ${processedCount} ta savol qayta ishlandi, ${skippedCount} ta o'tkazib yuborildi`,
      processedCount,
      skippedCount,
      totalQuestions: questions.length,
      executionTimeMs,
      results,
    })
  } catch (error) {
    console.error("[Rasch] Calculation error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
