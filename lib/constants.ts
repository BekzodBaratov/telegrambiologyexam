export const EXAM_CONFIG = {
  PART1_DURATION_SECONDS: 100 * 60, // 100 minutes
  PART2_DURATION_SECONDS: 80 * 60, // 80 minutes
  AUTOSAVE_INTERVAL_MS: 5000,
  TIMER_SYNC_INTERVAL_MS: 30000,
  LOW_TIME_THRESHOLD_SECONDS: 300, // 5 minutes
  CRITICAL_TIME_THRESHOLD_SECONDS: 60, // 1 minute
} as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ADMIN_PAGE_SIZE: 50,
} as const

export const CACHE_TTL = {
  SUBJECTS: 300, // 5 minutes
  QUESTION_TYPES: 600, // 10 minutes
  SECTIONS: 300, // 5 minutes
  EXAM_CONFIG: 60, // 1 minute
} as const

export const CERTIFICATE_LEVELS = {
  APLUS: { min: 90, label: "A+", color: "emerald" },
  A: { min: 80, label: "A", color: "green" },
  B: { min: 70, label: "B", color: "blue" },
  C: { min: 60, label: "C", color: "amber" },
} as const

export const RASCH = {
  MIN_ATTEMPTS_FOR_CALCULATION: 5,
  DEFAULT_DIFFICULTY: 0,
} as const

export const QUESTION_TYPES = {
  Y1: "Y1", // Multiple choice (test)
  Y2: "Y2", // Grouped multiple choice
  O1: "O1", // Short answer
  O2: "O2", // Essay (teacher graded)
} as const

export type QuestionTypeCode = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES]
