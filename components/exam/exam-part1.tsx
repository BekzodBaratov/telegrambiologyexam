"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { ExamHeader } from "./exam-header"
import { QuestionNavigation } from "./question-navigation"
import { QuestionY1 } from "./question-y1"
import { QuestionY2Group } from "./question-y2-group"
import { QuestionO1 } from "./question-o1"
import { Button } from "@/components/ui/button"
import { useExamStore, useDebouncedAnswerSave } from "@/lib/exam-store"
import { ChevronLeft, ChevronRight, Flag, Loader2, WifiOff, CloudOff } from "lucide-react"
import useSWR from "swr"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ErrorBoundary } from "@/components/error-boundary"

interface ExamPart1Props {
  examId: number
  attemptId: number
  examName?: string
  onComplete: () => void
  onTimeExpired?: () => void
}

interface Question {
  id: number
  question_number: number
  text: string
  options: Record<string, string>
  correct_answer: string
  image_url?: string
  group_id: number | null
  order_in_group: number | null
  question_type: {
    code: string
    description: string
  }
}

interface QuestionGroup {
  id: number
  stem: string
  options: Record<string, string>
  subQuestions: Question[]
}

interface DisplayItem {
  type: "question" | "group"
  data: Question | QuestionGroup
  displayNumber: number
  displayNumberEnd?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function ExamPart1Content({ examId, attemptId, examName, onComplete, onTimeExpired }: ExamPart1Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const examStore = useExamStore()
  const answersRestoredRef = useRef(false)

  const { queueAnswer, flush, isSaving, lastSaveError, pendingCount } = useDebouncedAnswerSave(attemptId)

  const {
    data: questions,
    isLoading,
    error: questionsError,
  } = useSWR<Question[]>(`/api/student/questions?examId=${examId}&part=1&attemptId=${attemptId}`, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
  })

  const displayItems: DisplayItem[] = useMemo(() => {
    if (!questions) return []

    const items: DisplayItem[] = []
    const processedGroupIds = new Set<number>()
    let displayNumber = 1

    for (const q of questions) {
      if (q.group_id !== null) {
        if (processedGroupIds.has(q.group_id)) continue
        processedGroupIds.add(q.group_id)

        const groupQuestions = questions.filter((gq) => gq.group_id === q.group_id)
        const startNumber = displayNumber
        displayNumber += groupQuestions.length

        items.push({
          type: "group",
          data: {
            id: q.group_id,
            stem: groupQuestions[0]?.text || "",
            options: q.options || {},
            subQuestions: groupQuestions,
          } as QuestionGroup,
          displayNumber: startNumber,
          displayNumberEnd: displayNumber - 1,
        })
      } else {
        items.push({
          type: "question",
          data: q,
          displayNumber: displayNumber,
        })
        displayNumber++
      }
    }

    return items
  }, [questions])

  const currentItem = displayItems[currentIndex]

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush pending answers before leaving
      if (pendingCount > 0) {
        flush()
      }
      e.preventDefault()
      e.returnValue = "Test tugallanmagan. Sahifani tark etmoqchimisiz?"
      return e.returnValue
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      setShowLeaveWarning(true)
      window.history.pushState(null, "", window.location.href)
    }

    window.history.pushState(null, "", window.location.href)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [pendingCount, flush])

  useEffect(() => {
    if (answersRestoredRef.current) return

    const restoreAnswers = async () => {
      try {
        const response = await fetch(`/api/student/attempt-status?attemptId=${attemptId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.savedAnswers && data.savedAnswers.length > 0) {
            // Use bulk restore for efficiency
            examStore.bulkRestoreAnswers(
              data.savedAnswers.map((sa: { questionId: number; answer: string; imageUrls?: string[] }) => ({
                questionId: sa.questionId,
                answer: sa.answer,
                imageUrls: sa.imageUrls,
              })),
            )
          }
          answersRestoredRef.current = true
        }
      } catch (err) {
        console.error("Failed to restore answers:", err)
      }
    }

    restoreAnswers()
  }, [attemptId, examStore])

  const handleAnswerChange = useCallback(
    (questionId: number, answer: string, optionId?: string) => {
      const answerData = { questionId, answer, selectedOptionId: optionId }
      examStore.saveAnswer(answerData)
      queueAnswer(answerData)
    },
    [examStore, queueAnswer],
  )

  const handleTimeUp = useCallback(async () => {
    // Flush any pending answers before time up
    await flush()
    setShowTimeUpDialog(true)
  }, [flush])

  const handleTimeUpConfirm = async () => {
    setIsSubmitting(true)
    try {
      await flush() // Ensure all answers are saved
      await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part1" }),
      })
      setShowTimeUpDialog(false)
      onComplete()
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      await flush() // Ensure all answers are saved
      await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part1" }),
      })
      setShowFinishDialog(false)
      onComplete()
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleForceLeave = async () => {
    setIsSubmitting(true)
    try {
      await flush() // Ensure all answers are saved
      await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part1" }),
      })
      setShowLeaveWarning(false)
      onComplete()
    } catch {
      setIsSubmitting(false)
    }
  }

  const answeredIndices = useMemo(() => {
    const indices: number[] = []
    displayItems.forEach((item, index) => {
      if (item.type === "question") {
        const q = item.data as Question
        const answer = examStore.getAnswer(q.id)
        if (answer?.answer) {
          indices.push(index)
        }
      } else {
        const group = item.data as QuestionGroup
        const allAnswered = group.subQuestions.every((sq) => {
          const answer = examStore.getAnswer(sq.id)
          return answer?.answer
        })
        if (allAnswered) {
          indices.push(index)
        }
      }
    })
    return indices
  }, [displayItems, examStore])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (questionsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
        <p className="text-center text-muted-foreground">Savollarni yuklashda xatolik yuz berdi</p>
        <Button onClick={() => window.location.reload()}>Qayta urinish</Button>
      </div>
    )
  }

  const renderItem = () => {
    if (!currentItem) return null

    if (currentItem.type === "question") {
      const question = currentItem.data as Question
      const questionType = question.question_type?.code
      const savedAnswer = examStore.getAnswer(question.id)

      if (questionType === "Y1") {
        return (
          <QuestionY1
            questionNumber={currentItem.displayNumber}
            questionId={question.id}
            text={question.text}
            options={question.options || {}}
            selectedAnswer={savedAnswer?.answer}
            imageUrl={question.image_url}
            onAnswerChange={(answer, optionId) => handleAnswerChange(question.id, answer, optionId)}
          />
        )
      }

      if (questionType === "O1") {
        return (
          <QuestionO1
            questionNumber={currentItem.displayNumber}
            text={question.text}
            selectedAnswer={savedAnswer?.answer}
            imageUrl={question.image_url}
            onAnswerChange={(answer, optionId) => handleAnswerChange(question.id, answer, optionId)}
          />
        )
      }

      return null
    }

    if (currentItem.type === "group") {
      const group = currentItem.data as QuestionGroup

      const savedAnswers: Record<number, string> = {}
      group.subQuestions.forEach((sq) => {
        const answer = examStore.getAnswer(sq.id)
        if (answer?.answer) {
          savedAnswers[sq.id] = answer.answer
        }
      })

      return (
        <QuestionY2Group
          groupId={group.id}
          stem={group.stem}
          options={group.options}
          subQuestions={group.subQuestions}
          savedAnswers={savedAnswers}
          onAnswerChange={handleAnswerChange}
          startDisplayNumber={currentItem.displayNumber}
        />
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <ExamHeader
        title="1-40 Savollar"
        examName={examName}
        attemptId={attemptId}
        part="part1"
        onTimeUp={handleTimeUp}
      />

      {(!isOnline || lastSaveError || isSaving || pendingCount > 0) && (
        <div
          className={`border-b px-4 py-2 text-sm flex items-center gap-2 ${
            !isOnline || lastSaveError
              ? "bg-amber-100 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {!isOnline ? (
            <>
              <CloudOff className="h-4 w-4" />
              <span>Internet aloqasi yo'q. Javoblar saqlanmayapti.</span>
            </>
          ) : lastSaveError ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Javoblarni saqlashda xatolik. Qayta urinilmoqda...</span>
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saqlanmoqda...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{pendingCount} ta javob saqlanmoqda...</span>
            </>
          ) : null}
        </div>
      )}

      <div className="p-4 space-y-4">
        <QuestionNavigation
          totalQuestions={displayItems.length}
          currentIndex={currentIndex}
          answeredQuestions={answeredIndices}
          onNavigate={setCurrentIndex}
        />

        {renderItem()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Oldingi
          </Button>

          {currentIndex === displayItems.length - 1 ? (
            <Button onClick={() => setShowFinishDialog(true)}>
              <Flag className="h-4 w-4 mr-1" />
              Tugatish
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex((i) => Math.min(displayItems.length - 1, i + 1))}>
              Keyingi
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Testni tugatishni xohlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {answeredIndices.length} / {displayItems.length} savolga javob berildi. Tugatganingizdan keyin javoblarni
              o&apos;zgartira olmaysiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Tugatish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Diqqat!</AlertDialogTitle>
            <AlertDialogDescription>
              Test tugallanmagan. Agar sahifani tark etsangiz, test tugatiladi va saqlanmagan javoblar yo&apos;qolishi
              mumkin. Davom etishni xohlaysizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Testga qaytish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceLeave}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tugatilmoqda...
                </>
              ) : (
                "Testni tugatish va chiqish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showTimeUpDialog} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Vaqt tugadi!</AlertDialogTitle>
            <AlertDialogDescription>Test vaqti tugadi. Javoblaringiz avtomatik saqlanadi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleTimeUpConfirm} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Davom etish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function ExamPart1(props: ExamPart1Props) {
  return (
    <ErrorBoundary>
      <ExamPart1Content {...props} />
    </ErrorBoundary>
  )
}
