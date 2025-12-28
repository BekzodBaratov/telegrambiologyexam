"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { useState, useEffect } from "react"
import { Loader2, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useExamStore } from "@/lib/exam-store"

interface AttemptStatus {
  attemptId: number
  examId: number
  examName: string
  studentId: number
  studentName: string
  status: string
  part1Finished: boolean
  part2Finished: boolean
}

interface ExamResultData {
  finalScore: number | null
  certificateLevel: string | null
  scoreA: number | null
  scoreB: number | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—"
  }
  return value.toFixed(1)
}

export default function ExamFinishPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.attemptId as string
  const examStore = useExamStore()
  const [result, setResult] = useState<ExamResultData | null>(null)

  const { data: attemptStatus, isLoading } = useSWR<AttemptStatus>(
    `/api/student/attempt-status?attemptId=${attemptId}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  // Try to get result from sessionStorage (set by part2 completion)
  useEffect(() => {
    const storedResult = sessionStorage.getItem(`exam_result_${attemptId}`)
    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult))
      } catch {
        // Ignore parse errors
      }
    }
  }, [attemptId])

  const handleNewExam = () => {
    examStore.reset()
    sessionStorage.removeItem(`exam_result_${attemptId}`)
    router.push("/")
  }

  if (isLoading || !attemptStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const getColors = (level: string | null) => {
    switch (level) {
      case "A+":
        return { bg: "bg-emerald-100", text: "text-emerald-700" }
      case "A":
        return { bg: "bg-green-100", text: "text-green-700" }
      case "B+":
        return { bg: "bg-blue-100", text: "text-blue-700" }
      case "B":
        return { bg: "bg-sky-100", text: "text-sky-700" }
      case "C":
        return { bg: "bg-amber-100", text: "text-amber-700" }
      default:
        return { bg: "bg-muted", text: "text-muted-foreground" }
    }
  }

  // Check if O2 grading is pending (no final result yet)
  const isPendingGrading = !result?.finalScore && !result?.certificateLevel

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 pt-8">
        {/* Completion Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Imtihon tugallandi!</h1>
            <p className="text-muted-foreground mt-1">{attemptStatus.examName}</p>
          </div>
        </div>

        {isPendingGrading ? (
          /* Pending O2 Grading */
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>Natijalar kutilmoqda</CardTitle>
              <CardDescription>
                Yozma javoblaringiz (41-43 savollar) o'qituvchi tomonidan baholanishi kerak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">O2 baholash kutilmoqda</p>
                    <p className="mt-1">
                      Yakuniy natija va sertifikat darajasi O2 savollari baholangandan so'ng ko'rsatiladi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Test savollari (1-40) natijasi saqlandi</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Final Results */
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Sizning natijangiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Certificate Level */}
              {result?.certificateLevel && (
                <div className={`text-center p-4 rounded-lg ${getColors(result.certificateLevel).bg}`}>
                  <p className="text-sm text-muted-foreground mb-1">Sertifikat darajasi</p>
                  <p className={`text-4xl font-bold ${getColors(result.certificateLevel).text}`}>
                    {result.certificateLevel}
                  </p>
                </div>
              )}

              {/* Final Score */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Yakuniy ball</p>
                <p className="text-3xl font-bold text-foreground">{formatScore(result?.finalScore)}</p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">1-40 savollar</p>
                  <p className="text-xl font-semibold text-foreground">{formatScore(result?.scoreA)}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">41-43 savollar</p>
                  <p className="text-xl font-semibold text-foreground">{formatScore(result?.scoreB)}</p>
                </div>
              </div>

              {/* Certificate Scale */}
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground text-center mb-2">Sertifikat shkalasi</p>
                <div className="grid grid-cols-4 gap-1 text-xs text-center">
                  <div className="bg-emerald-100 p-1 rounded">A+ (≥70)</div>
                  <div className="bg-green-100 p-1 rounded">A (65-69)</div>
                  <div className="bg-blue-100 p-1 rounded">B+ (60-64)</div>
                  <div className="bg-sky-100 p-1 rounded">B (55-59)</div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-center mt-1">
                  <div className="bg-amber-100 p-1 rounded">C (50-54)</div>
                  <div className="bg-gray-100 p-1 rounded">— (&lt;50)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <Button onClick={handleNewExam} className="w-full">
          Yangi test kodini kiritish
        </Button>
      </div>
    </div>
  )
}
