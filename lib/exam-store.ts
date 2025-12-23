"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useEffect, useState, useCallback, useRef } from "react"
import { EXAM_CONFIG } from "./constants"

interface Answer {
  questionId: number
  answer?: string
  imageUrls?: string[]
  savedAt?: number // Track when answer was saved
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
  serverTimeOffset: number

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
  setServerTimeOffset: (offset: number) => void
  bulkRestoreAnswers: (answers: Answer[]) => void
}

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
      part1TimeRemaining: EXAM_CONFIG.PART1_DURATION_SECONDS,
      part2TimeRemaining: EXAM_CONFIG.PART2_DURATION_SECONDS,
      part1Completed: false,
      part2Completed: false,
      answers: [],
      currentQuestionIndex: 0,
      isFinished: false,
      _hasHydrated: false,
      serverTimeOffset: 0,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setServerTimeOffset: (offset) => set({ serverTimeOffset: offset }),

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
          const newAnswer = { ...answer, savedAt: Date.now() }

          if (existingIndex >= 0) {
            // Check if answer actually changed
            const existing = state.answers[existingIndex]
            if (
              existing.answer === answer.answer &&
              JSON.stringify(existing.imageUrls) === JSON.stringify(answer.imageUrls)
            ) {
              return state // No change, don't update
            }
            const newAnswers = [...state.answers]
            newAnswers[existingIndex] = newAnswer
            return { answers: newAnswers }
          }
          return { answers: [...state.answers, newAnswer] }
        }),

      getAnswer: (questionId) => {
        return get().answers.find((a) => a.questionId === questionId)
      },

      bulkRestoreAnswers: (answers) =>
        set((state) => {
          const existingMap = new Map(state.answers.map((a) => [a.questionId, a]))
          for (const answer of answers) {
            existingMap.set(answer.questionId, answer)
          }
          return { answers: Array.from(existingMap.values()) }
        }),

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
          part1TimeRemaining: EXAM_CONFIG.PART1_DURATION_SECONDS,
          part2TimeRemaining: EXAM_CONFIG.PART2_DURATION_SECONDS,
          part1Completed: false,
          part2Completed: false,
          answers: [],
          currentQuestionIndex: 0,
          isFinished: false,
          serverTimeOffset: 0,
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

  return {
    ...store,
    isHydrated,
  }
}

export function useDebouncedAnswerSave(attemptId: number | null, debounceMs = 1000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRef = useRef<Map<number, Answer>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveError, setLastSaveError] = useState<string | null>(null)

  const flush = useCallback(async () => {
    if (!attemptId || pendingRef.current.size === 0) return

    const answers = Array.from(pendingRef.current.values())
    pendingRef.current.clear()

    setIsSaving(true)
    setLastSaveError(null)

    try {
      const response = await fetch("/api/student/save-answers-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer,
            imageUrls: a.imageUrls,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save answers")
      }
    } catch (e) {
      setLastSaveError(e instanceof Error ? e.message : "Save failed")
      // Re-add failed answers to pending
      for (const answer of answers) {
        pendingRef.current.set(answer.questionId, answer)
      }
    } finally {
      setIsSaving(false)
    }
  }, [attemptId])

  const queueAnswer = useCallback(
    (answer: Answer) => {
      pendingRef.current.set(answer.questionId, answer)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(flush, debounceMs)
    },
    [flush, debounceMs],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Flush any pending answers
      if (pendingRef.current.size > 0 && attemptId) {
        flush()
      }
    }
  }, [attemptId, flush])

  return { queueAnswer, flush, isSaving, lastSaveError, pendingCount: pendingRef.current.size }
}
