import { z } from "zod"

export const codeEntrySchema = z.object({
  code: z
    .string()
    .min(4, "Kod kamida 4 belgidan iborat bo'lishi kerak")
    .max(20, "Kod 20 belgidan oshmasligi kerak")
    .regex(/^[A-Za-z0-9]+$/, "Kod faqat harf va raqamlardan iborat bo'lishi kerak"),
})

export const studentNameSchema = z.object({
  fullName: z
    .string()
    .min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak")
    .max(100, "Ism 100 belgidan oshmasligi kerak")
    .regex(/^[A-Za-zА-Яа-яЁёʻʼ\s'-]+$/, "Ism faqat harflardan iborat bo'lishi kerak"),
  gradeLevel: z.number().min(1).max(12).optional(),
})

export const registrationSchema = z.object({
  telegramId: z.string().regex(/^\d+$/, "Noto'g'ri Telegram ID"),
  fullName: z
    .string()
    .min(2, "Ism kamida 2 belgidan iborat bo'lishi kerak")
    .max(100, "Ism 100 belgidan oshmasligi kerak"),
  region: z.string().min(1, "Viloyatni tanlang"),
  district: z.string().min(1, "Tumanni tanlang"),
  phoneNumber: z.string().regex(/^\+998\d{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak"),
})

export const otpSchema = z.object({
  phoneNumber: z.string().regex(/^\+998\d{9}$/, "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak"),
  otpCode: z
    .string()
    .length(6, "OTP kod 6 raqamdan iborat bo'lishi kerak")
    .regex(/^\d{6}$/, "OTP kod faqat raqamlardan iborat bo'lishi kerak"),
})

export const saveAnswerSchema = z.object({
  attemptId: z.number().int().positive("Noto'g'ri attempt ID"),
  questionId: z.number().int().positive("Noto'g'ri question ID"),
  answer: z.string().max(5000, "Javob juda uzun").optional(),
  imageUrls: z.array(z.string().url("Noto'g'ri URL format")).max(5).optional(),
})

export const saveAnswersBatchSchema = z.object({
  attemptId: z.number().int().positive("Noto'g'ri attempt ID"),
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        answer: z.string().max(5000).optional(),
        imageUrls: z.array(z.string().url()).max(5).optional(),
      }),
    )
    .max(100, "Bir vaqtda 100 dan ortiq javob saqlab bo'lmaydi"),
})

export const finishExamSchema = z.object({
  attemptId: z.number().int().positive("Noto'g'ri attempt ID"),
  part: z.enum(["part1", "part2", "all"]),
})

export const questionSchema = z.object({
  sectionId: z.number().int().positive(),
  questionNumber: z.number().int().min(1).max(100),
  questionTypeId: z.number().int().positive(),
  text: z.string().min(1, "Savol matni kiritilishi shart").max(10000),
  options: z.record(z.string().max(1000)).optional(),
  correctAnswer: z.string().max(500).optional(),
  maxScore: z.number().min(0).max(100).default(1),
  imageUrl: z.string().url().optional().nullable(),
})

export const examSchema = z.object({
  name: z.string().min(1, "Imtihon nomi kiritilishi shart").max(200),
  subjectId: z.number().int().positive(),
  testDuration: z.number().int().min(1).max(600),
  writtenDuration: z.number().int().min(1).max(600),
  isActive: z.boolean().default(false),
  questionIds: z.array(z.number().int().positive()).optional(),
})

export const testCodeSchema = z.object({
  code: z
    .string()
    .min(4, "Kod kamida 4 belgidan iborat bo'lishi kerak")
    .max(20)
    .regex(/^[A-Za-z0-9]+$/),
  examId: z.number().int().positive(),
  maxAttempts: z.number().int().min(1).max(10000).default(1),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
})

export const o2ScoreSchema = z.object({
  answerId: z.number().int().positive("Noto'g'ri answer ID"),
  score: z.number().min(0, "Ball 0 dan kam bo'lishi mumkin emas"),
  maxScore: z.number().min(1).optional(),
})

export const adminLoginSchema = z.object({
  email: z.string().email("Noto'g'ri email format").max(100),
  password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak").max(100),
})

// Type exports
export type CodeEntryInput = z.infer<typeof codeEntrySchema>
export type StudentNameInput = z.infer<typeof studentNameSchema>
export type RegistrationInput = z.infer<typeof registrationSchema>
export type OtpInput = z.infer<typeof otpSchema>
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>
export type SaveAnswersBatchInput = z.infer<typeof saveAnswersBatchSchema>
export type FinishExamInput = z.infer<typeof finishExamSchema>
export type QuestionInput = z.infer<typeof questionSchema>
export type ExamInput = z.infer<typeof examSchema>
export type TestCodeInput = z.infer<typeof testCodeSchema>
export type O2ScoreInput = z.infer<typeof o2ScoreSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
