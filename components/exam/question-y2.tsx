"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QuestionY2Props {
  questionNumber: number
  text: string
  leftItems: string[]
  rightItems: string[]
  selectedMatches?: Record<string, string>
  imageUrl?: string | null
  onAnswerChange: (matches: Record<string, string>) => void
}

export function QuestionY2({
  questionNumber,
  text,
  leftItems,
  rightItems,
  selectedMatches,
  imageUrl,
  onAnswerChange,
}: QuestionY2Props) {
  const [matches, setMatches] = useState<Record<string, string>>(selectedMatches || {})

  useEffect(() => {
    setMatches(selectedMatches || {})
  }, [selectedMatches])

  const handleMatchChange = (leftItem: string, rightItem: string) => {
    const newMatches = { ...matches, [leftItem]: rightItem }
    setMatches(newMatches)
    onAnswerChange(newMatches)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {questionNumber}
          </span>
          <span className="text-base font-normal leading-relaxed">{text}</span>
        </CardTitle>
        {imageUrl && (
          <div className="mt-4 ml-11">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={`${questionNumber}-savol rasmi`}
              className="max-h-64 rounded-lg border object-contain"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Chap tomondagi har bir element uchun mos javobni tanlang</p>
          <div className="space-y-3">
            {leftItems.map((leftItem, index) => (
              <div key={index} className="flex items-center gap-4 rounded-lg border p-3">
                <span className="min-w-[120px] font-medium">{leftItem}</span>
                <Select value={matches[leftItem] || ""} onValueChange={(value) => handleMatchChange(leftItem, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Javobni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {rightItems.map((rightItem, idx) => (
                      <SelectItem key={idx} value={rightItem}>
                        {rightItem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
