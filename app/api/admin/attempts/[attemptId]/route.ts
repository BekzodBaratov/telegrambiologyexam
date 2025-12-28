import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

interface AttemptQuestion {
  type: "Y1" | "O1"
  position: number
  question_id: number
  question_text: string
  student_answer: string | null
  is_correct: boolean | null
  score: number | null
}

interface Y2SubQuestion {
  sub_position: number
  question_id: number
  question_text: string
  student_answer: string | null
  is_correct: boolean | null
  score: number | null
}

interface Y2GroupQuestion {
  type: "Y2"
  position: number
  group_id: number
  group_stem: string
  sub_questions: Y2SubQuestion[]
}

interface O2Question {
  type: "O2"
  position: number
  question_id: number
  question_text: string
  student_answer: string | null
  image_urls: string[] | null
  teacher_score: number | null
}

type AttemptQuestionItem = AttemptQuestion | Y2GroupQuestion | O2Question

interface AttemptDetailsResponse {
  attempt: {
    id: number
    status: string
    part1_score: number | null
    part2_score: number | null
    final_score: number | null
    certificate_level: string | null
  }
  questions: AttemptQuestionItem[]
}

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params
    const id = Number.parseInt(attemptId, 10)

    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid attempt ID" }, { status: 400 })
    }

    const attemptRows = await sql`
      SELECT 
        id,
        status,
        part1_score,
        part2_score,
        final_score,
        certificate_level
      FROM student_attempts
      WHERE id = ${id}
    `

    if (!Array.isArray(attemptRows) || attemptRows.length === 0) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    const attempt = attemptRows[0] as any

    const answersRows = await sql`
      SELECT 
        sa.id,
        sa.question_id,
        sa.answer,
        sa.image_urls,
        sa.is_correct,
        sa.score,
        sa.teacher_score,
        q.text as question_text,
        q.group_id,
        q.order_in_group,
        qt.code as question_type_code,
        eq.position as exam_position,
        qg.stem as group_stem,
        qg.id as group_id_from_table
      FROM student_answers sa
      JOIN questions q ON sa.question_id = q.id
      JOIN question_types qt ON q.question_type_id = qt.id
      JOIN exam_questions eq ON eq.question_id = q.id 
        AND eq.exam_id = (SELECT exam_id FROM student_attempts WHERE id = ${id})
      LEFT JOIN question_groups qg ON q.group_id = qg.id
      WHERE sa.attempt_id = ${id}
      ORDER BY eq.position ASC, q.order_in_group ASC, sa.question_id ASC
    `

    if (!Array.isArray(answersRows)) {
      return NextResponse.json({ message: "Failed to fetch answers" }, { status: 500 })
    }

    const questions: AttemptQuestionItem[] = []
    const processedPositions = new Set<number>()
    const processedGroups = new Set<number>()

    for (const row of answersRows) {
      const row_any = row as any

      // Handle Y2 grouped questions
      if (row_any.question_type_code === "Y2" && row_any.group_id) {
        const groupId = row_any.group_id

        // Only process each group once, collect all sub-questions
        if (!processedGroups.has(groupId)) {
          processedGroups.add(groupId)

          const subQuestions: Y2SubQuestion[] = []
          const groupPosition = row_any.exam_position
          const groupStem = row_any.group_stem

          // Collect all sub-questions for this group
          for (const subRow of answersRows) {
            const subRow_any = subRow as any
            if (subRow_any.group_id === groupId && subRow_any.question_type_code === "Y2") {
              subQuestions.push({
                sub_position: subRow_any.order_in_group || subQuestions.length + 1,
                question_id: subRow_any.question_id,
                question_text: subRow_any.question_text,
                student_answer: subRow_any.answer,
                is_correct: subRow_any.is_correct,
                score: subRow_any.score,
              })
            }
          }

          questions.push({
            type: "Y2",
            position: groupPosition,
            group_id: groupId,
            group_stem: groupStem,
            sub_questions: subQuestions.sort((a, b) => a.sub_position - b.sub_position),
          } as Y2GroupQuestion)
        }
        continue
      }

      // Handle Y1 and O1 questions (single answer questions)
      if (row_any.question_type_code === "Y1" || row_any.question_type_code === "O1") {
        const position = row_any.exam_position

        if (!processedPositions.has(position)) {
          processedPositions.add(position)

          questions.push({
            type: row_any.question_type_code,
            position: position,
            question_id: row_any.question_id,
            question_text: row_any.question_text,
            student_answer: row_any.answer,
            is_correct: row_any.is_correct,
            score: row_any.score,
          } as AttemptQuestion)
        }
        continue
      }

      // Handle O2 questions
      if (row_any.question_type_code === "O2") {
        const position = row_any.exam_position

        if (!processedPositions.has(position)) {
          processedPositions.add(position)

          const imageUrls = row_any.image_urls
            ? Array.isArray(row_any.image_urls)
              ? row_any.image_urls
              : [row_any.image_urls]
            : null

          questions.push({
            type: "O2",
            position: position,
            question_id: row_any.question_id,
            question_text: row_any.question_text,
            student_answer: row_any.answer,
            image_urls: imageUrls,
            teacher_score: row_any.teacher_score,
          } as O2Question)
        }
        continue
      }
    }

    questions.sort((a, b) => a.position - b.position)

    const response: AttemptDetailsResponse = {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        part1_score: attempt.part1_score,
        part2_score: attempt.part2_score,
        final_score: attempt.final_score,
        certificate_level: attempt.certificate_level,
      },
      questions,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get attempt details error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
