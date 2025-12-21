"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import useSWR from "swr"
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Subject {
  id: number
  name: string
}

interface Section {
  id: number
  title: string
  task_count: number
  max_questions_per_exam: number
  subject_id: number
  subject_name: string
  current_count: number
}

interface Question {
  id: number
  section_id: number
  question_number: number
  question_type_code: string
  text: string
  options: Record<string, string> | null
  image_url: string | null
  group_id: number | null
}

interface QuestionGroup {
  id: number
  stem: string
  options: Record<string, string>
  questions: Question[]
}

interface Exam {
  id: number
  name: string
  subject_id: number
  test_duration: number
  written_duration: number
  is_active: boolean
  question_ids: number[]
}

export default function EditExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Form state
  const [examName, setExamName] = useState("")
  const [description, setDescription] = useState("")
  const [testDuration, setTestDuration] = useState("100")
  const [writtenDuration, setWrittenDuration] = useState("80")
  const [subjectId, setSubjectId] = useState("")
  const [status, setStatus] = useState<"draft" | "active">("draft")

  // Selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Pagination state per section
  const [sectionPages, setSectionPages] = useState<Record<number, number>>({})
  const QUESTIONS_PER_PAGE = 20

  // Fetch data
  const { data: exam, isLoading: loadingExam } = useSWR<Exam>(`/api/admin/exams/${examId}`, fetcher)
  const { data: subjects } = useSWR<Subject[]>("/api/admin/subjects", fetcher)
  const { data: sections } = useSWR<Section[]>("/api/admin/sections", fetcher)
  const { data: allQuestions } = useSWR<Question[]>(
    subjectId ? `/api/admin/questions?subjectId=${subjectId}` : null,
    fetcher,
  )
  const { data: questionGroups } = useSWR<QuestionGroup[]>(
    subjectId ? `/api/admin/question-groups?subjectId=${subjectId}` : null,
    fetcher,
  )

  // Load exam data when fetched
  useEffect(() => {
    if (exam && !isLoaded) {
      setExamName(exam.name)
      setTestDuration(exam.test_duration.toString())
      setWrittenDuration(exam.written_duration.toString())
      setSubjectId(exam.subject_id.toString())
      setStatus(exam.is_active ? "active" : "draft")
      setSelectedQuestions(new Set(exam.question_ids || []))
      setIsLoaded(true)
    }
  }, [exam, isLoaded])

  // Filter sections by subject
  const filteredSections = useMemo(
    () => sections?.filter((s) => s.subject_id.toString() === subjectId) || [],
    [sections, subjectId],
  )

  // Group questions by section
  const questionsBySection = useMemo(() => {
    if (!allQuestions) return {}
    const grouped: Record<number, Question[]> = {}
    allQuestions.forEach((q) => {
      if (!grouped[q.section_id]) grouped[q.section_id] = []
      grouped[q.section_id].push(q)
    })
    return grouped
  }, [allQuestions])

  // Group Y2 questions by group_id
  const groupedY2Questions = useMemo(() => {
    if (!questionGroups) return {}
    const grouped: Record<number, QuestionGroup> = {}
    questionGroups.forEach((g) => {
      grouped[g.id] = g
    })
    return grouped
  }, [questionGroups])

  // Calculate selection counts per section
  const selectionBySection = useMemo(() => {
    const counts: Record<number, number> = {}
    filteredSections.forEach((s) => {
      const sectionQuestions = questionsBySection[s.id] || []
      counts[s.id] = sectionQuestions.filter((q) => selectedQuestions.has(q.id)).length
    })
    return counts
  }, [filteredSections, questionsBySection, selectedQuestions])

  // Total selected questions
  const totalSelected = selectedQuestions.size

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (!examName.trim()) errors.push("Imtihon nomi kiritilmagan")
    if (!subjectId) errors.push("Fan tanlanmagan")
    if (totalSelected === 0) errors.push("Hech qanday savol tanlanmagan")

    filteredSections.forEach((section) => {
      const count = selectionBySection[section.id] || 0
      if (count > section.max_questions_per_exam) {
        errors.push(
          `"${section.title}" bo'limida ${count}/${section.max_questions_per_exam} savol tanlangan (limitdan oshib ketgan)`,
        )
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }, [examName, subjectId, totalSelected, filteredSections, selectionBySection])

  // Toggle section expansion
  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Toggle group expansion
  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // Toggle question selection
  const toggleQuestion = (questionId: number, sectionId: number) => {
    const section = filteredSections.find((s) => s.id === sectionId)
    if (!section) return

    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        const currentCount = selectionBySection[sectionId] || 0
        if (currentCount >= section.max_questions_per_exam) {
          return prev
        }
        next.add(questionId)
      }
      return next
    })
  }

  // Select all questions up to limit for a section
  const selectAllInSection = (sectionId: number) => {
    const section = filteredSections.find((s) => s.id === sectionId)
    if (!section) return

    const sectionQuestions = questionsBySection[sectionId] || []
    const filteredQuestions = filterQuestions(sectionQuestions)

    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      let count = selectionBySection[sectionId] || 0

      for (const q of filteredQuestions) {
        if (count >= section.max_questions_per_exam) break
        if (!next.has(q.id)) {
          next.add(q.id)
          count++
        }
      }

      return next
    })
  }

  // Deselect all in section
  const deselectAllInSection = (sectionId: number) => {
    const sectionQuestions = questionsBySection[sectionId] || []
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      sectionQuestions.forEach((q) => next.delete(q.id))
      return next
    })
  }

  // Filter questions by search and type
  const filterQuestions = useCallback(
    (questions: Question[]) => {
      return questions.filter((q) => {
        const matchesSearch =
          !searchQuery ||
          q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.question_number.toString().includes(searchQuery)

        const matchesType = typeFilter === "all" || q.question_type_code === typeFilter

        return matchesSearch && matchesType
      })
    },
    [searchQuery, typeFilter],
  )

  // Get paginated questions for a section
  const getPaginatedQuestions = (sectionId: number) => {
    const questions = questionsBySection[sectionId] || []
    const filtered = filterQuestions(questions)
    const page = sectionPages[sectionId] || 0
    const start = page * QUESTIONS_PER_PAGE
    const end = start + QUESTIONS_PER_PAGE
    return {
      questions: filtered.slice(start, end),
      total: filtered.length,
      hasMore: end < filtered.length,
      hasPrev: page > 0,
    }
  }

  // Load more questions for section
  const loadMoreQuestions = (sectionId: number) => {
    setSectionPages((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] || 0) + 1,
    }))
  }

  // Load previous questions for section
  const loadPrevQuestions = (sectionId: number) => {
    setSectionPages((prev) => ({
      ...prev,
      [sectionId]: Math.max(0, (prev[sectionId] || 0) - 1),
    }))
  }

  // Submit exam
  const handleSubmit = async () => {
    if (!validation.isValid) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: examName,
          description,
          subjectId: Number.parseInt(subjectId),
          testDuration: Number.parseInt(testDuration),
          writtenDuration: Number.parseInt(writtenDuration),
          isActive: status === "active",
          questionIds: Array.from(selectedQuestions),
        }),
      })

      if (response.ok) {
        router.push("/admin/dashboard")
      } else {
        const error = await response.json()
        alert(error.message || "Xatolik yuz berdi")
      }
    } catch (error) {
      console.error("Submit error:", error)
      alert("Xatolik yuz berdi")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Imtihonni tahrirlash</h1>
              <p className="text-sm text-muted-foreground">Savollarni bo'limlar bo'yicha tanlang</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={!validation.isValid || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Saqlash
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Metadata */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Imtihon ma'lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Imtihon nomi *</Label>
                  <Input
                    id="name"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="Biologiya 2024 - 1-variant"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Tavsif</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Imtihon haqida qisqacha ma'lumot..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Fan *</Label>
                  <Select value={subjectId} onValueChange={setSubjectId} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Fanni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Fanni o'zgartirib bo'lmaydi</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="testDuration">Test (daq)</Label>
                    <Input
                      id="testDuration"
                      type="number"
                      min="1"
                      value={testDuration}
                      onChange={(e) => setTestDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="writtenDuration">Yozma (daq)</Label>
                    <Input
                      id="writtenDuration"
                      type="number"
                      min="1"
                      value={writtenDuration}
                      onChange={(e) => setWrittenDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Holat</Label>
                  <Select value={status} onValueChange={(v: "draft" | "active") => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Qoralama</SelectItem>
                      <SelectItem value="active">Faol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Summary Panel */}
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Tanlangan savollar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Jami:</span>
                    <span>{totalSelected}</span>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    {filteredSections.map((section) => {
                      const count = selectionBySection[section.id] || 0
                      const max = section.max_questions_per_exam
                      const isOverLimit = count > max
                      const isComplete = count === max

                      return (
                        <div key={section.id} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[120px]" title={section.title}>
                            {section.title}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className={cn(
                                "font-mono",
                                isOverLimit && "text-destructive",
                                isComplete && !isOverLimit && "text-green-600",
                              )}
                            >
                              {count}/{max}
                            </span>
                            {isComplete && !isOverLimit && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                            {isOverLimit && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {!validation.isValid && (
                    <div className="border-t pt-3 space-y-1">
                      {validation.errors.map((error, i) => (
                        <p key={i} className="text-xs text-destructive flex items-start gap-1">
                          <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Question Selection */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Savol matni yoki raqami bo'yicha qidirish..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Turi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barchasi</SelectItem>
                      <SelectItem value="Y1">Y1 - Test</SelectItem>
                      <SelectItem value="Y2">Y2 - Moslashtirish</SelectItem>
                      <SelectItem value="O1">O1 - Qisqa javob</SelectItem>
                      <SelectItem value="O2">O2 - Yozma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            {filteredSections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Bu fan uchun bo'limlar topilmadi</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSections.map((section) => {
                  const isExpanded = expandedSections.has(section.id)
                  const count = selectionBySection[section.id] || 0
                  const max = section.max_questions_per_exam
                  const isLimitReached = count >= max
                  const { questions, total, hasMore, hasPrev } = getPaginatedQuestions(section.id)

                  return (
                    <Card key={section.id} className="overflow-hidden">
                      {/* Section Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <h3 className="font-medium">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">Jami: {section.current_count} ta savol</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={isLimitReached ? (count > max ? "destructive" : "default") : "outline"}>
                            Tanlangan: {count} / {max}
                          </Badge>
                        </div>
                      </div>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t">
                          {/* Section Actions */}
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                            <p className="text-sm text-muted-foreground">
                              Ko'rsatilgan: {questions.length} / {total}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  selectAllInSection(section.id)
                                }}
                                disabled={isLimitReached}
                              >
                                Limitgacha tanlash
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deselectAllInSection(section.id)
                                }}
                              >
                                Bekor qilish
                              </Button>
                            </div>
                          </div>

                          {/* Questions List */}
                          <ScrollArea className="max-h-[400px]">
                            <div className="divide-y">
                              {questions.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">Savollar topilmadi</div>
                              ) : (
                                questions.map((question) => {
                                  const isSelected = selectedQuestions.has(question.id)
                                  const isDisabled = !isSelected && isLimitReached
                                  const isY2Grouped = question.group_id && groupedY2Questions[question.group_id]

                                  if (isY2Grouped && question.question_type_code === "Y2") {
                                    const group = groupedY2Questions[question.group_id!]
                                    const isFirstInGroup = group.questions[0]?.id === question.id
                                    if (!isFirstInGroup) return null

                                    const isGroupExpanded = expandedGroups.has(group.id)
                                    const groupSelectedCount = group.questions.filter((q) =>
                                      selectedQuestions.has(q.id),
                                    ).length

                                    return (
                                      <div
                                        key={`group-${group.id}`}
                                        className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                      >
                                        <div
                                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                                          onClick={() => toggleGroup(group.id)}
                                        >
                                          {isGroupExpanded ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <Badge
                                            variant="secondary"
                                            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                          >
                                            Y2 Guruh
                                          </Badge>
                                          <span className="text-sm flex-1 truncate">
                                            {group.stem.substring(0, 80)}...
                                          </span>
                                          <span className="text-sm text-muted-foreground">
                                            {groupSelectedCount}/{group.questions.length} tanlangan
                                          </span>
                                        </div>

                                        {isGroupExpanded && (
                                          <div className="pl-8 pb-2 space-y-1">
                                            {group.questions.map((gq) => {
                                              const isGqSelected = selectedQuestions.has(gq.id)
                                              const isGqDisabled = !isGqSelected && isLimitReached

                                              return (
                                                <div
                                                  key={gq.id}
                                                  className={cn(
                                                    "flex items-center gap-3 p-2 rounded-md transition-colors",
                                                    isGqSelected && "bg-primary/10",
                                                    isGqDisabled && "opacity-50",
                                                  )}
                                                >
                                                  <Checkbox
                                                    checked={isGqSelected}
                                                    onCheckedChange={() => toggleQuestion(gq.id, section.id)}
                                                    disabled={isGqDisabled}
                                                  />
                                                  <span className="font-mono text-sm text-muted-foreground w-8">
                                                    #{gq.question_number}
                                                  </span>
                                                  <span className="text-sm flex-1 truncate">{gq.text}</span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      key={question.id}
                                      className={cn(
                                        "flex items-center gap-3 p-3 transition-colors",
                                        isSelected && "bg-primary/5",
                                        isDisabled && "opacity-50",
                                      )}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleQuestion(question.id, section.id)}
                                        disabled={isDisabled}
                                      />
                                      <span className="font-mono text-sm text-muted-foreground w-8">
                                        #{question.question_number}
                                      </span>
                                      <Badge variant="outline" className="w-10 justify-center">
                                        {question.question_type_code}
                                      </Badge>
                                      {question.image_url && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                                      <span className="text-sm flex-1 truncate">{question.text}</span>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </ScrollArea>

                          {(hasMore || hasPrev) && (
                            <div className="flex items-center justify-center gap-2 p-3 border-t bg-muted/30">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadPrevQuestions(section.id)}
                                disabled={!hasPrev}
                              >
                                Oldingi
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadMoreQuestions(section.id)}
                                disabled={!hasMore}
                              >
                                Keyingi
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
