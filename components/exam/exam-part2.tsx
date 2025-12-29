"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ExamHeader } from "./exam-header"
import { QuestionO2 } from "./question-o2"
import { Button } from "@/components/ui/button"
import { useExamStore } from "@/lib/exam-store"
import { ChevronLeft, ChevronRight, Flag, Loader2, WifiOff } from "lucide-react"
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
import { ExamSecurityWrapper } from "./exam-security-wrapper"

interface ExamResultData {
  finalScore: number
  certificateLevel: string
  scoreA: number
  scoreB: number
}

interface ExamPart2Props {
  examId: number
  attemptId: number
  examName?: string
  onComplete: (resultData: ExamResultData) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ExamPart2({ examId, attemptId, examName, onComplete }: ExamPart2Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const examStore = useExamStore()
  const autosaveRef = useRef<NodeJS.Timeout | null>(null)
  const answersRestoredRef = useRef(false)

  const {
    data: questions,
    isLoading,
    error: questionsError,
  } = useSWR(`/api/student/questions?examId=${examId}&part=2`, fetcher, { revalidateOnFocus: false })

  const currentQuestion = questions?.[currentIndex]
  const savedAnswer = examStore.getAnswer(currentQuestion?.id)

  useEffect(() => {
    if (answersRestoredRef.current) return

    const restoreAnswers = async () => {
      try {
        const response = await fetch(`/api/student/attempt-status?attemptId=${attemptId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.savedAnswers && data.savedAnswers.length > 0) {
            data.savedAnswers.forEach((sa: { questionId: number; answer: string; imageUrls?: string[] }) => {
              examStore.saveAnswer({
                questionId: sa.questionId,
                answer: sa.answer,
                imageUrls: sa.imageUrls,
              })
            })
          }
          answersRestoredRef.current = true
        }
      } catch (err) {
        console.error("Failed to restore answers:", err)
      }
    }

    restoreAnswers()
  }, [attemptId, examStore])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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
  }, [])

  useEffect(() => {
    autosaveRef.current = setInterval(async () => {
      const answers = examStore.answers.filter((a) => {
        const q = questions?.find((q: { id: number }) => q.id === a.questionId)
        return q?.question_number > 40
      })

      if (answers.length > 0) {
        try {
          const response = await fetch("/api/student/save-answers-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attemptId, answers }),
          })
          if (response.ok) {
            setNetworkError(false)
          } else {
            setNetworkError(true)
          }
        } catch {
          setNetworkError(true)
        }
      }
    }, 5000)

    return () => {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current)
      }
    }
  }, [attemptId, examStore.answers, questions])

  const handleAnswerChange = useCallback(
    (answer: string, imageUrls: string[]) => {
      if (!currentQuestion) return
      examStore.saveAnswer({
        questionId: currentQuestion.id,
        answer,
        imageUrls,
      })
    },
    [currentQuestion, examStore],
  )

  const handleTimeUp = useCallback(async () => {
    setShowTimeUpDialog(true)
  }, [])

  const handleTimeUpConfirm = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part2" }),
      })
      const data = await response.json()
      examStore.finishExam()
      setShowTimeUpDialog(false)
      onComplete({
        finalScore: data.finalScore ?? 0,
        certificateLevel: data.certificateLevel ?? "Fail",
        scoreA: data.scoreA ?? 0,
        scoreB: data.scoreB ?? 0,
      })
    } catch {
      setNetworkError(true)
      setIsSubmitting(false)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part2" }),
      })
      const data = await response.json()
      examStore.finishExam()
      setShowFinishDialog(false)
      onComplete({
        finalScore: data.finalScore ?? 0,
        certificateLevel: data.certificateLevel ?? "Fail",
        scoreA: data.scoreA ?? 0,
        scoreB: data.scoreB ?? 0,
      })
    } catch {
      setNetworkError(true)
      setIsSubmitting(false)
    }
  }

  const handleForceLeave = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/student/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, part: "part2" }),
      })
      const data = await response.json()
      examStore.finishExam()
      setShowLeaveWarning(false)
      onComplete({
        finalScore: data.finalScore ?? 0,
        certificateLevel: data.certificateLevel ?? "Fail",
        scoreA: data.scoreA ?? 0,
        scoreB: data.scoreB ?? 0,
      })
    } catch {
      setNetworkError(true)
      setIsSubmitting(false)
    }
  }

  const answeredQuestions = examStore.answers
    .filter((a) => a.imageUrls && a.imageUrls.length > 0)
    .map((a) => {
      const q = questions?.find((q: { id: number }) => q.id === a.questionId)
      return q ? questions.indexOf(q) : -1
    })
    .filter((i) => i >= 0)

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

  return (
    <ExamSecurityWrapper attemptId={attemptId} part="part2">
      <div className="min-h-screen bg-background pb-24">
        <ExamHeader
          title="41-43 Savollar"
          examName={examName}
          attemptId={attemptId}
          part="part2"
          onTimeUp={handleTimeUp}
        />

        {networkError && (
          <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Internet aloqasi yo'q. Javoblar saqlanmayapti.</span>
          </div>
        )}

        <div className="p-4 space-y-4">
          <div className="flex justify-center gap-2">
            {questions?.map((_: unknown, i: number) => (
              <Button
                key={i}
                variant={currentIndex === i ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentIndex(i)}
                className={answeredQuestions.includes(i) ? "bg-green-500 text-white hover:bg-green-600" : ""}
              >
                {41 + i}
              </Button>
            ))}
          </div>

          {currentQuestion && (
            <QuestionO2
              questionNumber={currentQuestion.question_number}
              text={currentQuestion.text}
              selectedAnswer={savedAnswer?.answer}
              selectedImages={savedAnswer?.imageUrls}
              onAnswerChange={handleAnswerChange}
            />
          )}
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

            {currentIndex === (questions?.length || 3) - 1 ? (
              <Button onClick={() => setShowFinishDialog(true)}>
                <Flag className="h-4 w-4 mr-1" />
                Imtihonni tugatish
              </Button>
            ) : (
              <Button onClick={() => setCurrentIndex((i) => Math.min((questions?.length || 3) - 1, i + 1))}>
                Keyingi
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Imtihonni tugatishni xohlaysizmi?</AlertDialogTitle>
              <AlertDialogDescription>
                {answeredQuestions.length} / {questions?.length || 3} savolga javob berildi. Tugatganingizdan keyin
                javoblarni o&apos;zgartira olmaysiz.
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
                Imtihon tugallanmagan. Agar sahifani tark etsangiz, imtihon tugatiladi va saqlanmagan javoblar
                yo&apos;qolishi mumkin. Davom etishni xohlaysizmi?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Imtihonga qaytish</AlertDialogCancel>
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
                  "Imtihonni tugatish va chiqish"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showTimeUpDialog} onOpenChange={() => {}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Vaqt tugadi!</AlertDialogTitle>
              <AlertDialogDescription>Imtihon vaqti tugadi. Javoblaringiz avtomatik saqlanadi.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleTimeUpConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  "Natijalarni ko'rish"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ExamSecurityWrapper>
  )
}
