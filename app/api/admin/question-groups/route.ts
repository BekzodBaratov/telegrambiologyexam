import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")

    let groups
    if (subjectId) {
      groups = await sql`
        SELECT 
          qg.*,
          s.title as section_title,
          COALESCE(
            json_agg(
              json_build_object(
                'id', q.id,
                'text', q.text,
                'correct_answer', q.correct_answer,
                'question_number', q.question_number,
                'order_in_group', q.order_in_group,
                'section_id', q.section_id
              ) ORDER BY q.order_in_group
            ) FILTER (WHERE q.id IS NOT NULL),
            '[]'
          ) as questions
        FROM question_groups qg
        LEFT JOIN sections s ON qg.section_id = s.id
        LEFT JOIN questions q ON q.group_id = qg.id
        WHERE s.subject_id = ${subjectId}
        GROUP BY qg.id, s.title
        ORDER BY qg.created_at DESC
      `
    } else {
      groups = await sql`
        SELECT 
          qg.*,
          s.title as section_title,
          COALESCE(
            json_agg(
              json_build_object(
                'id', q.id,
                'text', q.text,
                'correct_answer', q.correct_answer,
                'question_number', q.question_number,
                'order_in_group', q.order_in_group,
                'section_id', q.section_id
              ) ORDER BY q.order_in_group
            ) FILTER (WHERE q.id IS NOT NULL),
            '[]'
          ) as questions
        FROM question_groups qg
        LEFT JOIN sections s ON qg.section_id = s.id
        LEFT JOIN questions q ON q.group_id = qg.id
        GROUP BY qg.id, s.title
        ORDER BY qg.created_at DESC
      `
    }

    return NextResponse.json(groups)
  } catch (error) {
    console.error("Get question groups error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sectionId, stem, options, subQuestions } = body

    if (!sectionId || !stem || !options || !subQuestions || subQuestions.length === 0) {
      return NextResponse.json({ message: "Bo'lim, savol matni, variantlar va sub-savollar majburiy" }, { status: 400 })
    }

    const [section] = await sql`
      SELECT s.*, 
        (SELECT COALESCE(SUM(task_count), 0) 
         FROM sections 
         WHERE subject_id = s.subject_id AND id < s.id)::int as prev_count,
        (SELECT COUNT(*) FROM questions WHERE section_id = s.id)::int as current_count
      FROM sections s
      WHERE s.id = ${sectionId}
    `

    if (!section) {
      return NextResponse.json({ message: "Bo'lim topilmadi" }, { status: 400 })
    }

    const neededSpace = subQuestions.length
    const availableSpace = section.task_count - section.current_count

    if (neededSpace > availableSpace) {
      return NextResponse.json(
        {
          message: `Bu bo'limda ${availableSpace} ta joy qolgan, lekin ${neededSpace} ta sub-savol qo'shmoqdasiz.`,
        },
        { status: 400 },
      )
    }

    const [questionType] = await sql`
      SELECT id FROM question_types WHERE code = 'Y2'
    `

    if (!questionType) {
      return NextResponse.json({ message: "Y2 savol turi topilmadi" }, { status: 400 })
    }

    const [group] = await sql`
      INSERT INTO question_groups (type, stem, options, section_id)
      VALUES ('Y2', ${stem}, ${JSON.stringify(options)}, ${sectionId})
      RETURNING *
    `

    let baseQuestionNumber = section.prev_count + section.current_count + 1

    for (const sq of subQuestions) {
      await sql`
        INSERT INTO questions (
          section_id, 
          question_number, 
          question_type_id, 
          text, 
          options,
          correct_answer, 
          group_id, 
          order_in_group
        )
        VALUES (
          ${sectionId}, 
          ${baseQuestionNumber}, 
          ${questionType.id}, 
          ${sq.text}, 
          ${JSON.stringify(options)},
          ${sq.correctAnswer}, 
          ${group.id}, 
          ${sq.orderInGroup}
        )
      `

      if (sq.initialDifficulty !== undefined && sq.initialDifficulty !== 0) {
        const [insertedQuestion] = await sql`
          SELECT id FROM questions 
          WHERE group_id = ${group.id} AND order_in_group = ${sq.orderInGroup}
        `
        if (insertedQuestion) {
          await sql`
            INSERT INTO rasch_item_difficulty (question_id, beta, updated_at)
            VALUES (${insertedQuestion.id}, ${sq.initialDifficulty}, NOW())
            ON CONFLICT (question_id)
            DO UPDATE SET beta = ${sq.initialDifficulty}, updated_at = NOW()
          `
        }
      }

      baseQuestionNumber++
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error("Create question group error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
