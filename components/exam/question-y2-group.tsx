"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubQuestion {
  id: number
  text: string
  order_in_group: number
  question_number: number
}

interface QuestionY2GroupProps {
  groupId: number
  stem: string
  options: Record<string, string>
  subQuestions: SubQuestion[]
  imageUrl?: string | null
  savedAnswers?: Record<number, string>
  onAnswerChange: (questionId: number, answer: string) => void
  startDisplayNumber?: number
}

export function QuestionY2Group({
  groupId,
  stem,
  options,
  subQuestions,
  imageUrl,
  savedAnswers = {},
  onAnswerChange,
  startDisplayNumber = 1,
}: QuestionY2GroupProps) {
  const [answers, setAnswers] = useState<Record<number, string>>(savedAnswers)

  useEffect(() => {
    setAnswers(savedAnswers)
  }, [savedAnswers])

  const handleAnswerChange = (questionId: number, value: string) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    onAnswerChange(questionId, value)
  }

  // Sort sub-questions by order_in_group
  const sortedSubQuestions = [...subQuestions].sort((a, b) => a.order_in_group - b.order_in_group)

  const firstDisplayNumber = startDisplayNumber
  const lastDisplayNumber = startDisplayNumber + sortedSubQuestions.length - 1

  const optionEntries = Object.entries(options)
  const displayLabels = ["A", "B", "C", "D", "E", "F", "G", "H"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <span className="flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-purple-600 text-primary-foreground text-sm font-bold px-2">
            {firstDisplayNumber === lastDisplayNumber
              ? firstDisplayNumber
              : `${firstDisplayNumber}-${lastDisplayNumber}`}
          </span>
          <span className="text-base font-normal leading-relaxed">{stem}</span>
        </CardTitle>
        {imageUrl && (
          <div className="mt-4 ml-11">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Savol rasmi"
              className="max-h-64 rounded-lg border object-contain"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Options display with visual labels */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground mb-2">Variantlar:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {optionEntries.map(([key, value], index) => {
              const displayLabel = displayLabels[index] || key
              return (
                <div key={key} className="text-sm">
                  <span className="font-semibold">{displayLabel})</span> {value}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sub-questions with sequential display numbers */}
        <div className="space-y-4">
          {sortedSubQuestions.map((sq, index) => {
            const subDisplayNumber = startDisplayNumber + index
            return (
              <div
                key={sq.id}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                  answers[sq.id] ? "border-purple-300 bg-purple-50/50" : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                  {subDisplayNumber}
                </span>
                <span className="flex-1 text-sm">{sq.text}</span>
                <Select value={answers[sq.id] || ""} onValueChange={(value) => handleAnswerChange(sq.id, value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {optionEntries.map(([key], index) => {
                      const displayLabel = displayLabels[index] || key
                      return (
                        <SelectItem key={key} value={key}>
                          {displayLabel}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
