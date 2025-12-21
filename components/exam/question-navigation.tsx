"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface QuestionNavigationProps {
  totalQuestions: number
  currentIndex: number
  answeredQuestions: number[]
  onNavigate: (index: number) => void
}

export function QuestionNavigation({
  totalQuestions,
  currentIndex,
  answeredQuestions,
  onNavigate,
}: QuestionNavigationProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
      {Array.from({ length: totalQuestions }, (_, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-9 p-0 font-medium",
            currentIndex === i && "ring-2 ring-primary ring-offset-2",
            answeredQuestions.includes(i) && "bg-green-500 text-white hover:bg-green-600 border-green-500",
          )}
          onClick={() => onNavigate(i)}
        >
          {i + 1}
        </Button>
      ))}
    </div>
  )
}
