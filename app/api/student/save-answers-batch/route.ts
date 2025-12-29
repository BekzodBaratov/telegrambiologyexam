import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { saveAnswersBatchSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/security"
import { generateOptionId, isAnswerCorrect, resolveCorrectOptionId } from "@/lib/option-utils"

/**
 * IMPORTANT: Answer validation with randomized options
 *
 * NEW APPROACH (correct_option_id):
 * - Each option has a stable ID: "{questionId}_{originalLetter}" (e.g., "123_A")
 * - Students submit selected_option_id which never changes regardless of display order
 * - Validation compares selected_option_id against correct_option_id
 *
 * LEGACY APPROACH (correct_answer letter):
 * - For questions without correct_option_id, we fall back to letter-based validation
 * - We map the displayed letter back to the original letter using option_orders
 */

function getOriginalLetter(displayedLetter: string, storedOrder: string[] | null): string {
  if (!storedOrder || storedOrder.length === 0) {
    return displayedLetter
  }

  const displayLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]
  const displayIndex = displayLabels.indexOf(displayedLetter.toUpperCase())

  if (displayIndex >= 0 && displayIndex < storedOrder.length) {
    return storedOrder[displayIndex]
  }

  return displayedLetter
}

function getOriginalY2Answer(displayedAnswer: string, storedOrder: string[] | null): string {
  if (!displayedAnswer || !displayedAnswer.includes("-")) {
    return displayedAnswer
  }

  const pairs = displayedAnswer.split(",")
  const mappedPairs = pairs.map((pair) => {
    const parts = pair.trim().split("-")
    if (parts.length === 2) {
      const [num, letter] = parts
      const originalLetter = getOriginalLetter(letter, storedOrder)
      return `${num}-${originalLetter}`
    }
    return pair
  })

  return mappedPairs.join(",")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const validation = saveAnswersBatchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar" },
        { status: 400 },
      )
    }

    const { attemptId, answers } = validation.data

    const rateLimit = checkRateLimit(`save:${attemptId}`, 60, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: "Juda ko'p so'rov. Iltimos, biroz kuting." }, { status: 429 })
    }

    const attemptResult = await sql`
      SELECT id, status, option_orders, part1_started_at, part2_started_at,
             part1_finished_at, part2_finished_at, exam_id
      FROM student_attempts 
      WHERE id = ${attemptId}
    `
    const attempt = Array.isArray(attemptResult) ? attemptResult[0] : attemptResult

    if (!attempt) {
      return NextResponse.json({ message: "Urinish topilmadi" }, { status: 404 })
    }

    if (attempt.status === "completed") {
      return NextResponse.json({ message: "Bu imtihon allaqachon yakunlangan" }, { status: 400 })
    }

    const examResult = await sql`
      SELECT test_duration, written_duration FROM exams WHERE id = ${attempt.exam_id}
    `
    const exam = Array.isArray(examResult) ? examResult[0] : examResult

    const now = new Date()
    const testDurationMs = (exam?.test_duration || 100) * 60 * 1000
    const writtenDurationMs = (exam?.written_duration || 80) * 60 * 1000

    // Check Part 1 time
    if (attempt.part1_started_at && !attempt.part1_finished_at) {
      const part1StartTime = new Date(attempt.part1_started_at).getTime()
      const elapsed = now.getTime() - part1StartTime
      if (elapsed > testDurationMs + 30000) {
        // 30 second grace period
        return NextResponse.json(
          { message: "Vaqt tugagan. Javoblarni saqlab bo'lmaydi.", timeExpired: true },
          { status: 400 },
        )
      }
    }

    // Check Part 2 time
    if (attempt.part2_started_at && !attempt.part2_finished_at) {
      const part2StartTime = new Date(attempt.part2_started_at).getTime()
      const elapsed = now.getTime() - part2StartTime
      if (elapsed > writtenDurationMs + 30000) {
        // 30 second grace period
        return NextResponse.json(
          { message: "Vaqt tugagan. Javoblarni saqlab bo'lmaydi.", timeExpired: true },
          { status: 400 },
        )
      }
    }

    const optionOrders: Record<number, string[]> = attempt?.option_orders || {}

    for (const answer of answers) {
      const questionResult = await sql`
        SELECT q.correct_answer, q.correct_option_id, q.max_score, qt.code as question_type_code
        FROM questions q
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE q.id = ${answer.questionId}
      `
      const question = Array.isArray(questionResult) ? questionResult[0] : questionResult

      if (!question) continue

      let isCorrect: boolean | null = null
      let selectedOptionId: string | null = null
      const storedOrder = optionOrders[answer.questionId] || null
      const submittedAnswer = answer.answer || ""

      const questionType = question.question_type_code

      if (questionType === "Y1") {
        if (answer.selectedOptionId) {
          selectedOptionId = answer.selectedOptionId
          const correctOptionId = resolveCorrectOptionId(
            answer.questionId,
            question.correct_option_id,
            question.correct_answer,
          )
          isCorrect = isAnswerCorrect(selectedOptionId, correctOptionId)
        } else if (submittedAnswer && question.correct_answer) {
          const originalLetter = getOriginalLetter(submittedAnswer, storedOrder)
          isCorrect = question.correct_answer.toUpperCase() === originalLetter.toUpperCase()
          selectedOptionId = generateOptionId(answer.questionId, originalLetter)
        }
      } else if (questionType === "Y2") {
        if (question.correct_answer) {
          const originalAnswer = getOriginalY2Answer(submittedAnswer, storedOrder)
          isCorrect = question.correct_answer.toUpperCase() === originalAnswer.toUpperCase()
        }
      } else if (questionType === "O1") {
        if (question.correct_answer) {
          isCorrect = question.correct_answer.toLowerCase() === submittedAnswer.toLowerCase()
        }
      } else {
        isCorrect = null
      }

      const score = isCorrect ? question?.max_score || 1 : 0

      await sql`
        INSERT INTO student_answers (attempt_id, question_id, answer, selected_option_id, image_urls, is_correct, score, updated_at)
        VALUES (
          ${attemptId},
          ${answer.questionId},
          ${answer.answer || null},
          ${selectedOptionId},
          ${answer.imageUrls ? JSON.stringify(answer.imageUrls) : null},
          ${isCorrect},
          ${score},
          NOW()
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
          answer = ${answer.answer || null},
          selected_option_id = ${selectedOptionId},
          image_urls = ${answer.imageUrls ? JSON.stringify(answer.imageUrls) : null},
          is_correct = ${isCorrect},
          score = ${score},
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save answers error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
