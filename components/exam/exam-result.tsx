"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ExamResultProps {
  certificateLevel: string
  scoreA: number | null
  scoreB: number | null
  finalScore: number | null
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—"
  }
  return value.toFixed(2)
}

export function ExamResult({ certificateLevel, scoreA, scoreB, finalScore }: ExamResultProps) {
  const getColors = (level: string) => {
    switch (level) {
      case "A+":
        return { bg: "bg-emerald-100", text: "text-emerald-700" }
      case "A":
        return { bg: "bg-green-100", text: "text-green-700" }
      case "B+":
        return { bg: "bg-blue-100", text: "text-blue-700" }
      case "B":
        return { bg: "bg-sky-100", text: "text-sky-700" }
      case "C":
        return { bg: "bg-amber-100", text: "text-amber-700" }
      default:
        return { bg: "bg-muted", text: "text-muted-foreground" }
    }
  }

  const colors = getColors(certificateLevel)

  const safeScoreA = formatScore(scoreA)
  const safeScoreB = formatScore(scoreB)
  const safeFinalScore = formatScore(finalScore)

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Imtihon yakunlandi!</CardTitle>
        <CardDescription>Sizning natijangiz</CardDescription>
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
          <p className="text-3xl font-bold text-foreground">{safeFinalScore}</p>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">1-40 savollar</p>
            <p className="text-xl font-semibold text-foreground">{safeScoreA}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">41-43 savollar</p>
            <p className="text-xl font-semibold text-foreground">{safeScoreB}</p>
          </div>
        </div>

        {/* Formula explanation */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <p>Yakuniy ball = (1-qism + 2-qism) / 2</p>
          <p className="mt-1">
            ({safeScoreA} + {safeScoreB}) / 2 = {safeFinalScore}
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
          <div className="grid grid-cols-2 gap-1 text-xs text-center mt-1">
            <div className="bg-amber-100 p-1 rounded">C (50-54)</div>
            <div className="bg-gray-100 p-1 rounded">— (&lt;50)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
