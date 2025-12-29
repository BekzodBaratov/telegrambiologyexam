"use client"

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface ExamSecurityWrapperProps {
  children: ReactNode
  attemptId: number
  part: "part1" | "part2"
}

/**
 * ExamSecurityWrapper - Frontend deterrent layer for exam security
 *
 * This component:
 * 1. Disables copy/cut/paste (except for O1/O2 inputs)
 * 2. Disables context menu
 * 3. Tracks visibility/focus changes and reports to backend
 * 4. Shows non-blocking warnings for suspicious activity
 *
 * NOTE: This is a DETERRENT layer. Real security is enforced by backend.
 */
export function ExamSecurityWrapper({ children, attemptId, part }: ExamSecurityWrapperProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastEventRef = useRef<string | null>(null)

  const sendActivityEvent = useCallback(
    async (event: "blur" | "hidden" | "focus") => {
      // Debounce: don't send same event within 1 second
      if (lastEventRef.current === event) return
      lastEventRef.current = event
      setTimeout(() => {
        if (lastEventRef.current === event) lastEventRef.current = null
      }, 1000)

      try {
        await fetch("/api/student/exam-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            part,
            event,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch {
        // Silently fail - don't disrupt exam for logging failures
      }
    },
    [attemptId, part],
  )

  const triggerWarning = useCallback(() => {
    setWarningCount((prev) => prev + 1)
    setShowWarning(true)

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(false)
    }, 5000)
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendActivityEvent("hidden")
        triggerWarning()
      } else {
        sendActivityEvent("focus")
      }
    }

    const handleBlur = () => {
      sendActivityEvent("blur")
      triggerWarning()
    }

    const handleFocus = () => {
      sendActivityEvent("focus")
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      triggerWarning()
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      triggerWarning()
    }

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      // Allow paste for O1 numeric inputs and O2 text areas
      const isAllowedInput =
        target.tagName === "INPUT" &&
        (target.getAttribute("type") === "number" || target.getAttribute("data-allow-paste") === "true")
      const isAllowedTextarea = target.tagName === "TEXTAREA" && target.getAttribute("data-allow-paste") === "true"

      if (!isAllowedInput && !isAllowedTextarea) {
        e.preventDefault()
        triggerWarning()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      triggerWarning()
    }

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("copy", handleCopy)
    document.addEventListener("cut", handleCut)
    document.addEventListener("paste", handlePaste)
    document.addEventListener("contextmenu", handleContextMenu)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("copy", handleCopy)
      document.removeEventListener("cut", handleCut)
      document.removeEventListener("paste", handlePaste)
      document.removeEventListener("contextmenu", handleContextMenu)

      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [sendActivityEvent, triggerWarning])

  return (
    <div
      className="select-none"
      style={{
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Imtihon davomida sahifani tark etish taqiqlanadi</span>
          {warningCount > 1 && <span className="text-sm opacity-80">({warningCount} marta)</span>}
        </div>
      )}

      {children}
    </div>
  )
}
