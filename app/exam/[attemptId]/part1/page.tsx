"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { Loader2 } from "lucide-react"
import { ExamPart1 } from "@/components/exam/exam-part1"
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
  part1Started: boolean
  part1Finished: boolean
  part1RemainingSeconds: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ExamPart1Page() {
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
      if (attemptStatus.part1Started) {
        examStore.setCurrentPart("part1")
      }
      initializedRef.current = true
    }
  }, [attemptStatus, examStore])

  const handleComplete = () => {
    examStore.completePart1()
    router.push(`/exam/${attemptId}/intro`)
  }

  if (isLoading || !attemptStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <ExamPart1
      examId={attemptStatus.examId}
      attemptId={attemptStatus.attemptId}
      examName={attemptStatus.examName}
      onComplete={handleComplete}
    />
  )
}
