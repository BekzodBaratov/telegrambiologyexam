"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TelegramProvider, useTelegram } from "@/components/telegram-provider"
import { CodeEntry } from "@/components/exam/code-entry"
import { RegistrationForm } from "@/components/exam/registration-form"
import { useExamStore } from "@/lib/exam-store"
import { Loader2 } from "lucide-react"

type Step = "loading" | "registration" | "code"

function ExamContent() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("loading")
  const [isLoading, setIsLoading] = useState(true)
  const [localStudentId, setLocalStudentId] = useState<number | null>(null)
  const [localStudentName, setLocalStudentName] = useState<string | null>(null)
  const examStore = useExamStore()
  const { telegramId, isReady: telegramReady, authStatus, studentId, studentName, refreshAuth } = useTelegram()

  useEffect(() => {
    if (!examStore.isHydrated || !telegramReady) {
      return
    }

    // Wait for auth check to complete - NEVER redirect while loading
    if (authStatus === "loading") {
      return
    }

    const handleRouting = async () => {
      // Check for active attempt first - redirect to exam flow
      if (examStore.attemptId) {
        try {
          const response = await fetch(`/api/student/attempt-status?attemptId=${examStore.attemptId}`)
          if (response.ok) {
            const data = await response.json()

            if (data.status === "completed") {
              // Exam completed, reset and continue to code entry
              examStore.reset()
            } else {
              // Active attempt exists - redirect to exam flow
              router.push(`/exam/${examStore.attemptId}/intro`)
              return
            }
          } else {
            examStore.reset()
          }
        } catch (err) {
          console.error("Failed to check attempt:", err)
          examStore.reset()
        }
      }

      if (authStatus === "authenticated") {
        setLocalStudentId(studentId)
        setLocalStudentName(studentName)
        setStep("code")
      } else {
        setStep("registration")
      }
      setIsLoading(false)
    }

    handleRouting()
  }, [examStore.isHydrated, telegramReady, authStatus, studentId, studentName, examStore.attemptId, examStore, router])

  const handleRegistrationComplete = async (newStudentId: number, fullName: string) => {
    setLocalStudentId(newStudentId)
    setLocalStudentName(fullName)
    await refreshAuth()
    setStep("code")
  }

  const handleCodeSubmit = async (code: string) => {
    const sId = localStudentId || studentId
    if (!sId || !telegramId) {
      throw new Error("Talaba ma'lumotlari topilmadi")
    }

    // Validate code
    const validateResponse = await fetch("/api/student/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })

    if (!validateResponse.ok) {
      const error = await validateResponse.json()
      throw new Error(error.message || "Noto'g'ri kod")
    }

    // Check if already taken
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

    // Start attempt
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

    // Update store
    examStore.setAttempt(data.attemptId, data.examId, data.studentId, code)
    examStore.setStudentName(localStudentName || studentName || "Student")

    // Navigate to exam intro
    router.push(`/exam/${data.attemptId}/intro`)
  }

  if (isLoading || !examStore.isHydrated || step === "loading" || authStatus === "loading") {
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
      {step === "code" && <CodeEntry onSubmit={handleCodeSubmit} studentName={localStudentName || studentName} />}
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
