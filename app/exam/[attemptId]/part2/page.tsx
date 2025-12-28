"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { Loader2 } from "lucide-react"
import { ExamPart2 } from "@/components/exam/exam-part2"
import { useExamStore } from "@/lib/exam-store"
import { useEffect, useRef } from "react"

interface AttemptStatus {
  attemptId: number
  examId: number
  examName: string
  studentId: number
  studentName: string
  testCode: string
  status: string
  part2Started: boolean
  part2Finished: boolean
  part2RemainingSeconds: number
}

interface ExamResultData {
  finalScore: number
  certificateLevel: string
  scoreA: number
  scoreB: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ExamPart2Page() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.attemptId as string
  const examStore = useExamStore()
  const initializedRef = useRef(false)

  const { data: attemptStatus, isLoading } = useSWR<AttemptStatus>(
    `/api/student/attempt-status?attemptId=${attemptId}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  // Initialize exam store with attempt data
  useEffect(() => {
    if (attemptStatus && !initializedRef.current) {
      examStore.setAttempt(
        attemptStatus.attemptId,
        attemptStatus.examId,
        attemptStatus.studentId,
        attemptStatus.testCode,
      )
      examStore.setStudentName(attemptStatus.studentName)
      if (attemptStatus.part2Started) {
        examStore.setCurrentPart("part2")
      }
      initializedRef.current = true
    }
  }, [attemptStatus, examStore])

  const handleComplete = (resultData: ExamResultData) => {
    examStore.completePart2()
    examStore.finishExam()
    // Store result in sessionStorage for the finish page
    sessionStorage.setItem(`exam_result_${attemptId}`, JSON.stringify(resultData))
    router.push(`/exam/${attemptId}/finish`)
  }

  if (isLoading || !attemptStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <ExamPart2
      examId={attemptStatus.examId}
      attemptId={attemptStatus.attemptId}
      examName={attemptStatus.examName}
      onComplete={handleComplete}
    />
  )
}
