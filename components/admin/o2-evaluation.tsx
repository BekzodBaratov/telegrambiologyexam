"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { Loader2, ChevronLeft, ChevronRight, Save, Filter, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Server error" }))
    throw new Error(error.message || "Failed to fetch")
  }
  return res.json()
}

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
  test_code: string
}

interface Exam {
  id: number
  name: string
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
  const [scoreError, setScoreError] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: examsData, error: examsError, isLoading: examsLoading } = useSWR<Exam[]>("/api/admin/exams", fetcher)

  const exams = Array.isArray(examsData) ? examsData : []

  const buildQueryUrl = useCallback(() => {
    if (!selectedExamId || selectedExamId === "") return null
    const params = new URLSearchParams({
      examId: selectedExamId,
      ungradedOnly: "true",
    })
    if (selectedTestCode && selectedTestCode !== "all") {
      params.append("testCode", selectedTestCode)
    }
    if (selectedQuestionPosition && selectedQuestionPosition !== "all") {
      params.append("questionPosition", selectedQuestionPosition)
    }
    return `/api/admin/o2-answers?${params.toString()}`
  }, [selectedExamId, selectedTestCode, selectedQuestionPosition])

  const queryUrl = buildQueryUrl()

  const {
    data: o2AnswersData,
    isLoading: answersLoading,
    error: answersError,
    mutate: mutateAnswers,
  } = useSWR<O2Answer[]>(queryUrl, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const o2Answers = Array.isArray(o2AnswersData) ? o2AnswersData : []

  const { data: testCodesData } = useSWR<TestCode[]>(
    selectedExamId ? `/api/admin/test-codes?examId=${selectedExamId}` : null,
    fetcher,
  )

  const testCodes = Array.isArray(testCodesData) ? testCodesData : []

  const questionPositions = [41, 42, 43]

  const currentAnswer = o2Answers[currentIndex]

  useEffect(() => {
    setCurrentIndex(0)
    setScore("")
    setScoreError(null)
  }, [selectedExamId, selectedTestCode, selectedQuestionPosition])

  useEffect(() => {
    if (currentAnswer) {
      setScore(currentAnswer.teacher_score?.toString() || "")
      setScoreError(null)
    }
  }, [currentAnswer])

  const validateScore = (): boolean => {
    if (!currentAnswer) return false

    const numScore = Number.parseFloat(score)
    if (isNaN(numScore)) {
      setScoreError("Son kiriting")
      return false
    }
    if (numScore < 0) {
      setScoreError("Ball manfiy bo'lishi mumkin emas")
      return false
    }
    if (numScore > 100) {
      setScoreError("Ball 100 dan oshmasligi kerak")
      return false
    }
    setScoreError(null)
    return true
  }

  const handleSaveScore = async (moveToNext = false) => {
    if (!currentAnswer || score === "") return
    if (!validateScore()) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/o2-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId: currentAnswer.id,
          score: Number.parseFloat(score),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || "Xatolik yuz berdi")
      }

      const result = await response.json()

      await mutateAnswers()

      if (result.finalCalculated) {
        const certMessage = result.certificateLevel
          ? `Sertifikat: ${result.certificateLevel}`
          : "Sertifikat berilmadi (ball 46% dan past)"
        toast({
          title: "Natijalar tasdiqlandi",
          description: `${currentAnswer.student_name} - yakuniy ball hisoblandi. ${certMessage}`,
          duration: 5000,
        })
      } else if (result.allO2Graded) {
        toast({
          title: "Baholandi",
          description: `${currentAnswer.student_name} - barcha O2 savollari baholandi. Part 2 ball hisoblandi.`,
        })
      } else {
        toast({
          title: "Saqlandi",
          description: `${currentAnswer.student_name} - ${currentAnswer.question_number}-savol: ${score} ball`,
        })
      }

      if (moveToNext && currentIndex < o2Answers.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setScore("")
      }
    } catch (error) {
      console.error("Error saving score:", error)
      toast({
        title: "Xatolik",
        description: error instanceof Error ? error.message : "Ballni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < o2Answers.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleRefresh = () => {
    if (queryUrl) {
      mutateAnswers()
    }
  }

  const handleExamChange = (value: string) => {
    setSelectedExamId(value)
    setSelectedTestCode("all")
    setSelectedQuestionPosition("all")
  }

  const isLoading = answersLoading && selectedExamId !== ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">O2 baholash</h1>
        <p className="text-sm text-muted-foreground">41-43 savollarning javoblarini baholash</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtrlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Imtihon</Label>
              <Select value={selectedExamId} onValueChange={handleExamChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Imtihonni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {examsLoading ? (
                    <div className="p-2 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : exams.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground text-sm">Imtihonlar topilmadi</div>
                  ) : (
                    exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id.toString()}>
                        {exam.name}
                      </SelectItem>
                    ))
                  )}
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
                  {testCodes.map((tc) => (
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

      {answersError && selectedExamId && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg text-destructive">Ma'lumotlarni yuklashda xatolik</p>
            <p className="text-sm text-muted-foreground mt-2">{answersError.message}</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Qayta urinish
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {!answersError && o2Answers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Baholanmagan: {o2Answers.length} ta javob
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
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
            <p className="text-sm text-muted-foreground mt-2">Ma'lumotlar yuklanmoqda...</p>
          </CardContent>
        </Card>
      ) : !answersError && o2Answers.length === 0 ? (
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
              <div className="flex items-center justify-between flex-wrap gap-2">
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
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Baholash</Label>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Ball: 0–100
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={score}
                    onChange={(e) => {
                      setScore(e.target.value)
                      setScoreError(null)
                    }}
                    placeholder="0-100 orasida ball kiriting..."
                    className={`text-lg h-12 ${scoreError ? "border-destructive" : ""}`}
                  />
                  {scoreError && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {scoreError}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSaveScore(false)}
                    disabled={isSaving || score === ""}
                    variant="outline"
                    className="flex-1 bg-transparent"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Saqlash
                  </Button>
                  <Button
                    onClick={() => handleSaveScore(true)}
                    disabled={isSaving || score === "" || currentIndex >= o2Answers.length - 1}
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
