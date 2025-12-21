"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, XCircle } from "lucide-react"

interface ExamResultProps {
  finalScore: number
  certificateLevel: string
  scoreA: number
  scoreB: number
  onNewExam: () => void
}

const certificateColors: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-500" },
  A: { bg: "bg-green-50", text: "text-green-700", border: "border-green-500" },
  "B+": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-500" },
  B: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-500" },
  "C+": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-500" },
  C: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-500" },
  Fail: { bg: "bg-red-50", text: "text-red-700", border: "border-red-500" },
}

export function ExamResult({ finalScore, certificateLevel, scoreA, scoreB, onNewExam }: ExamResultProps) {
  const colors = certificateColors[certificateLevel] || certificateColors["Fail"]
  const isPassed = certificateLevel !== "Fail"

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className={`w-full max-w-md border-2 ${colors.border}`}>
        <CardHeader className={`text-center ${colors.bg}`}>
          <div className="flex justify-center mb-4">
            {isPassed ? (
              <div className="rounded-full bg-white p-4 shadow-md">
                <Award className={`h-12 w-12 ${colors.text}`} />
              </div>
            ) : (
              <div className="rounded-full bg-white p-4 shadow-md">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{isPassed ? "Tabriklaymiz!" : "Imtihon tugallandi"}</CardTitle>
          <p className="text-muted-foreground mt-1">
            {isPassed ? "Siz imtihondan muvaffaqiyatli o'tdingiz" : "Afsuski, imtihondan o'ta olmadingiz"}
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Certificate Level */}
          <div className={`text-center p-4 rounded-lg ${colors.bg}`}>
            <p className="text-sm text-muted-foreground mb-1">Sertifikat darajasi</p>
            <p className={`text-4xl font-bold ${colors.text}`}>{certificateLevel}</p>
          </div>

          {/* Final Score */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Yakuniy ball</p>
            <p className="text-3xl font-bold text-foreground">{finalScore.toFixed(2)}</p>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">1-40 savollar</p>
              <p className="text-xl font-semibold text-foreground">{scoreA.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">41-43 savollar</p>
              <p className="text-xl font-semibold text-foreground">{scoreB.toFixed(2)}</p>
            </div>
          </div>

          {/* Formula explanation */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>Yakuniy ball = (1-qism + 2-qism) / 2</p>
            <p className="mt-1">
              ({scoreA.toFixed(2)} + {scoreB.toFixed(2)}) / 2 = {finalScore.toFixed(2)}
            </p>
          </div>

          {/* Certificate Scale */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center mb-2">Sertifikat shkalasi</p>
            <div className="grid grid-cols-4 gap-1 text-xs text-center">
              <div className="bg-emerald-100 p-1 rounded">A+ (≥70)</div>
              <div className="bg-green-100 p-1 rounded">A (65-69)</div>
              <div className="bg-blue-100 p-1 rounded">B+ (60-64)</div>
              <div className="bg-sky-100 p-1 rounded">B (55-59)</div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs text-center mt-1">
              <div className="bg-yellow-100 p-1 rounded">C+ (50-54)</div>
              <div className="bg-orange-100 p-1 rounded">C (46-49)</div>
              <div className="bg-red-100 p-1 rounded">Fail ({"<"}46)</div>
            </div>
          </div>

          <Button onClick={onNewExam} className="w-full mt-4">
            Yangi test kodini kiritish
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
