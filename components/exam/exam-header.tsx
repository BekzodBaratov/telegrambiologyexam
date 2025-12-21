"use client"

import { Timer } from "@/components/ui/timer"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface ExamHeaderProps {
  title: string
  examName?: string
  attemptId: number
  part: "part1" | "part2"
  onTimeUp: () => void
  onBack?: () => void
  showBack?: boolean
}

export function ExamHeader({ title, examName, attemptId, part, onTimeUp, onBack, showBack = false }: ExamHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex flex-col">
            {examName && <span className="text-xs text-muted-foreground">{examName}</span>}
            <h1 className="font-semibold text-foreground">{title}</h1>
          </div>
        </div>
        <Timer attemptId={attemptId} part={part} onTimeUp={onTimeUp} />
      </div>
    </header>
  )
}
