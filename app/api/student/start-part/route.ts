import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { attemptId, part } = await request.json()

    if (!attemptId || !part) {
      return NextResponse.json({ message: "Attempt ID and part are required" }, { status: 400 })
    }

    const [attempt] = await sql`
      SELECT id, part1_started_at, part2_started_at, part1_finished_at, part2_finished_at,
             exam_id
      FROM student_attempts WHERE id = ${attemptId}
    `

    if (!attempt) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    // Get exam duration settings
    const [exam] = await sql`
      SELECT test_duration, written_duration FROM exams WHERE id = ${attempt.exam_id}
    `

    const testDuration = (exam?.test_duration || 100) * 60
    const writtenDuration = (exam?.written_duration || 80) * 60

    const now = new Date()

    if (part === "part1") {
      // Check if part1 already finished
      if (attempt.part1_finished_at) {
        return NextResponse.json({ message: "Part 1 already finished" }, { status: 400 })
      }

      // If part1 not started yet, start it now
      if (!attempt.part1_started_at) {
        await sql`
          UPDATE student_attempts 
          SET part1_started_at = ${now}
          WHERE id = ${attemptId}
        `
        return NextResponse.json({
          success: true,
          startedAt: now.toISOString(),
          remainingSeconds: testDuration,
        })
      }

      // Part1 already started, calculate remaining time
      const elapsed = Math.floor((now.getTime() - new Date(attempt.part1_started_at).getTime()) / 1000)
      const remaining = Math.max(0, testDuration - elapsed)

      if (remaining <= 0) {
        // Auto-finish part1 if time expired
        await sql`
          UPDATE student_attempts 
          SET part1_finished_at = ${now}
          WHERE id = ${attemptId}
        `
        return NextResponse.json(
          {
            success: false,
            expired: true,
            message: "Vaqt tugadi",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        startedAt: attempt.part1_started_at,
        remainingSeconds: remaining,
      })
    }

    if (part === "part2") {
      // Check if part1 completed
      if (!attempt.part1_finished_at) {
        return NextResponse.json({ message: "Part 1 must be completed first" }, { status: 400 })
      }

      // Check if part2 already finished
      if (attempt.part2_finished_at) {
        return NextResponse.json({ message: "Part 2 already finished" }, { status: 400 })
      }

      // If part2 not started yet, start it now
      if (!attempt.part2_started_at) {
        await sql`
          UPDATE student_attempts 
          SET part2_started_at = ${now}
          WHERE id = ${attemptId}
        `
        return NextResponse.json({
          success: true,
          startedAt: now.toISOString(),
          remainingSeconds: writtenDuration,
        })
      }

      // Part2 already started, calculate remaining time
      const elapsed = Math.floor((now.getTime() - new Date(attempt.part2_started_at).getTime()) / 1000)
      const remaining = Math.max(0, writtenDuration - elapsed)

      if (remaining <= 0) {
        // Auto-finish part2 if time expired
        await sql`
          UPDATE student_attempts 
          SET part2_finished_at = ${now}, status = 'completed'
          WHERE id = ${attemptId}
        `
        return NextResponse.json(
          {
            success: false,
            expired: true,
            message: "Vaqt tugadi",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        startedAt: attempt.part2_started_at,
        remainingSeconds: remaining,
      })
    }

    return NextResponse.json({ message: "Invalid part" }, { status: 400 })
  } catch (error) {
    console.error("Start part error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
