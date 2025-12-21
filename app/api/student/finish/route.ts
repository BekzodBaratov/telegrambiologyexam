import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

function calculateCertificateLevel(finalScore: number): string {
  if (finalScore >= 70) return "A+"
  if (finalScore >= 65) return "A"
  if (finalScore >= 60) return "B+"
  if (finalScore >= 55) return "B"
  if (finalScore >= 50) return "C+"
  if (finalScore >= 46) return "C"
  return "Fail"
}

export async function POST(request: Request) {
  try {
    const { attemptId, part } = await request.json()

    if (!attemptId) {
      return NextResponse.json({ message: "Attempt ID is required" }, { status: 400 })
    }

    if (part === "part1") {
      await sql`
        UPDATE student_attempts
        SET part1_finished_at = NOW(), status = 'part1_complete'
        WHERE id = ${attemptId}
      `
    } else if (part === "part2") {
      // Get scores for Part A (questions 1-40) and Part B (questions 41-43)
      const scoreResult = await sql`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN q.question_number <= 40 THEN COALESCE(sa.score, sa.teacher_score, 0)
            ELSE 0 
          END), 0) as score_a,
          COALESCE(SUM(CASE 
            WHEN q.question_number > 40 THEN COALESCE(sa.teacher_score, sa.score, 0)
            ELSE 0 
          END), 0) as score_b
        FROM student_answers sa
        JOIN questions q ON sa.question_id = q.id
        WHERE sa.attempt_id = ${attemptId}
      `

      const scoreA = Number.parseFloat(scoreResult[0]?.score_a || "0")
      const scoreB = Number.parseFloat(scoreResult[0]?.score_b || "0")

      // Calculate final score: (score_A + score_B) / 2
      const finalScore = (scoreA + scoreB) / 2
      const certificateLevel = calculateCertificateLevel(finalScore)

      await sql`
        UPDATE student_attempts
        SET 
          part2_finished_at = NOW(), 
          finished_at = NOW(), 
          status = 'completed',
          final_score = ${finalScore},
          certificate_level = ${certificateLevel}
        WHERE id = ${attemptId}
      `

      return NextResponse.json({
        success: true,
        finalScore,
        certificateLevel,
        scoreA,
        scoreB,
      })
    } else {
      await sql`
        UPDATE student_attempts
        SET finished_at = NOW(), status = 'completed'
        WHERE id = ${attemptId}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Finish exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
