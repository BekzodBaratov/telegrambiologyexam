"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface QuestionO1Props {
  questionNumber: number
  text: string
  selectedAnswer?: string
  imageUrl?: string | null
  onAnswerChange: (answer: string) => void
}

export function QuestionO1({ questionNumber, text, selectedAnswer, imageUrl, onAnswerChange }: QuestionO1Props) {
  const [answer, setAnswer] = useState(selectedAnswer || "")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAnswer(selectedAnswer || "")
  }, [selectedAnswer])

  const validateNumeric = (value: string): boolean => {
    if (value === "" || value === "-") return true
    // Allow integers and decimals (including negative)
    const numericRegex = /^-?\d*\.?\d*$/
    return numericRegex.test(value)
  }

  const handleChange = (value: string) => {
    // Remove any non-numeric characters except . and -
    const cleanValue = value.replace(/[^0-9.-]/g, "")

    if (!validateNumeric(cleanValue)) {
      setError("Faqat raqam kiriting")
      return
    }

    // Prevent multiple decimal points
    if ((cleanValue.match(/\./g) || []).length > 1) {
      setError("Faqat bitta nuqta ishlatish mumkin")
      return
    }

    // Prevent multiple minus signs or minus not at start
    if (cleanValue.indexOf("-") > 0 || (cleanValue.match(/-/g) || []).length > 1) {
      setError("Minus faqat boshida bo'lishi mumkin")
      return
    }

    setError(null)
    setAnswer(cleanValue)
    onAnswerChange(cleanValue)
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
        <div className="space-y-2">
          <Label htmlFor={`answer-${questionNumber}`}>Javobingiz (faqat raqam)</Label>
          <Input
            id={`answer-${questionNumber}`}
            type="text"
            inputMode="decimal"
            value={answer}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Raqam kiriting..."
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
