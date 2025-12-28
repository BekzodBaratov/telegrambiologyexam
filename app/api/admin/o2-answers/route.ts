import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")
    const ungradedOnly = searchParams.get("ungradedOnly") === "true"
    const testCode = searchParams.get("testCode")
    const questionPosition = searchParams.get("questionPosition")

    if (!examId) {
      return NextResponse.json({ message: "Exam ID is required" }, { status: 400 })
    }

    const examIdNum = Number.parseInt(examId)

    // Build the query based on filters using conditional queries
    let answers

    if (ungradedOnly && testCode && questionPosition) {
      const posNum = Number.parseInt(questionPosition)
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND sa.teacher_score IS NULL
          AND att.code_used = ${testCode}
          AND eq.position = ${posNum}
        ORDER BY s.full_name, eq.position
      `
    } else if (ungradedOnly && testCode) {
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND sa.teacher_score IS NULL
          AND att.code_used = ${testCode}
        ORDER BY s.full_name, eq.position
      `
    } else if (ungradedOnly && questionPosition) {
      const posNum = Number.parseInt(questionPosition)
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND sa.teacher_score IS NULL
          AND eq.position = ${posNum}
        ORDER BY s.full_name, eq.position
      `
    } else if (testCode && questionPosition) {
      const posNum = Number.parseInt(questionPosition)
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND att.code_used = ${testCode}
          AND eq.position = ${posNum}
        ORDER BY s.full_name, eq.position
      `
    } else if (ungradedOnly) {
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND sa.teacher_score IS NULL
        ORDER BY s.full_name, eq.position
      `
    } else if (testCode) {
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND att.code_used = ${testCode}
        ORDER BY s.full_name, eq.position
      `
    } else if (questionPosition) {
      const posNum = Number.parseInt(questionPosition)
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
          AND eq.position = ${posNum}
        ORDER BY s.full_name, eq.position
      `
    } else {
      // No filters - base query
      answers = await sql`
        SELECT 
          sa.id,
          sa.attempt_id,
          s.full_name as student_name,
          eq.position as question_number,
          q.text as question_text,
          q.image_url as question_image_url,
          sa.answer,
          sa.image_urls,
          sa.teacher_score,
          att.code_used as test_code
        FROM student_answers sa
        JOIN student_attempts att ON sa.attempt_id = att.id
        JOIN students s ON att.student_id = s.id
        JOIN questions q ON sa.question_id = q.id
        JOIN question_types qt ON q.question_type_id = qt.id
        JOIN exam_questions eq ON eq.exam_id = att.exam_id AND eq.question_id = q.id
        WHERE att.exam_id = ${examIdNum}
          AND qt.code = 'O2'
          AND att.status = 'completed'
        ORDER BY s.full_name, eq.position
      `
    }

    return NextResponse.json(Array.isArray(answers) ? answers : [])
  } catch (error) {
    console.error("Get O2 answers error:", error)
    return NextResponse.json({ message: "Server error", error: String(error) }, { status: 500 })
  }
}
