import { z } from "zod"

export const codeEntrySchema = z.object({
  code: z.string().min(4, "Code must be at least 4 characters"),
})

export const studentNameSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  gradeLevel: z.number().min(1).max(12).optional(),
})

export const saveAnswerSchema = z.object({
  attemptId: z.number(),
  questionId: z.number(),
  answer: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
})

export const finishExamSchema = z.object({
  attemptId: z.number(),
  part: z.enum(["part1", "part2", "all"]),
})

export const questionSchema = z.object({
  sectionId: z.number(),
  questionNumber: z.number().min(1).max(43),
  questionTypeId: z.number(),
  text: z.string().min(1),
  options: z.record(z.string()).optional(),
  correctAnswer: z.string().optional(),
  maxScore: z.number().default(1),
})

export const testCodeSchema = z.object({
  code: z.string().min(4),
  examId: z.number(),
  maxAttempts: z.number().default(1),
})

export const o2ScoreSchema = z.object({
  answerId: z.number(),
  score: z.number().min(0).max(25),
})

export type CodeEntryInput = z.infer<typeof codeEntrySchema>
export type StudentNameInput = z.infer<typeof studentNameSchema>
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>
export type FinishExamInput = z.infer<typeof finishExamSchema>
export type QuestionInput = z.infer<typeof questionSchema>
export type TestCodeInput = z.infer<typeof testCodeSchema>
export type O2ScoreInput = z.infer<typeof o2ScoreSchema>
