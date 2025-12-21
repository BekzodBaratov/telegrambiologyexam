"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useEffect, useState } from "react"

interface Answer {
  questionId: number
  answer?: string
  imageUrls?: string[]
}

interface ExamState {
  attemptId: number | null
  examId: number | null
  studentId: number | null
  studentName: string | null
  codeUsed: string | null
  currentPart: "selection" | "part1" | "part2" | null
  part1StartTime: number | null
  part2StartTime: number | null
  part1TimeRemaining: number
  part2TimeRemaining: number
  part1Completed: boolean
  part2Completed: boolean
  answers: Answer[]
  currentQuestionIndex: number
  isFinished: boolean
  _hasHydrated: boolean

  // Actions
  setAttempt: (attemptId: number, examId: number, studentId: number, codeUsed: string) => void
  setStudentName: (name: string) => void
  setCurrentPart: (part: "selection" | "part1" | "part2") => void
  startPart1: () => void
  startPart2: () => void
  completePart1: () => void
  completePart2: () => void
  updateTimeRemaining: (part: "part1" | "part2", time: number) => void
  saveAnswer: (answer: Answer) => void
  getAnswer: (questionId: number) => Answer | undefined
  setCurrentQuestionIndex: (index: number) => void
  finishExam: () => void
  reset: () => void
  setHasHydrated: (state: boolean) => void
}

const PART1_DURATION = 100 * 60 // 100 minutes in seconds
const PART2_DURATION = 80 * 60 // 80 minutes in seconds

export const useExamStoreBase = create<ExamState>()(
  persist(
    (set, get) => ({
      attemptId: null,
      examId: null,
      studentId: null,
      studentName: null,
      codeUsed: null,
      currentPart: null,
      part1StartTime: null,
      part2StartTime: null,
      part1TimeRemaining: PART1_DURATION,
      part2TimeRemaining: PART2_DURATION,
      part1Completed: false,
      part2Completed: false,
      answers: [],
      currentQuestionIndex: 0,
      isFinished: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAttempt: (attemptId, examId, studentId, codeUsed) => set({ attemptId, examId, studentId, codeUsed }),

      setStudentName: (name) => set({ studentName: name }),

      setCurrentPart: (part) => set({ currentPart: part }),

      startPart1: () =>
        set({
          currentPart: "part1",
          part1StartTime: Date.now(),
          currentQuestionIndex: 0,
        }),

      startPart2: () =>
        set({
          currentPart: "part2",
          part2StartTime: Date.now(),
          currentQuestionIndex: 0,
        }),

      completePart1: () => set({ part1Completed: true, currentPart: "selection" }),
      completePart2: () => set({ part2Completed: true, currentPart: "selection" }),

      updateTimeRemaining: (part, time) =>
        set(part === "part1" ? { part1TimeRemaining: time } : { part2TimeRemaining: time }),

      saveAnswer: (answer) =>
        set((state) => {
          const existingIndex = state.answers.findIndex((a) => a.questionId === answer.questionId)
          if (existingIndex >= 0) {
            const newAnswers = [...state.answers]
            newAnswers[existingIndex] = answer
            return { answers: newAnswers }
          }
          return { answers: [...state.answers, answer] }
        }),

      getAnswer: (questionId) => {
        return get().answers.find((a) => a.questionId === questionId)
      },

      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      finishExam: () => set({ isFinished: true }),

      reset: () =>
        set({
          attemptId: null,
          examId: null,
          studentId: null,
          studentName: null,
          codeUsed: null,
          currentPart: null,
          part1StartTime: null,
          part2StartTime: null,
          part1TimeRemaining: PART1_DURATION,
          part2TimeRemaining: PART2_DURATION,
          part1Completed: false,
          part2Completed: false,
          answers: [],
          currentQuestionIndex: 0,
          isFinished: false,
        }),
    }),
    {
      name: "exam-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

export function useExamStore() {
  const store = useExamStoreBase()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Return store with hydration check
  return {
    ...store,
    isHydrated,
  }
}
