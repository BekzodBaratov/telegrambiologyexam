import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendTelegramMessage, buildResultMessage } from "@/lib/telegram-bot"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { examId } = await request.json()

    if (!examId) {
      return NextResponse.json({ error: "exam_id is required" }, { status: 400 })
    }

    // Fetch exam name
    const examResult = await sql`
      SELECT name FROM exams WHERE id = ${examId}
    `
    if (!examResult || examResult.length === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    }
    const examName = examResult[0].name

    // Fetch all ELIGIBLE attempts for this exam
    // Eligible: status='completed', final_score NOT NULL, certificate_level NOT NULL
    const eligibleAttempts = await sql`
      SELECT 
        sa.id,
        sa.student_id,
        sa.final_score,
        sa.percentage,
        sa.certificate_level,
        sa.results_sent_at,
        s.full_name,
        s.telegram_id
      FROM student_attempts sa
      JOIN students s ON sa.student_id = s.id
      WHERE sa.exam_id = ${examId}
        AND sa.status = 'completed'
        AND sa.final_score IS NOT NULL
        AND sa.certificate_level IS NOT NULL
    `

    if (!eligibleAttempts || eligibleAttempts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No eligible attempts found",
        sent_count: 0,
        skipped_count: 0,
        failed_count: 0,
      })
    }

    let sentCount = 0
    let skippedCount = 0
    let failedCount = 0
    const errors: { studentName: string; error: string }[] = []

    for (const attempt of eligibleAttempts) {
      // Skip if already sent (idempotency)
      if (attempt.results_sent_at) {
        skippedCount++
        continue
      }

      // Skip if no telegram_id
      if (!attempt.telegram_id) {
        skippedCount++
        continue
      }

      // Build and send message
      const message = buildResultMessage({
        studentName: attempt.full_name || "Talaba",
        examName: examName,
        finalScore: attempt.final_score,
        percentage: attempt.percentage || 0,
        certificateLevel: attempt.certificate_level,
      })

      const result = await sendTelegramMessage(attempt.telegram_id, message)

      if (result.success) {
        // Mark as sent to prevent duplicate sends
        await sql`
          UPDATE student_attempts 
          SET results_sent_at = NOW() 
          WHERE id = ${attempt.id}
        `
        sentCount++
      } else {
        failedCount++
        errors.push({
          studentName: attempt.full_name || "Unknown",
          error: result.error || "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      sent_count: sentCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error sending results:", error)
    return NextResponse.json({ error: "Failed to send results" }, { status: 500 })
  }
}

// GET endpoint to check eligible count before sending
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 })
    }

    // Count eligible attempts that haven't been sent yet
    const countResult = await sql`
      SELECT 
        COUNT(*) FILTER (
          WHERE sa.final_score IS NOT NULL 
            AND sa.certificate_level IS NOT NULL
            AND sa.results_sent_at IS NULL
            AND s.telegram_id IS NOT NULL
        ) as pending_count,
        COUNT(*) FILTER (
          WHERE sa.final_score IS NOT NULL 
            AND sa.certificate_level IS NOT NULL
            AND sa.results_sent_at IS NOT NULL
        ) as sent_count,
        COUNT(*) FILTER (
          WHERE sa.final_score IS NULL 
            OR sa.certificate_level IS NULL
        ) as not_finalized_count
      FROM student_attempts sa
      JOIN students s ON sa.student_id = s.id
      WHERE sa.exam_id = ${examId}
        AND sa.status = 'completed'
    `

    const counts = countResult[0] || { pending_count: 0, sent_count: 0, not_finalized_count: 0 }

    return NextResponse.json({
      pending_count: Number(counts.pending_count) || 0,
      sent_count: Number(counts.sent_count) || 0,
      not_finalized_count: Number(counts.not_finalized_count) || 0,
    })
  } catch (error) {
    console.error("Error checking eligible count:", error)
    return NextResponse.json({ error: "Failed to check eligible count" }, { status: 500 })
  }
}
