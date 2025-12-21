"use client"

import { useState, useEffect } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuestionY1Props {
  questionNumber: number
  text: string
  options: Record<string, string>
  selectedAnswer?: string
  imageUrl?: string | null
  onAnswerChange: (answer: string) => void
}

export function QuestionY1({
  questionNumber,
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
    onAnswerChange(value)
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
        <RadioGroup value={selected} onValueChange={handleChange} className="space-y-3">
          {Object.entries(options).map(([key, value]) => (
            <div
              key={key}
              className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${
                selected === key ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value={key} id={`q${questionNumber}-${key}`} />
              <Label htmlFor={`q${questionNumber}-${key}`} className="flex-1 cursor-pointer text-sm">
                <span className="font-semibold">{key})</span> {value}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
