"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { useState } from "react"
import { Clock, FileText, Camera, Lock, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useExamStore } from "@/lib/exam-store"

interface AttemptStatus {
  attemptId: number
  examId: number
  examName: string
  studentId: number
  studentName: string
  testCode: string
  status: string
  part1Started: boolean
  part1Finished: boolean
  part1RemainingSeconds: number
  part1Expired: boolean
  part2Started: boolean
  part2Finished: boolean
  part2RemainingSeconds: number
  part2Expired: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ExamIntroPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.attemptId as string
  const examStore = useExamStore()
  const [isStartingPart1, setIsStartingPart1] = useState(false)
  const [isStartingPart2, setIsStartingPart2] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: attemptStatus, isLoading } = useSWR<AttemptStatus>(
    `/api/student/attempt-status?attemptId=${attemptId}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  const handleStartPart1 = async () => {
    setIsStartingPart1(true)
    setError(null)

    try {
      const response = await fetch("/api/student/start-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: Number(attemptId), part: "part1" }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.expired) {
          setError(data.message || "Vaqt tugadi")
          return
        }
        throw new Error(data.message || "Xatolik yuz berdi")
      }

      // Update store and navigate
      if (attemptStatus) {
        examStore.setAttempt(
          attemptStatus.attemptId,
          attemptStatus.examId,
          attemptStatus.studentId,
          attemptStatus.testCode,
        )
        examStore.setStudentName(attemptStatus.studentName)
      }
      examStore.startPart1()
      router.push(`/exam/${attemptId}/part1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsStartingPart1(false)
    }
  }

  const handleStartPart2 = async () => {
    setIsStartingPart2(true)
    setError(null)

    try {
      const response = await fetch("/api/student/start-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: Number(attemptId), part: "part2" }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.expired) {
          setError(data.message || "Vaqt tugadi")
          return
        }
        throw new Error(data.message || "Xatolik yuz berdi")
      }

      // Update store and navigate
      if (attemptStatus) {
        examStore.setAttempt(
          attemptStatus.attemptId,
          attemptStatus.examId,
          attemptStatus.studentId,
          attemptStatus.testCode,
        )
        examStore.setStudentName(attemptStatus.studentName)
      }
      examStore.startPart2()
      router.push(`/exam/${attemptId}/part2`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsStartingPart2(false)
    }
  }

  if (isLoading || !attemptStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const part1Completed = attemptStatus.part1Finished
  const part2Completed = attemptStatus.part2Finished
  const isPart2Disabled = !part1Completed

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{attemptStatus.examName || "Biologiya Imtihoni"}</h1>
          <p className="text-muted-foreground">Xush kelibsiz, {attemptStatus.studentName}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {/* Part 1 Card */}
          <Card className={part1Completed ? "border-green-500 bg-green-50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  1-40 Savollar
                </CardTitle>
                {part1Completed && (
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs text-white">Tugallangan</span>
                )}
              </div>
              <CardDescription>Test savollari va qisqa javoblar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>100 daqiqa</span>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>1-32:</strong> Tanlov testlari (Y1)
                </p>
                <p>
                  <strong>33-35:</strong> Moslashtirish (Y2)
                </p>
                <p>
                  <strong>36-40:</strong> Qisqa javoblar (O1)
                </p>
              </div>
              <Button onClick={handleStartPart1} className="w-full" disabled={part1Completed || isStartingPart1}>
                {isStartingPart1 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Boshlanmoqda...
                  </>
                ) : part1Completed ? (
                  "Tugallangan"
                ) : (
                  "Boshlash"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Part 2 Card */}
          <Card className={part2Completed ? "border-green-500 bg-green-50" : isPart2Disabled ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isPart2Disabled ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Camera className="h-5 w-5 text-primary" />
                  )}
                  41-43 Savollar
                </CardTitle>
                {part2Completed && (
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs text-white">Tugallangan</span>
                )}
              </div>
              <CardDescription>Yozma ishlar - rasm yuklash bilan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>80 daqiqa</span>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>41-43:</strong> Kengaytirilgan javoblar (O2)
                </p>
                <p className="text-muted-foreground">Har bir savol uchun rasm yuklash talab qilinadi</p>
              </div>
              {isPart2Disabled && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800">Avval 1-qismni tugatishingiz kerak</p>
                </div>
              )}
              <Button
                onClick={handleStartPart2}
                className="w-full"
                disabled={part2Completed || isPart2Disabled || isStartingPart2}
              >
                {isStartingPart2 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Boshlanmoqda...
                  </>
                ) : part2Completed ? (
                  "Tugallangan"
                ) : isPart2Disabled ? (
                  "Qulflangan"
                ) : (
                  "Boshlash"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {part1Completed && part2Completed && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6 text-center">
              <h3 className="text-lg font-semibold text-green-700">Imtihon tugallandi!</h3>
              <p className="text-green-600">Barcha qismlar muvaffaqiyatli topshirildi.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
