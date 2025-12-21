"use client"

import { useState } from "react"
import useSWR from "swr"
import { Calculator, Loader2, Download, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface RaschQuestionResult {
  questionId: number
  questionNumber: number
  questionType: string
  questionText: string
  totalAttempts: number
  correctAttempts: number
  correctPercent: number
  raschBall: number
}

function getRaschBadgeVariant(raschBall: number): "default" | "secondary" | "destructive" | "outline" {
  if (raschBall <= -3) return "default" // Easy - green/default
  if (raschBall <= -1) return "secondary" // Moderate-easy
  if (raschBall <= 1) return "outline" // Medium
  return "destructive" // Hard
}

function getRaschLabel(raschBall: number): string {
  if (raschBall === -4) return "Juda oson"
  if (raschBall === -3) return "Oson"
  if (raschBall === -2) return "O'rtacha oson"
  if (raschBall === -1) return "Biroz oson"
  if (raschBall === 0) return "O'rtacha"
  if (raschBall === 1) return "Biroz qiyin"
  if (raschBall === 2) return "O'rtacha qiyin"
  if (raschBall === 3) return "Qiyin"
  return "Juda qiyin"
}

export function RaschCalculator() {
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [isCalculating, setIsCalculating] = useState(false)
  const [results, setResults] = useState<RaschQuestionResult[] | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<{ processed: number; skipped: number } | null>(null)

  const { data: exams } = useSWR("/api/admin/exams", fetcher)

  const handleCalculate = async () => {
    if (!selectedExamId) return

    setIsCalculating(true)
    setProgress(0)
    setResults(null)
    setMessage(null)
    setStats(null)

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 300)

      const response = await fetch("/api/admin/rasch/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: Number.parseInt(selectedExamId) }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (response.ok) {
        setResults(data.results)
        setStats({ processed: data.processedCount, skipped: data.skippedCount })
        setMessage({ type: "success", text: data.message })
      } else {
        setMessage({ type: "error", text: data.message || "Xatolik yuz berdi" })
      }
    } catch (error) {
      console.error("Error calculating Rasch scores:", error)
      setMessage({ type: "error", text: "Server bilan bog'lanishda xatolik" })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleExport = () => {
    if (!results) return

    const csv = [
      ["Savol №", "Turi", "Savol matni", "Jami urinishlar", "To'g'ri javoblar", "Foiz (%)", "Rasch ball"].join(","),
      ...results.map((r) =>
        [
          r.questionNumber,
          r.questionType,
          `"${r.questionText.replace(/"/g, '""')}"`,
          r.totalAttempts,
          r.correctAttempts,
          r.correctPercent.toFixed(2),
          r.raschBall,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rasch-results-exam-${selectedExamId}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Rasch hisoblash</h1>
        <p className="text-muted-foreground">Savollar murakkabligini o&apos;quvchilar natijalari asosida hisoblash</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Rasch ball hisoblash
          </CardTitle>
          <CardDescription>Faqat Y1, Y2 va O1 turdagi savollar uchun. O2 savollar hisoblanmaydi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label>Imtihonni tanlang</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Imtihon..." />
                </SelectTrigger>
                <SelectContent>
                  {exams?.map((exam: { id: number; name: string }) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCalculate} disabled={!selectedExamId || isCalculating}>
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Hisoblanmoqda...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Hisoblash
                </>
              )}
            </Button>
          </div>

          {isCalculating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hisoblanmoqda...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{message.type === "success" ? "Muvaffaqiyatli" : "Xatolik"}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {stats && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Qayta ishlangan:</span>
                <Badge variant="secondary">{stats.processed}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">O&apos;tkazib yuborilgan:</span>
                <Badge variant="outline">{stats.skipped}</Badge>
              </div>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Natijalar ({results.length} ta savol)</h3>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV yuklash
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">№</TableHead>
                      <TableHead className="w-16">Turi</TableHead>
                      <TableHead>Savol</TableHead>
                      <TableHead className="text-right w-24">Urinishlar</TableHead>
                      <TableHead className="text-right w-24">To&apos;g&apos;ri</TableHead>
                      <TableHead className="text-right w-20">Foiz</TableHead>
                      <TableHead className="text-center w-32">Rasch ball</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.questionId}>
                        <TableCell className="font-medium">{result.questionNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.questionType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={result.questionText}>
                          {result.questionText}
                        </TableCell>
                        <TableCell className="text-right">{result.totalAttempts}</TableCell>
                        <TableCell className="text-right">{result.correctAttempts}</TableCell>
                        <TableCell className="text-right font-mono">{result.correctPercent.toFixed(1)}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getRaschBadgeVariant(result.raschBall)}>
                            {result.raschBall > 0 ? `+${result.raschBall}` : result.raschBall}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{getRaschLabel(result.raschBall)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rasch ball shkalasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>To&apos;g&apos;ri javob foizi</TableHead>
                  <TableHead className="text-center">Rasch ball</TableHead>
                  <TableHead>Qiyinlik darajasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>&gt; 85%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default">-4</Badge>
                  </TableCell>
                  <TableCell>Juda oson</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>75% – 85%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="default">-3</Badge>
                  </TableCell>
                  <TableCell>Oson</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>65% – 75%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">-2</Badge>
                  </TableCell>
                  <TableCell>O&apos;rtacha oson</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>55% – 65%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">-1</Badge>
                  </TableCell>
                  <TableCell>Biroz oson</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>45% – 55%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">0</Badge>
                  </TableCell>
                  <TableCell>O&apos;rtacha</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>35% – 45%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">+1</Badge>
                  </TableCell>
                  <TableCell>Biroz qiyin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>25% – 35%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">+2</Badge>
                  </TableCell>
                  <TableCell>O&apos;rtacha qiyin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>15% – 25%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">+3</Badge>
                  </TableCell>
                  <TableCell>Qiyin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>&lt; 15%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">+4</Badge>
                  </TableCell>
                  <TableCell>Juda qiyin</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Rasch ball savol qiyinligini ko&apos;rsatadi. Manfiy qiymatlar oson savollarni, musbat qiymatlar qiyin
            savollarni bildiradi. Ball faqat Y1, Y2 va O1 turdagi savollar uchun hisoblanadi.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
