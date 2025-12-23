"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { EXAM_CONFIG } from "@/lib/constants"

interface TimerProps {
  attemptId: number
  part: "part1" | "part2"
  onTimeUp: () => void
  onTick?: (secondsRemaining: number) => void
  className?: string
}

export function Timer({ attemptId, part, onTimeUp, onTick, className }: TimerProps) {
  const [seconds, setSeconds] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const lastSyncRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const serverTimeOffsetRef = useRef<number>(0)

  const syncWithBackend = useCallback(async () => {
    const syncStartTime = Date.now()
    setIsSyncing(true)

    try {
      const response = await fetch(`/api/student/attempt-status?attemptId=${attemptId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch time")
      }

      const syncEndTime = Date.now()
      const roundTripTime = syncEndTime - syncStartTime
      const data = await response.json()

      // Calculate server time offset (accounting for network latency)
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime()
        serverTimeOffsetRef.current = serverTime - syncEndTime + roundTripTime / 2
      }

      const remaining = part === "part1" ? data.part1RemainingSeconds : data.part2RemainingSeconds
      const expired = part === "part1" ? data.part1Expired : data.part2Expired

      if (expired || remaining <= 0) {
        setSeconds(0)
        onTimeUp()
        return
      }

      setSeconds(remaining)
      lastSyncRef.current = Date.now()
      setError(null)
    } catch (err) {
      console.error("Timer sync error:", err)
      setError("Vaqtni yangilashda xatolik")
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }, [attemptId, part, onTimeUp])

  // Initial sync
  useEffect(() => {
    syncWithBackend()
  }, [syncWithBackend])

  useEffect(() => {
    const getSyncInterval = () => {
      if (seconds !== null && seconds < EXAM_CONFIG.LOW_TIME_THRESHOLD_SECONDS) {
        return 15000 // 15 seconds when time is low
      }
      return EXAM_CONFIG.TIMER_SYNC_INTERVAL_MS // 30 seconds normally
    }

    const scheduleSync = () => {
      syncIntervalRef.current = setInterval(() => {
        syncWithBackend()
      }, getSyncInterval())
    }

    scheduleSync()

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [syncWithBackend, seconds])

  // Local countdown (1 second interval)
  useEffect(() => {
    if (seconds === null || seconds <= 0) return

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev === null || prev <= 0) {
          return 0
        }
        const newValue = prev - 1
        if (newValue <= 0) {
          onTimeUp()
          return 0
        }
        onTick?.(newValue)
        return newValue
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [seconds !== null, onTimeUp, onTick])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [])

  const formatTime = useCallback((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }, [])

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg bg-muted", className)}>
        <Clock className="h-5 w-5 animate-pulse" />
        <span>--:--</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-sm bg-destructive/10 text-destructive cursor-pointer",
          className,
        )}
        onClick={syncWithBackend}
        title="Qayta sinab ko'rish uchun bosing"
      >
        <AlertTriangle className="h-4 w-4" />
        <span>Xatolik</span>
        <RefreshCw className="h-3 w-3" />
      </div>
    )
  }

  const displaySeconds = seconds ?? 0
  const isLowTime = displaySeconds < EXAM_CONFIG.LOW_TIME_THRESHOLD_SECONDS
  const isCritical = displaySeconds < EXAM_CONFIG.CRITICAL_TIME_THRESHOLD_SECONDS

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-semibold transition-colors",
        isLowTime && !isCritical && "bg-amber-100 text-amber-700",
        isCritical && "bg-red-100 text-red-700 animate-pulse",
        !isLowTime && "bg-muted text-foreground",
        isSyncing && "opacity-75",
        className,
      )}
    >
      <Clock className={cn("h-5 w-5", isSyncing && "animate-spin")} />
      <span>{formatTime(displaySeconds)}</span>
    </div>
  )
}
