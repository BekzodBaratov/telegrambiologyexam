"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import useSWR from "swr"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  serverTime: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ExamAttemptLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const attemptId = params.attemptId as string
  const [isValidating, setIsValidating] = useState(true)

  const {
    data: attemptStatus,
    error,
    isLoading,
  } = useSWR<AttemptStatus>(attemptId ? `/api/student/attempt-status?attemptId=${attemptId}` : null, fetcher, {
    revalidateOnFocus: false,
  })

  useEffect(() => {
    if (isLoading || !attemptStatus) return

    const currentRoute = pathname.split("/").pop()
    let correctRoute: string | null = null

    // Determine the correct route based on attempt status
    if (attemptStatus.status === "completed") {
      correctRoute = "finish"
    } else if (attemptStatus.part2Started && !attemptStatus.part2Finished) {
      if (attemptStatus.part2Expired) {
        correctRoute = "finish"
      } else {
        correctRoute = "part2"
      }
    } else if (attemptStatus.part1Started && !attemptStatus.part1Finished) {
      if (attemptStatus.part1Expired) {
        // Part 1 expired but not finished - should go to selection or part2
        correctRoute = "intro"
      } else {
        correctRoute = "part1"
      }
    } else if (attemptStatus.part1Finished && !attemptStatus.part2Started) {
      // Part 1 done, can start part 2
      correctRoute = "intro"
    } else if (!attemptStatus.part1Started) {
      // Fresh attempt - show intro
      correctRoute = "intro"
    }

    // Redirect if on wrong route
    if (correctRoute && currentRoute !== correctRoute) {
      router.replace(`/exam/${attemptId}/${correctRoute}`)
    } else {
      setIsValidating(false)
    }
  }, [attemptStatus, isLoading, pathname, attemptId, router])

  // Loading state
  if (isLoading || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !attemptStatus) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-destructive">Xatolik</h1>
          <p className="text-muted-foreground">
            {error?.message || "Imtihon ma'lumotlarini yuklashda xatolik yuz berdi"}
          </p>
        </div>
        <Button onClick={() => router.push("/")}>Bosh sahifaga qaytish</Button>
      </div>
    )
  }

  return <>{children}</>
}
