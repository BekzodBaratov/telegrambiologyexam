"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { JSX } from "react/jsx-runtime" // Import JSX to fix the undeclared variable error

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
  section_id: number
}

export default function CreateExamPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [examName, setExamName] = useState("")
  const [testDuration, setTestDuration] = useState("100")
  const [writtenDuration, setWrittenDuration] = useState("80")
  const [subjectId, setSubjectId] = useState("")

  // Selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const [visibleItemsCount, setVisibleItemsCount] = useState<Record<number, number>>({})
  const ITEMS_PER_LOAD = 30

  // Fetch data
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

  const selectionBySection = useMemo(() => {
    const counts: Record<number, number> = {}
    filteredSections.forEach((s) => {
      const sectionQuestions = questionsBySection[s.id] || []
      let count = 0
      const processedGroups = new Set<number>()

      sectionQuestions.forEach((q) => {
        if (q.group_id) {
          // Y2: count ALL sub-questions in selected groups
          if (!processedGroups.has(q.group_id) && selectedGroups.has(q.group_id)) {
            const group = groupedY2Questions[q.group_id]
            if (group) {
              count += group.questions.length
            }
            processedGroups.add(q.group_id)
          }
        } else if (selectedQuestions.has(q.id)) {
          count++
        }
      })

      counts[s.id] = count
    })
    return counts
  }, [filteredSections, questionsBySection, selectedQuestions, selectedGroups, groupedY2Questions])

  const { totalSelected, y1Count, y2Count, o1Count, o2Count } = useMemo(() => {
    let y1 = 0,
      y2 = 0,
      o1 = 0,
      o2 = 0

    selectedQuestions.forEach((qId) => {
      const q = allQuestions?.find((q) => q.id === qId)
      if (q) {
        if (q.question_type_code === "Y1") y1++
        else if (q.question_type_code === "O1") o1++
        else if (q.question_type_code === "O2") o2++
      }
    })

    selectedGroups.forEach((groupId) => {
      const group = groupedY2Questions[groupId]
      if (group) {
        y2 += group.questions.length
      }
    })

    return { totalSelected: y1 + y2 + o1 + o2, y1Count: y1, y2Count: y2, o1Count: o1, o2Count: o2 }
  }, [selectedQuestions, selectedGroups, allQuestions, groupedY2Questions])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (!examName.trim()) errors.push("Imtihon nomi kiritilmagan")
    if (!subjectId) errors.push("Fan tanlanmagan")
    if (totalSelected === 0) errors.push("Hech qanday savol tanlanmagan")

    filteredSections.forEach((section) => {
      const count = selectionBySection[section.id] || 0
      if (count > section.max_questions_per_exam) {
        errors.push(`"${section.title}": ${count}/${section.max_questions_per_exam} (limit oshdi)`)
      }
    })

    return { isValid: errors.length === 0, errors }
  }, [examName, subjectId, totalSelected, filteredSections, selectionBySection])

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
        // Initialize visible items when expanding
        if (!visibleItemsCount[sectionId]) {
          setVisibleItemsCount((p) => ({ ...p, [sectionId]: ITEMS_PER_LOAD }))
        }
      }
      return next
    })
  }

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const toggleGroupSelection = (groupId: number, sectionId: number) => {
    const section = filteredSections.find((s) => s.id === sectionId)
    if (!section) return

    const group = groupedY2Questions[groupId]
    if (!group || group.questions.length === 0) return

    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        const currentCount = selectionBySection[sectionId] || 0
        const subQuestionCount = group.questions.length
        if (currentCount + subQuestionCount > section.max_questions_per_exam) {
          return prev
        }
        next.add(groupId)
      }
      return next
    })
  }

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

  const selectAllInSection = (sectionId: number) => {
    const section = filteredSections.find((s) => s.id === sectionId)
    if (!section) return

    const sectionQuestions = questionsBySection[sectionId] || []
    const filtered = filterQuestions(sectionQuestions)

    let count = selectionBySection[sectionId] || 0
    const processedGroups = new Set<number>()

    const newSelectedQuestions = new Set(selectedQuestions)
    const newSelectedGroups = new Set(selectedGroups)

    for (const q of filtered) {
      if (count >= section.max_questions_per_exam) break

      if (q.group_id) {
        if (!processedGroups.has(q.group_id) && !newSelectedGroups.has(q.group_id)) {
          const group = groupedY2Questions[q.group_id]
          if (group && group.questions.length > 0) {
            const subQuestionCount = group.questions.length
            if (count + subQuestionCount <= section.max_questions_per_exam) {
              newSelectedGroups.add(q.group_id)
              processedGroups.add(q.group_id)
              count += subQuestionCount
            }
          }
        }
      } else {
        if (!newSelectedQuestions.has(q.id)) {
          newSelectedQuestions.add(q.id)
          count++
        }
      }
    }

    setSelectedQuestions(newSelectedQuestions)
    setSelectedGroups(newSelectedGroups)
  }

  const deselectAllInSection = (sectionId: number) => {
    const sectionQuestions = questionsBySection[sectionId] || []

    const newSelectedQuestions = new Set(selectedQuestions)
    const newSelectedGroups = new Set(selectedGroups)

    sectionQuestions.forEach((q) => {
      if (q.group_id) {
        newSelectedGroups.delete(q.group_id)
      } else {
        newSelectedQuestions.delete(q.id)
      }
    })

    setSelectedQuestions(newSelectedQuestions)
    setSelectedGroups(newSelectedGroups)
  }

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

  const loadMoreItems = (sectionId: number) => {
    setVisibleItemsCount((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] || ITEMS_PER_LOAD) + ITEMS_PER_LOAD,
    }))
  }

  const handleSubmit = async () => {
    if (!validation.isValid) return

    setIsSubmitting(true)
    try {
      const questionIds: number[] = Array.from(selectedQuestions)

      selectedGroups.forEach((groupId) => {
        const group = groupedY2Questions[groupId]
        if (group) {
          group.questions.forEach((q) => {
            questionIds.push(q.id)
          })
        }
      })

      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: examName,
          subjectId: Number.parseInt(subjectId),
          testDuration: Number.parseInt(testDuration),
          writtenDuration: Number.parseInt(writtenDuration),
          isActive: false,
          questionIds,
        }),
      })

      if (response.ok) {
        router.push("/admin/dashboard?tab=test-codes")
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

  useEffect(() => {
    setSelectedQuestions(new Set())
    setSelectedGroups(new Set())
    setExpandedSections(new Set())
    setVisibleItemsCount({})
  }, [subjectId])

  const visibleSections = useMemo(() => {
    if (!searchQuery && typeFilter === "all") {
      return filteredSections
    }

    return filteredSections.filter((section) => {
      const sectionQuestions = questionsBySection[section.id] || []
      const filtered = filterQuestions(sectionQuestions)
      return filtered.length > 0
    })
  }, [filteredSections, questionsBySection, filterQuestions, searchQuery, typeFilter])

  const getGroupSubQuestionCount = (groupId: number) => {
    const group = groupedY2Questions[groupId]
    return group?.questions?.length || 0
  }

  const renderSectionQuestions = (section: Section) => {
    const sectionQuestions = questionsBySection[section.id] || []
    const filtered = filterQuestions(sectionQuestions)
    const visibleCount = visibleItemsCount[section.id] || ITEMS_PER_LOAD
    const count = selectionBySection[section.id] || 0
    const max = section.max_questions_per_exam
    const isLimitReached = count >= max

    // Group consecutive Y2 questions by their group_id
    const renderedGroupIds = new Set<number>()
    const items: JSX.Element[] = []

    const visibleQuestions = filtered.slice(0, visibleCount)

    for (const question of visibleQuestions) {
      if (question.group_id && groupedY2Questions[question.group_id]) {
        // Y2 grouped question - render only once per group
        if (renderedGroupIds.has(question.group_id)) continue
        renderedGroupIds.add(question.group_id)

        const group = groupedY2Questions[question.group_id]
        const isGroupExpanded = expandedGroups.has(group.id)
        const isGroupSelected = selectedGroups.has(group.id)
        const subQuestionCount = getGroupSubQuestionCount(group.id)
        const wouldExceedLimit = !isGroupSelected && count + subQuestionCount > max
        const isDisabled = wouldExceedLimit

        items.push(
          <div
            key={`group-${group.id}`}
            className={cn(
              "border-l-4 border-blue-500",
              isGroupSelected ? "bg-blue-50 dark:bg-blue-950/30" : "bg-blue-50/50 dark:bg-blue-950/20",
            )}
          >
            <div className="flex items-center gap-3 p-3">
              <Checkbox
                checked={isGroupSelected}
                onCheckedChange={() => toggleGroupSelection(group.id, section.id)}
                disabled={isDisabled}
                onClick={(e) => e.stopPropagation()}
              />
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded p-1 -m-1"
                onClick={() => toggleGroup(group.id)}
              >
                {isGroupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Y2 Guruh
                </Badge>
                <span className="text-sm flex-1 truncate">
                  {group.stem.length > 80 ? `${group.stem.substring(0, 80)}...` : group.stem}
                </span>
                <Badge variant="outline" className="font-mono">
                  {subQuestionCount} ta savol
                </Badge>
                {isDisabled && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {isGroupExpanded && (
              <div className="pl-12 pb-3 pr-3 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Sub-savollar (faqat ko'rish):</p>
                {group.questions.map((gq, idx) => (
                  <div key={gq.id} className="flex items-center gap-3 p-2 rounded-md bg-background/50">
                    <span className="font-mono text-sm text-muted-foreground w-8">{idx + 1}.</span>
                    <span className="text-sm flex-1 truncate">{gq.text}</span>
                    <Badge variant="outline" className="text-xs">
                      Javob: {gq.correct_answer}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>,
        )
      } else {
        // Regular question (Y1, O1, O2)
        const isSelected = selectedQuestions.has(question.id)
        const isDisabled = !isSelected && isLimitReached

        items.push(
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
            <span className="font-mono text-sm text-muted-foreground w-8">#{question.question_number}</span>
            <Badge variant="outline" className="w-10 justify-center">
              {question.question_type_code}
            </Badge>
            {question.image_url && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm flex-1 truncate">{question.text}</span>
            {isDisabled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>,
        )
      }
    }

    const hasMore = visibleCount < filtered.length

    return (
      <>
        <div className="divide-y">
          {items.length === 0 ? <div className="p-4 text-center text-muted-foreground">Savollar topilmadi</div> : items}
        </div>
        {hasMore && (
          <div className="p-3 border-t bg-muted/30 text-center">
            <Button variant="outline" size="sm" onClick={() => loadMoreItems(section.id)}>
              Ko'proq yuklash ({filtered.length - visibleCount} ta qoldi)
            </Button>
          </div>
        )}
      </>
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
              <h1 className="text-xl font-semibold">Yangi imtihon yaratish</h1>
              <p className="text-sm text-muted-foreground">
                Savollarni tanlang • Jami: <span className="font-medium">{totalSelected}</span>
              </p>
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
          {/* Left Panel */}
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
                  <Label htmlFor="subject">Fan *</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
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
                    <span className="text-primary">{totalSelected}</span>
                  </div>

                  {/* Type breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-medium">{y1Count}</div>
                      <div className="text-muted-foreground">Y1</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-medium">{y2Count}</div>
                      <div className="text-muted-foreground">Y2</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-medium">{o1Count}</div>
                      <div className="text-muted-foreground">O1</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-mono font-medium">{o2Count}</div>
                      <div className="text-muted-foreground">O2</div>
                    </div>
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

          {/* Main Content */}
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
            {!subjectId ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Savollarni ko'rish uchun fanni tanlang</p>
                </CardContent>
              </Card>
            ) : visibleSections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>
                    {searchQuery || typeFilter !== "all"
                      ? "Filtrga mos savollar topilmadi"
                      : "Bu fan uchun bo'limlar topilmadi"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleSections.map((section) => {
                  const isExpanded = expandedSections.has(section.id)
                  const count = selectionBySection[section.id] || 0
                  const max = section.max_questions_per_exam
                  const isLimitReached = count >= max
                  const sectionQuestions = questionsBySection[section.id] || []
                  const filteredCount = filterQuestions(sectionQuestions).length

                  return (
                    <Card key={section.id} className="overflow-hidden">
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
                            <p className="text-sm text-muted-foreground">
                              {filteredCount} ta savol
                              {searchQuery || typeFilter !== "all" ? " (filtrlangan)" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant={isLimitReached ? (count > max ? "destructive" : "default") : "outline"}>
                            {count} / {max}
                          </Badge>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t">
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                            <p className="text-sm text-muted-foreground">Limit: {max} ta savol</p>
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

                          <div className="max-h-[500px] overflow-y-auto">{renderSectionQuestions(section)}</div>
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
