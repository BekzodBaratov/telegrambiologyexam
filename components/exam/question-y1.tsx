"use client"

import { useState, useEffect } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuestionY1Props {
  questionNumber: number
  questionId: number
  text: string
  options: Record<string, string>
  selectedAnswer?: string
  imageUrl?: string | null
  onAnswerChange: (answer: string, optionId: string) => void
}

export function QuestionY1({
  questionNumber,
  questionId,
  text,
  options,
  selectedAnswer,
  imageUrl,
  onAnswerChange,
}: QuestionY1Props) {
  const [selected, setSelected] = useState(selectedAnswer || "")

  useEffect(() => {
    setSelected(selectedAnswer || "")
  }, [selectedAnswer])

  const handleChange = (value: string) => {
    setSelected(value)
    // This ID is independent of display order and used for validation
    const optionId = `${questionId}_${value}`
    onAnswerChange(value, optionId)
  }

  // Display labels (A, B, C, D) are purely visual - actual key is sent to backend
  const optionEntries = Object.entries(options)
  const displayLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]

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
        <RadioGroup value={selected} onValueChange={handleChange} className="space-y-3">
          {optionEntries.map(([key, value], index) => {
            const displayLabel = displayLabels[index] || key
            return (
              <div
                key={key}
                className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${
                  selected === key ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={key} id={`q${questionNumber}-${key}`} />
                <Label htmlFor={`q${questionNumber}-${key}`} className="flex-1 cursor-pointer text-sm">
                  <span className="font-semibold">{displayLabel})</span> {value}
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
