"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

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
}

export function QuestionY2Group({
  groupId,
  stem,
  options,
  subQuestions,
  imageUrl,
  savedAnswers = {},
  onAnswerChange,
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
  const firstQuestionNumber = sortedSubQuestions[0]?.question_number || 0
  const lastQuestionNumber = sortedSubQuestions[sortedSubQuestions.length - 1]?.question_number || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <span className="flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-full bg-purple-600 text-primary-foreground text-sm font-bold px-2">
            {firstQuestionNumber === lastQuestionNumber
              ? firstQuestionNumber
              : `${firstQuestionNumber}-${lastQuestionNumber}`}
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
        {/* Options display */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm font-medium text-muted-foreground mb-2">Variantlar:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(options).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-semibold">{key})</span> {value}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-questions */}
        <div className="space-y-4">
          {sortedSubQuestions.map((sq) => (
            <div
              key={sq.id}
              className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                answers[sq.id] ? "border-purple-300 bg-purple-50/50" : ""
              }`}
            >
              <Badge variant="outline" className="shrink-0">
                {sq.order_in_group}
              </Badge>
              <span className="flex-1 text-sm">{sq.text}</span>
              <Select value={answers[sq.id] || ""} onValueChange={(value) => handleAnswerChange(sq.id, value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(options).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
