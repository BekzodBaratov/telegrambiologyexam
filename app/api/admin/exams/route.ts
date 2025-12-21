import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const exams = await sql`
      SELECT 
        e.*,
        s.name as subject_name,
        (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id)::int as question_count
      FROM exams e
      LEFT JOIN subjects s ON e.subject_id = s.id
      ORDER BY e.created_at DESC
    `
    return NextResponse.json(exams)
  } catch (error) {
    console.error("Get exams error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, subjectId, testDuration, writtenDuration, isActive, questionIds } = body

    // Create exam
    const [exam] = await sql`
      INSERT INTO exams (name, subject_id, test_duration, written_duration, is_active)
      VALUES (${name}, ${subjectId}, ${testDuration}, ${writtenDuration}, ${isActive ?? false})
      RETURNING *
    `

    // Link questions to exam with positions
    if (questionIds && questionIds.length > 0) {
      // Get questions with their types
      const questions = await sql`
        SELECT q.id, q.question_number, qt.code as type_code, q.group_id, q.order_in_group
        FROM questions q
        JOIN question_types qt ON q.question_type_id = qt.id
        WHERE q.id = ANY(${questionIds}::int[])
      `

      // Define type order
      const typeOrder: Record<string, number> = { Y1: 1, Y2: 2, O1: 3, O2: 4 }

      // Group questions by type
      const questionsByType: Record<string, any[]> = {
        Y1: [],
        Y2: [],
        O1: [],
        O2: [],
      }

      questions.forEach((q: any) => {
        const type = q.type_code
        if (questionsByType[type]) {
          questionsByType[type].push(q)
        }
      })

      // Shuffle function (Fisher-Yates)
      const shuffle = (array: any[]): any[] => {
        const arr = [...array]
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
      }

      // For Y2, we need to keep groups intact
      // Group Y2 questions by their group_id, shuffle groups, then flatten
      const processY2Questions = (y2Questions: any[]) => {
        const groups: Record<number, any[]> = {}
        const ungrouped: any[] = []

        y2Questions.forEach((q: any) => {
          if (q.group_id) {
            if (!groups[q.group_id]) groups[q.group_id] = []
            groups[q.group_id].push(q)
          } else {
            ungrouped.push(q)
          }
        })

        // Sort sub-questions within each group by order_in_group
        Object.values(groups).forEach((group) => {
          group.sort((a: any, b: any) => (a.order_in_group || 0) - (b.order_in_group || 0))
        })

        // Shuffle group order, then flatten
        const groupIds = shuffle(Object.keys(groups).map(Number))
        const result: any[] = []

        groupIds.forEach((groupId) => {
          result.push(...groups[groupId])
        })

        // Add any ungrouped Y2 questions (shuffled)
        result.push(...shuffle(ungrouped))

        return result
      }

      // Build final ordered list
      const orderedQuestions: any[] = []

      // Y1 - shuffle
      orderedQuestions.push(...shuffle(questionsByType.Y1))

      // Y2 - shuffle groups, keep sub-questions in order within groups
      orderedQuestions.push(...processY2Questions(questionsByType.Y2))

      // O1 - shuffle
      orderedQuestions.push(...shuffle(questionsByType.O1))

      // O2 - shuffle
      orderedQuestions.push(...shuffle(questionsByType.O2))

      // Insert with positions
      for (let i = 0; i < orderedQuestions.length; i++) {
        await sql`
          INSERT INTO exam_questions (exam_id, question_id, position)
          VALUES (${exam.id}, ${orderedQuestions[i].id}, ${i + 1})
        `
      }
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error("Create exam error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
