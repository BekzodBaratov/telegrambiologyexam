"use client"

import { useState, useEffect, useCallback } from "react"
import { TelegramProvider, useTelegram } from "@/components/telegram-provider"
import { CodeEntry } from "@/components/exam/code-entry"
import { RegistrationForm } from "@/components/exam/registration-form"
import { TestSelection } from "@/components/exam/test-selection"
import { useExamStore } from "@/lib/exam-store"
import { ExamPart1 } from "@/components/exam/exam-part1"
import { ExamPart2 } from "@/components/exam/exam-part2"
import { ExamResult } from "@/components/exam/exam-result"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Step = "loading" | "registration" | "code" | "selection" | "part1" | "part2" | "result" | "finished"

interface ExamResultData {
  finalScore: number
  certificateLevel: string
  scoreA: number
  scoreB: number
}

function ExamContent() {
  const [step, setStep] = useState<Step>("loading")
  const [isLoading, setIsLoading] = useState(true)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)
  const [examName, setExamName] = useState<string | null>(null)
  const [examResult, setExamResult] = useState<ExamResultData | null>(null)
  const examStore = useExamStore()
  const { telegramId, isReady: telegramReady } = useTelegram()

  useEffect(() => {
    if (!examStore.isHydrated || !telegramReady || !telegramId) {
      return
    }

    const checkStudentStatus = async () => {
      if (examStore.attemptId) {
        try {
          const response = await fetch(`/api/student/attempt-status?attemptId=${examStore.attemptId}`)
          if (response.ok) {
            const data = await response.json()

            if (data.status === "completed") {
              examStore.reset()
              await checkRegistration()
              return
            }

            setExamName(data.examName)
            setStudentName(data.studentName)
            setStudentId(data.studentId)

            if (data.part2Finished) {
              examStore.reset()
              await checkRegistration()
            } else if (data.part2Started && !data.part2Expired) {
              setStep("part2")
            } else if (data.part1Finished) {
              setStep("selection")
            } else if (data.part1Started && !data.part1Expired) {
              setStep("part1")
            } else {
              setStep("selection")
            }
            setIsLoading(false)
            return
          } else {
            examStore.reset()
          }
        } catch (err) {
          console.error("Failed to restore attempt:", err)
          examStore.reset()
        }
      }

      await checkRegistration()
    }

    const checkRegistration = async () => {
      try {
        const response = await fetch("/api/student/check-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.registered && data.verified) {
            setStudentId(data.studentId)
            setStudentName(data.fullName)
            setStep("code")
          } else {
            setStep("registration")
          }
        } else {
          setStep("registration")
        }
      } catch (err) {
        console.error("Failed to check registration:", err)
        setStep("registration")
      }
      setIsLoading(false)
    }

    checkStudentStatus()
  }, [examStore.isHydrated, telegramReady, telegramId, examStore.attemptId, examStore])

  const handleRegistrationComplete = async (newStudentId: number, fullName: string) => {
    setStudentId(newStudentId)
    setStudentName(fullName)
    setStep("code")
  }

  const handleCodeSubmit = async (code: string) => {
    if (!studentId || !telegramId) {
      throw new Error("Talaba ma'lumotlari topilmadi")
    }

    const validateResponse = await fetch("/api/student/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })

    if (!validateResponse.ok) {
      const error = await validateResponse.json()
      throw new Error(error.message || "Noto'g'ri kod")
    }

    const checkResponse = await fetch("/api/student/check-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, code }),
    })

    if (checkResponse.ok) {
      const checkData = await checkResponse.json()
      if (checkData.alreadyTaken) {
        throw new Error("Siz bu testni allaqachon topshirgansiz")
      }
    }

    await startExamAttempt(code, studentId, studentName || "Student")
  }

  const startExamAttempt = async (code: string, sId: number, sName: string) => {
    const response = await fetch("/api/student/start-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, telegramId, studentId: sId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Imtihonni boshlashda xatolik")
    }

    const data = await response.json()
    examStore.setAttempt(data.attemptId, data.examId, data.studentId, code)
    examStore.setStudentName(sName)
    setExamName(data.examName)
    setStep("selection")
  }

  const handleSelectPart1 = useCallback(async () => {
    if (!examStore.attemptId) return

    try {
      const response = await fetch("/api/student/start-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: examStore.attemptId, part: "part1" }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.expired) {
          alert(error.message || "Vaqt tugadi")
          return
        }
        throw new Error(error.message)
      }

      examStore.startPart1()
      setStep("part1")
    } catch (err) {
      console.error("Failed to start part 1:", err)
      alert("Xatolik yuz berdi")
    }
  }, [examStore])

  const handleSelectPart2 = useCallback(async () => {
    if (!examStore.attemptId) return

    try {
      const response = await fetch("/api/student/start-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: examStore.attemptId, part: "part2" }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.expired) {
          alert(error.message || "Vaqt tugadi")
          return
        }
        throw new Error(error.message)
      }

      examStore.startPart2()
      setStep("part2")
    } catch (err) {
      console.error("Failed to start part 2:", err)
      alert("Xatolik yuz berdi")
    }
  }, [examStore])

  const handlePart1Complete = useCallback(() => {
    examStore.completePart1()
    setStep("selection")
  }, [examStore])

  const handlePart2CompleteWithResult = useCallback(
    (resultData: ExamResultData) => {
      examStore.completePart2()
      setExamResult(resultData)
      setStep("result")
    },
    [examStore],
  )

  const handleReturnToCodeEntry = useCallback(() => {
    examStore.reset()
    setExamName(null)
    setExamResult(null)
    setStep("code")
  }, [examStore])

  if (isLoading || !examStore.isHydrated || step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {step === "registration" && telegramId && (
        <RegistrationForm telegramId={telegramId} onComplete={handleRegistrationComplete} />
      )}
      {step === "code" && <CodeEntry onSubmit={handleCodeSubmit} studentName={studentName} />}
      {step === "selection" && (
        <TestSelection
          onSelectPart1={handleSelectPart1}
          onSelectPart2={handleSelectPart2}
          studentName={examStore.studentName || studentName || "Student"}
          examName={examName || undefined}
          part1Completed={examStore.part1Completed}
          part2Completed={examStore.part2Completed}
          part1Started={examStore.part1StartTime !== null}
        />
      )}
      {step === "part1" && examStore.examId && (
        <ExamPart1
          examId={examStore.examId}
          attemptId={examStore.attemptId!}
          examName={examName || undefined}
          onComplete={handlePart1Complete}
        />
      )}
      {step === "part2" && examStore.examId && (
        <ExamPart2
          examId={examStore.examId}
          attemptId={examStore.attemptId!}
          examName={examName || undefined}
          onComplete={handlePart2CompleteWithResult}
        />
      )}
      {step === "result" && examResult && (
        <ExamResult
          finalScore={examResult.finalScore}
          certificateLevel={examResult.certificateLevel}
          scoreA={examResult.scoreA}
          scoreB={examResult.scoreB}
          onNewExam={handleReturnToCodeEntry}
        />
      )}
      {step === "finished" && (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <div className="rounded-full bg-green-100 p-6 mb-4">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Imtihon tugallandi!</h1>
          <p className="text-muted-foreground mb-6">Javoblaringiz muvaffaqiyatli saqlandi.</p>
          <Button onClick={handleReturnToCodeEntry}>Yangi test kodini kiritish</Button>
        </div>
      )}
    </main>
  )
}

export default function ExamPage() {
  return (
    <TelegramProvider>
      <ExamContent />
    </TelegramProvider>
  )
}
