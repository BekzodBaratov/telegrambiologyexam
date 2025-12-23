import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { saveAnswersBatchSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/security"

/**
 * IMPORTANT: Answer validation with randomized options
 *
 * The correct_answer in the questions table is stored using the ORIGINAL option letters (A, B, C, D).
 * However, students see RANDOMIZED options where the original "A" might be displayed as "C".
 *
 * When a student submits an answer, they send the DISPLAYED letter (e.g., "C").
 * We must map this back to the ORIGINAL letter before comparing against correct_answer.
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

    const [attempt] = await sql`
      SELECT id, status, option_orders, part1_started_at, part2_started_at,
             part1_finished_at, part2_finished_at
      FROM student_attempts 
      WHERE id = ${attemptId}
    `

    if (!attempt) {
      return NextResponse.json({ message: "Urinish topilmadi" }, { status: 404 })
    }

    if (attempt.status === "completed") {
      return NextResponse.json({ message: "Bu imtihon allaqachon yakunlangan" }, { status: 400 })
    }

    const optionOrders: Record<number, string[]> = attempt?.option_orders || {}

    for (const answer of answers) {
      const [question] = await sql`
        SELECT q.correct_answer, q.max_score, qt.code as question_type_code
        FROM questions q
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE q.id = ${answer.questionId}
      `

      if (!question) continue

      let isCorrect: boolean | null = null
      const storedOrder = optionOrders[answer.questionId] || null
      const submittedAnswer = answer.answer || ""

      if (question.correct_answer) {
        const questionType = question.question_type_code

        if (questionType === "Y1") {
          const originalAnswer = getOriginalLetter(submittedAnswer, storedOrder)
          isCorrect = question.correct_answer.toUpperCase() === originalAnswer.toUpperCase()
        } else if (questionType === "Y2") {
          const originalAnswer = getOriginalY2Answer(submittedAnswer, storedOrder)
          isCorrect = question.correct_answer.toUpperCase() === originalAnswer.toUpperCase()
        } else if (questionType === "O1") {
          isCorrect = question.correct_answer.toLowerCase() === submittedAnswer.toLowerCase()
        } else {
          isCorrect = question.correct_answer.toLowerCase() === submittedAnswer.toLowerCase()
        }
      }

      const score = isCorrect ? question?.max_score || 1 : 0

      await sql`
        INSERT INTO student_answers (attempt_id, question_id, answer, image_urls, is_correct, score, updated_at)
        VALUES (
          ${attemptId},
          ${answer.questionId},
          ${answer.answer || null},
          ${answer.imageUrls ? JSON.stringify(answer.imageUrls) : null},
          ${isCorrect},
          ${score},
          NOW()
        )
        ON CONFLICT (attempt_id, question_id)
        DO UPDATE SET
          answer = ${answer.answer || null},
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
