"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
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
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    setAnswer(selectedAnswer || "")
    // Validate restored answer
    if (selectedAnswer) {
      const valid = validateNumericValue(selectedAnswer)
      setIsValid(valid)
      setError(valid ? null : "Noto'g'ri format")
    }
  }, [selectedAnswer])

  const validateNumericValue = useCallback((value: string): boolean => {
    if (value === "" || value === "-" || value === ".") return true
    // Allow integers and decimals (including negative)
    // Must be a valid number when parsed
    const numericRegex = /^-?\d*\.?\d*$/
    if (!numericRegex.test(value)) return false
    // Check it's actually parseable as a number (not just "-" or ".")
    if (value !== "-" && value !== "." && value !== "-.") {
      const parsed = Number.parseFloat(value)
      if (isNaN(parsed)) return false
    }
    return true
  }, [])

  const isCompleteNumber = useCallback((value: string): boolean => {
    if (value === "" || value === "-" || value === "." || value === "-.") return false
    const parsed = Number.parseFloat(value)
    return !isNaN(parsed) && isFinite(parsed)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value

    const cleanValue = rawValue.replace(/[^0-9.-]/g, "")

    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length
    if (decimalCount > 1) {
      setError("Faqat bitta nuqta ishlatish mumkin")
      setIsValid(false)
      return
    }

    // Prevent multiple minus signs or minus not at start
    const minusCount = (cleanValue.match(/-/g) || []).length
    if (minusCount > 1 || (minusCount === 1 && cleanValue.indexOf("-") !== 0)) {
      setError("Minus faqat boshida bo'lishi mumkin")
      setIsValid(false)
      return
    }

    // Validate the cleaned value
    if (!validateNumericValue(cleanValue)) {
      setError("Faqat raqam kiriting")
      setIsValid(false)
      return
    }

    setError(null)
    setAnswer(cleanValue)

    if (cleanValue === "" || isCompleteNumber(cleanValue)) {
      setIsValid(true)
      onAnswerChange(cleanValue)
    } else {
      // Still typing, don't submit incomplete numbers like "-" or "3."
      setIsValid(false)
    }
  }

  const handleBlur = () => {
    if (answer && !isCompleteNumber(answer)) {
      // If user leaves with incomplete number, clear it
      if (answer === "-" || answer === "." || answer === "-.") {
        setAnswer("")
        setError(null)
        setIsValid(true)
        onAnswerChange("")
      }
    }
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
            pattern="[0-9.\-]*"
            value={answer}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Raqam kiriting..."
            className={error || !isValid ? "border-destructive" : ""}
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && !isValid && answer && <p className="text-sm text-muted-foreground">Raqamni to'liq kiriting</p>}
        </div>
      </CardContent>
    </Card>
  )
}
