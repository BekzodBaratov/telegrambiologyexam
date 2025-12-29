import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get("attemptId")

    if (!attemptId) {
      return NextResponse.json({ message: "Attempt ID is required" }, { status: 400 })
    }

    const [attempt] = await sql`
      SELECT 
        sa.id,
        sa.exam_id,
        sa.student_id,
        sa.part1_started_at,
        sa.part1_finished_at,
        sa.part2_started_at,
        sa.part2_finished_at,
        sa.status,
        sa.question_order,
        sa.option_orders,
        sa.code_used as test_code,
        e.name as exam_name,
        e.test_duration,
        e.written_duration,
        s.full_name as student_name
      FROM student_attempts sa
      JOIN exams e ON sa.exam_id = e.id
      JOIN students s ON sa.student_id = s.id
      WHERE sa.id = ${attemptId}
    `

    if (!attempt) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    // <CHANGE> Fetch total question count and part2 existence
    const [examStats] = await sql`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN eq.position > 40 THEN 1 END) as part2_question_count
      FROM exam_questions eq
      WHERE eq.exam_id = ${attempt.exam_id}
    `

    const totalQuestions = examStats ? Number(examStats.total_questions) : 0
    const hasPart2 = examStats ? Number(examStats.part2_question_count) > 0 : false

    const now = new Date()
    const testDuration = (attempt.test_duration || 100) * 60 // in seconds
    const writtenDuration = (attempt.written_duration || 80) * 60 // in seconds

    // Calculate remaining time for part 1
    let part1RemainingSeconds = testDuration
    let part1Expired = false
    if (attempt.part1_started_at) {
      const elapsed = Math.floor((now.getTime() - new Date(attempt.part1_started_at).getTime()) / 1000)
      part1RemainingSeconds = Math.max(0, testDuration - elapsed)
      part1Expired = part1RemainingSeconds <= 0
    }

    // Calculate remaining time for part 2
    let part2RemainingSeconds = writtenDuration
    let part2Expired = false
    if (attempt.part2_started_at) {
      const elapsed = Math.floor((now.getTime() - new Date(attempt.part2_started_at).getTime()) / 1000)
      part2RemainingSeconds = Math.max(0, writtenDuration - elapsed)
      part2Expired = part2RemainingSeconds <= 0
    }

    // Get saved answers for this attempt
    const savedAnswers = await sql`
      SELECT question_id, answer, image_urls
      FROM student_answers
      WHERE attempt_id = ${attemptId}
    `

    return NextResponse.json({
      attemptId: attempt.id,
      examId: attempt.exam_id,
      examName: attempt.exam_name,
      studentId: attempt.student_id,
      studentName: attempt.student_name,
      testCode: attempt.test_code,
      status: attempt.status,

      // <CHANGE> Add exam configuration
      totalQuestions,
      hasPart2,
      part1Duration: attempt.test_duration || 100, // in minutes
      part2Duration: attempt.written_duration || 80, // in minutes

      // Part 1 status
      part1Started: !!attempt.part1_started_at,
      part1Finished: !!attempt.part1_finished_at,
      part1RemainingSeconds,
      part1Expired,

      // Part 2 status
      part2Started: !!attempt.part2_started_at,
      part2Finished: !!attempt.part2_finished_at,
      part2RemainingSeconds,
      part2Expired,

      // Saved answers
      savedAnswers: savedAnswers.map((a) => ({
        questionId: a.question_id,
        answer: a.answer,
        imageUrls: a.image_urls ? JSON.parse(a.image_urls) : [],
      })),

      // Server timestamp for sync
      serverTime: now.toISOString(),
    })
  } catch (error) {
    console.error("Get attempt status error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
