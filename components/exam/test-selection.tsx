"use client"

import { Clock, FileText, Camera, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TestSelectionProps {
  onSelectPart1: () => void
  onSelectPart2: () => void
  part1Completed?: boolean
  part2Completed?: boolean
  part1Started?: boolean
  studentName: string
  examName?: string
}

export function TestSelection({
  onSelectPart1,
  onSelectPart2,
  part1Completed = false,
  part2Completed = false,
  part1Started = false,
  studentName,
  examName,
}: TestSelectionProps) {
  const isPart2Disabled = !part1Completed && !part1Started

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{examName || "Biologiya Imtihoni"}</h1>
          <p className="text-muted-foreground">Xush kelibsiz, {studentName}</p>
        </div>

        <div className="grid gap-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              part1Completed ? "border-green-500 bg-green-50" : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  1-40 Savollar
                </CardTitle>
                {part1Completed && (
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs text-white">Tugallangan</span>
                )}
              </div>
              <CardDescription>Test savollari va qisqa javoblar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>100 daqiqa</span>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>1-32:</strong> Tanlov testlari (Y1)
                </p>
                <p>
                  <strong>33-35:</strong> Moslashtirish (Y2)
                </p>
                <p>
                  <strong>36-40:</strong> Qisqa javoblar (O1)
                </p>
              </div>
              <Button onClick={onSelectPart1} className="w-full" disabled={part1Completed}>
                {part1Completed ? "Tugallangan" : "Boshlash"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`transition-all ${
              part2Completed
                ? "border-green-500 bg-green-50"
                : isPart2Disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md"
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isPart2Disabled ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Camera className="h-5 w-5 text-primary" />
                  )}
                  41-43 Savollar
                </CardTitle>
                {part2Completed && (
                  <span className="rounded-full bg-green-500 px-3 py-1 text-xs text-white">Tugallangan</span>
                )}
              </div>
              <CardDescription>Yozma ishlar - rasm yuklash bilan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>80 daqiqa</span>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>41-43:</strong> Kengaytirilgan javoblar (O2)
                </p>
                <p className="text-muted-foreground">Har bir savol uchun rasm yuklash talab qilinadi</p>
              </div>
              {isPart2Disabled && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800">Avval 1-qismni tugatishingiz kerak</p>
                </div>
              )}
              <Button onClick={onSelectPart2} className="w-full" disabled={part2Completed || isPart2Disabled}>
                {part2Completed ? "Tugallangan" : isPart2Disabled ? "Qulflangan" : "Boshlash"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {part1Completed && part2Completed && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="pt-6 text-center">
              <h3 className="text-lg font-semibold text-green-700">Imtihon tugallandi!</h3>
              <p className="text-green-600">Barcha qismlar muvaffaqiyatli topshirildi.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
