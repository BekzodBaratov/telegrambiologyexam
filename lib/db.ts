import { neon, neonConfig } from "@neondatabase/serverless"

neonConfig.fetchConnectionCache = true

export const sql = neon(process.env.DATABASE_URL!)

// Transaction helper function
// Note: Neon serverless doesn't support traditional transactions,
// but we can use BEGIN/COMMIT/ROLLBACK in a single request
export async function transaction<T>(callback: (tx: typeof sql) => Promise<T>): Promise<T> {
  // For Neon serverless, we use a simple wrapper
  // In production, consider using Neon's transaction API or Prisma
  try {
    await sql`BEGIN`
    const result = await callback(sql)
    await sql`COMMIT`
    return result
  } catch (error) {
    await sql`ROLLBACK`
    throw error
  }
}

// Type definitions
export type Subject = {
  id: number
  name: string
  created_at: Date
}

export type Section = {
  id: number
  subject_id: number
  title: string
  task_count: number
  created_at: Date
}

export type QuestionType = {
  id: number
  code: "Y1" | "Y2" | "O1" | "O2"
  description: string
}

export type Question = {
  id: number
  section_id: number
  question_number: number
  question_type_id: number
  text: string
  options: Record<string, string> | null
  correct_answer: string | null
  max_score: number
  created_at: Date
  question_type?: QuestionType
}

export type Exam = {
  id: number
  subject_id: number
  name: string
  test_duration: number
  written_duration: number
  is_active: boolean
  created_at: Date
}

export type Student = {
  id: number
  telegram_id: string | null
  full_name: string
  region: string | null
  district: string | null
  phone_number: string | null
  grade_level: number | null
  created_at: Date
}

export type TestCode = {
  id: number
  code: string
  exam_id: number
  max_attempts: number
  used_count: number
  is_active: boolean
  valid_from: Date | null
  valid_to: Date | null
  created_at: Date
}

export type StudentAttempt = {
  id: number
  student_id: number
  exam_id: number
  code_used: string
  status: "in_progress" | "part1_complete" | "part2_complete" | "completed"
  part1_started_at: Date | null
  part1_finished_at: Date | null
  part2_started_at: Date | null
  part2_finished_at: Date | null
  started_at: Date
  finished_at: Date | null
  total_score: number | null
  rasch_score: number | null
  question_order: number[] | null
  option_orders: Record<number, string[]> | null
  randomization_seed: number | null
}

export type StudentAnswer = {
  id: number
  attempt_id: number
  question_id: number
  answer: string | null
  image_urls: string[] | null
  is_correct: boolean | null
  score: number | null
  teacher_score: number | null
  created_at: Date
  updated_at: Date
}

export type AdminUser = {
  id: number
  email: string
  password_hash: string
  name: string
  created_at: Date
}

export type AdminSession = {
  id: number
  user_id: number
  token: string
  expires_at: Date
  created_at: Date
}
