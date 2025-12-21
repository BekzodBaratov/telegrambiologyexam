"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Loader2, ChevronLeft, ChevronRight, Save, Filter, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface O2Answer {
  id: number
  attempt_id: number
  student_name: string
  question_number: number
  question_text: string
  question_image_url: string | null
  answer: string | null
  image_urls: string[] | null
  teacher_score: number | null
  max_score: number
  test_code: string
}

interface TestCode {
  code: string
}

export function O2Evaluation() {
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [selectedTestCode, setSelectedTestCode] = useState<string>("all")
  const [selectedQuestionPosition, setSelectedQuestionPosition] = useState<string>("all")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const { data: exams } = useSWR("/api/admin/exams", fetcher)

  const buildQueryUrl = () => {
    if (!selectedExamId) return null
    const params = new URLSearchParams({ examId: selectedExamId, ungradedOnly: "true" })
    if (selectedTestCode && selectedTestCode !== "all") {
      params.append("testCode", selectedTestCode)
    }
    if (selectedQuestionPosition && selectedQuestionPosition !== "all") {
      params.append("questionPosition", selectedQuestionPosition)
    }
    return `/api/admin/o2-answers?${params.toString()}`
  }

  const { data: o2Answers, isLoading } = useSWR<O2Answer[]>(buildQueryUrl(), fetcher)

  const { data: testCodes } = useSWR<TestCode[]>(
    selectedExamId ? `/api/admin/test-codes?examId=${selectedExamId}` : null,
    fetcher,
  )

  const questionPositions = [41, 42, 43]

  const currentAnswer = o2Answers?.[currentIndex]

  // Reset index when filters change
  useEffect(() => {
    setCurrentIndex(0)
    setScore("")
  }, [selectedExamId, selectedTestCode, selectedQuestionPosition])

  // Update score when navigating
  useEffect(() => {
    if (currentAnswer) {
      setScore(currentAnswer.teacher_score?.toString() || "")
    }
  }, [currentAnswer])

  const handleSaveScore = async () => {
    if (!currentAnswer || !score) return

    setIsSaving(true)
    try {
      await fetch("/api/admin/o2-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId: currentAnswer.id,
          score: Number.parseFloat(score),
        }),
      })

      mutate(buildQueryUrl())

      // Move to next answer if available
      if (currentIndex < (o2Answers?.length || 0) - 1) {
        setCurrentIndex(currentIndex + 1)
        setScore("")
      }
    } catch (error) {
      console.error("Error saving score:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndNext = async () => {
    await handleSaveScore()
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < (o2Answers?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">O2 baholash</h1>
        <p className="text-muted-foreground">41-43 savollarning javoblarini baholash</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtrlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Imtihon</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Imtihonni tanlang" />
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

            <div className="space-y-2">
              <Label>Test kodi</Label>
              <Select value={selectedTestCode} onValueChange={setSelectedTestCode} disabled={!selectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Barcha kodlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha kodlar</SelectItem>
                  {testCodes?.map((tc) => (
                    <SelectItem key={tc.code} value={tc.code}>
                      {tc.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Savol pozitsiyasi</Label>
              <Select
                value={selectedQuestionPosition}
                onValueChange={setSelectedQuestionPosition}
                disabled={!selectedExamId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Barcha savollar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha savollar</SelectItem>
                  {questionPositions.map((pos) => (
                    <SelectItem key={pos} value={pos.toString()}>
                      {pos}-savol
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation and count */}
      {o2Answers && o2Answers.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Baholanmagan: {o2Answers.length} ta javob
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevious} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {currentIndex + 1} / {o2Answers.length}
            </span>
            <Button variant="outline" size="icon" onClick={handleNext} disabled={currentIndex === o2Answers.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      {!selectedExamId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Baholash uchun imtihonni tanlang</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </CardContent>
        </Card>
      ) : !o2Answers || o2Answers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg">Barcha javoblar baholangan!</p>
            <p className="text-sm mt-2">Tanlangan filtrlar uchun baholanmagan javoblar topilmadi.</p>
          </CardContent>
        </Card>
      ) : currentAnswer ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Savol</CardTitle>
                <Badge variant="outline">#{currentAnswer.question_number}-savol</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-relaxed">{currentAnswer.question_text}</p>

              {currentAnswer.question_image_url && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Savol rasmi</Label>
                  <a href={currentAnswer.question_image_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={currentAnswer.question_image_url || "/placeholder.svg"}
                      alt="Savol rasmi"
                      className="max-h-48 rounded-lg border object-contain hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Talaba:</span>
                  <span className="font-medium text-foreground">{currentAnswer.student_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Test kodi:</span>
                  <Badge variant="secondary">{currentAnswer.test_code}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Talaba javobi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Student images */}
              {currentAnswer.image_urls && currentAnswer.image_urls.length > 0 ? (
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Yuklangan rasmlar</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {currentAnswer.image_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Rasm ${i + 1}`}
                          className="w-full h-40 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border rounded-lg bg-muted/30">
                  Rasm yuklanmagan
                </div>
              )}

              <Separator />

              {/* Scoring section */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Baholash</Label>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      Ball (max {currentAnswer.max_score})
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={currentAnswer.max_score}
                      step="0.5"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="Ball kiriting..."
                      className="text-lg h-12"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveScore}
                    disabled={isSaving || !score}
                    variant="outline"
                    className="flex-1 bg-transparent"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Saqlash
                  </Button>
                  <Button
                    onClick={handleSaveAndNext}
                    disabled={isSaving || !score || currentIndex >= (o2Answers?.length || 0) - 1}
                    className="flex-1"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Saqlash va keyingi
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
