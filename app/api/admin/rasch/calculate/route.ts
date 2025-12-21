import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Only using percentage-based calculation as per requirements

function calculateRaschBall(correctPercent: number): number {
  // Strict percentage-to-Rasch-ball mapping
  if (correctPercent > 85) return -4
  if (correctPercent >= 75) return -3
  if (correctPercent >= 65) return -2
  if (correctPercent >= 55) return -1
  if (correctPercent >= 45) return 0
  if (correctPercent >= 35) return 1
  if (correctPercent >= 25) return 2
  if (correctPercent >= 15) return 3
  return 4
}

export async function POST(request: Request) {
  try {
    const { examId } = await request.json()

    if (!examId) {
      return NextResponse.json({ message: "Exam ID is required" }, { status: 400 })
    }

    // Using subquery to ensure correct filtering by exam_id through student_attempts
    const questions = await sql`
      WITH exam_answers AS (
        SELECT 
          sa.question_id,
          sa.is_correct
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        WHERE att.exam_id = ${examId}
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
        message: "No eligible questions found for this exam",
        results: [],
      })
    }

    const results = []
    let processedCount = 0
    let skippedCount = 0

    const BATCH_SIZE = 20
    const batches = []

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE))
    }

    for (const batch of batches) {
      const updatePromises = []

      for (const q of batch) {
        const totalAttempts = Number(q.total_attempts) || 0
        const correctAttempts = Number(q.correct_attempts) || 0

        // Skip questions with no attempts (safe division)
        if (totalAttempts === 0) {
          skippedCount++
          continue
        }

        // Calculate percentage and Rasch ball
        const correctPercent = (correctAttempts / totalAttempts) * 100
        const raschBall = calculateRaschBall(correctPercent)

        // Queue update for batch execution
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
          questionText: q.text?.substring(0, 50) + (q.text?.length > 50 ? "..." : ""),
          totalAttempts,
          correctAttempts,
          correctPercent: Math.round(correctPercent * 100) / 100,
          raschBall,
        })

        processedCount++
      }

      // Execute batch updates in parallel
      await Promise.all(updatePromises)
    }

    // Sort by question number
    results.sort((a, b) => a.questionNumber - b.questionNumber)

    return NextResponse.json({
      message: `Rasch hisoblandi: ${processedCount} ta savol qayta ishlandi, ${skippedCount} ta o'tkazib yuborildi`,
      processedCount,
      skippedCount,
      results,
    })
  } catch (error) {
    console.error("Rasch calculation error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
