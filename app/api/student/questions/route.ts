import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { applyOptionOrder } from "@/lib/randomization"
import { addOptionIds } from "@/lib/option-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")
    const part = searchParams.get("part")
    const attemptId = searchParams.get("attemptId")

    if (!examId) {
      return NextResponse.json({ message: "Exam ID is required" }, { status: 400 })
    }

    let questionOrder: number[] | null = null
    let optionOrders: Record<number, string[]> | null = null

    if (attemptId) {
      const [attempt] = await sql`
        SELECT question_order, option_orders 
        FROM student_attempts 
        WHERE id = ${attemptId}
      `
      if (attempt) {
        questionOrder = attempt.question_order
        optionOrders = attempt.option_orders
      }
    }

    let questions

    if (part === "1") {
      questions = await sql`
        SELECT 
          q.*, 
          qt.code as question_type_code, 
          qt.description as question_type_desc,
          json_build_object('code', qt.code, 'description', qt.description) as question_type,
          qg.stem as group_stem,
          qg.options as group_options
        FROM questions q
        JOIN exam_questions eq ON q.id = eq.question_id
        JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN question_groups qg ON q.group_id = qg.id
        WHERE eq.exam_id = ${examId} AND q.question_number <= 40
        ORDER BY eq.position, q.question_number
      `
    } else if (part === "2") {
      questions = await sql`
        SELECT q.*, qt.code as question_type_code, qt.description as question_type_desc,
               json_build_object('code', qt.code, 'description', qt.description) as question_type
        FROM questions q
        JOIN exam_questions eq ON q.id = eq.question_id
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE eq.exam_id = ${examId} AND q.question_number > 40
        ORDER BY eq.position, q.question_number
      `
      // Part 2 (O2) questions don't need randomization
      return NextResponse.json(questions)
    } else {
      questions = await sql`
        SELECT 
          q.*, 
          qt.code as question_type_code, 
          qt.description as question_type_desc,
          json_build_object('code', qt.code, 'description', qt.description) as question_type,
          qg.stem as group_stem,
          qg.options as group_options
        FROM questions q
        JOIN exam_questions eq ON q.id = eq.question_id
        JOIN question_types qt ON q.question_type_id = qt.id
        LEFT JOIN question_groups qg ON q.group_id = qg.id
        WHERE eq.exam_id = ${examId}
        ORDER BY eq.position, q.question_number
      `
    }

    if (questionOrder && questionOrder.length > 0) {
      // Create a map for quick lookup
      const questionMap = new Map<number, any>()
      for (const q of questions) {
        questionMap.set(q.id, q)
      }

      // Reorder questions based on stored order
      const orderedQuestions: any[] = []
      for (const qId of questionOrder) {
        const q = questionMap.get(qId)
        if (q && (part !== "1" || q.question_number <= 40)) {
          orderedQuestions.push(q)
        }
      }

      // Add any questions not in the stored order (edge case: questions added after attempt started)
      for (const q of questions) {
        if (!questionOrder.includes(q.id)) {
          orderedQuestions.push(q)
        }
      }

      questions = orderedQuestions
    }

    if (optionOrders) {
      questions = questions.map((q: any) => {
        const typeCode = q.question_type_code
        const storedOrder = optionOrders[q.id]

        // For Y2 grouped questions, use group options
        if (q.group_id && q.group_stem) {
          const groupOptions = q.group_options || q.options
          if (groupOptions && storedOrder) {
            const { options: shuffledOptions, correctAnswer: newCorrectAnswer } = applyOptionOrder(
              groupOptions,
              storedOrder,
              q.correct_answer,
            )
            const optionsWithIds = addOptionIds(q.id, shuffledOptions)
            return {
              ...q,
              text: q.group_stem,
              options: shuffledOptions,
              optionsWithIds,
              correct_answer: newCorrectAnswer,
              original_options: groupOptions,
            }
          }
          return {
            ...q,
            text: q.group_stem,
            options: groupOptions,
            optionsWithIds: addOptionIds(q.id, groupOptions),
          }
        }

        // For Y1 questions, shuffle options
        if (typeCode === "Y1" && q.options && storedOrder) {
          const { options: shuffledOptions, correctAnswer: newCorrectAnswer } = applyOptionOrder(
            q.options,
            storedOrder,
            q.correct_answer,
          )
          const optionsWithIds = addOptionIds(q.id, shuffledOptions)
          return {
            ...q,
            options: shuffledOptions,
            optionsWithIds,
            correct_answer: newCorrectAnswer,
            original_options: q.options,
          }
        }

        return {
          ...q,
          optionsWithIds: q.options ? addOptionIds(q.id, q.options) : null,
        }
      })
    } else {
      // No randomization stored, apply Y2 group processing only
      questions = questions.map((q: any) => {
        if (q.group_id && q.group_stem) {
          return {
            ...q,
            text: q.group_stem,
            options: q.group_options || q.options,
            optionsWithIds: addOptionIds(q.id, q.group_options || q.options),
          }
        }
        return {
          ...q,
          optionsWithIds: q.options ? addOptionIds(q.id, q.options) : null,
        }
      })
    }

    return NextResponse.json(questions)
  } catch (error) {
    console.error("Get questions error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
