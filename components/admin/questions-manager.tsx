"use client"

import type React from "react"
import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Pencil, Trash2, Loader2, Upload, X, Eye, ChevronLeft, ChevronRight, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ITEMS_PER_PAGE = 20

interface Question {
  id: number
  question_number: number
  text: string
  options: Record<string, string> | null
  correct_answer: string | null
  question_type_code: string
  section_title: string
  section_id: number
  image_url: string | null
}

interface Section {
  id: number
  title: string
  task_count: number
  subject_id: number
  current_count?: number
}

interface QuestionType {
  id: number
  code: string
  description: string
}

export function QuestionsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)

  const [filterType, setFilterType] = useState<string>("all")
  const [filterSection, setFilterSection] = useState<string>("all")

  const [formData, setFormData] = useState({
    questionTypeId: "",
    sectionId: "",
    text: "",
    imageUrl: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    y1CorrectAnswer: "",
    o1Answer: "",
  })

  const { data: questions, isLoading: loadingQuestions } = useSWR<Question[]>("/api/admin/questions", fetcher)
  const { data: questionTypes } = useSWR<QuestionType[]>("/api/admin/question-types", fetcher)
  const { data: sections } = useSWR<Section[]>("/api/admin/sections", fetcher)

  const selectedTypeCode = questionTypes?.find((t) => t.id.toString() === formData.questionTypeId)?.code || ""
  const availableQuestionTypes = questionTypes?.filter((t) => t.code !== "Y2") || []

  const filteredQuestions =
    questions?.filter((q) => {
      if (filterType !== "all" && q.question_type_code !== filterType) return false
      if (filterSection !== "all" && q.section_id.toString() !== filterSection) return false
      return true
    }) || []

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE)
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleFilterChange = (type: string, value: string) => {
    if (type === "type") setFilterType(value)
    if (type === "section") setFilterSection(value)
    setCurrentPage(1)
  }

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question)
      const typeId = questionTypes?.find((t) => t.code === question.question_type_code)?.id?.toString() || ""
      const options = question.options || {}

      setFormData({
        questionTypeId: typeId,
        sectionId: question.section_id?.toString() || "",
        text: question.text,
        imageUrl: question.image_url || "",
        optionA: options.A || "",
        optionB: options.B || "",
        optionC: options.C || "",
        optionD: options.D || "",
        y1CorrectAnswer: question.question_type_code === "Y1" ? question.correct_answer || "" : "",
        o1Answer: question.question_type_code === "O1" ? question.correct_answer || "" : "",
      })
    } else {
      setEditingQuestion(null)
      setFormData({
        questionTypeId: "",
        sectionId: "",
        text: "",
        imageUrl: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        y1CorrectAnswer: "",
        o1Answer: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleViewQuestion = (question: Question) => {
    setViewingQuestion(question)
    setIsViewOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ["image/png", "image/jpg", "image/jpeg"]
    if (!validTypes.includes(file.type)) {
      alert("Faqat PNG, JPG, JPEG formatlar qo'llab-quvvatlanadi")
      return
    }

    setIsUploading(true)
    const uploadFormData = new FormData()
    uploadFormData.append("file", file)

    try {
      const response = await fetch("/api/student/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData({ ...formData, imageUrl: data.url })
      } else {
        alert("Rasm yuklashda xatolik")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Rasm yuklashda xatolik")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: "" })
  }

  const handleSubmit = async () => {
    if (!formData.questionTypeId) {
      alert("Savol turini tanlang")
      return
    }
    if (!formData.sectionId) {
      alert("Bo'limni tanlang")
      return
    }
    if (!formData.text.trim()) {
      alert("Savol matnini kiriting")
      return
    }
    if (selectedTypeCode === "Y1") {
      if (!formData.optionA || !formData.optionB || !formData.optionC || !formData.optionD) {
        alert("Barcha variantlarni to'ldiring (A, B, C, D)")
        return
      }
      if (!formData.y1CorrectAnswer) {
        alert("To'g'ri javobni tanlang")
        return
      }
    }
    if (selectedTypeCode === "O1" && !formData.o1Answer) {
      alert("To'g'ri javobni kiriting")
      return
    }

    setIsLoading(true)
    try {
      let options: Record<string, string> | null = null
      let correctAnswer: string | null = null

      if (selectedTypeCode === "Y1") {
        options = {
          A: formData.optionA,
          B: formData.optionB,
          C: formData.optionC,
          D: formData.optionD,
        }
        correctAnswer = formData.y1CorrectAnswer
      } else if (selectedTypeCode === "O1") {
        correctAnswer = formData.o1Answer
      }

      const payload = {
        questionTypeId: Number.parseInt(formData.questionTypeId),
        sectionId: Number.parseInt(formData.sectionId),
        text: formData.text,
        options,
        correctAnswer,
        imageUrl: formData.imageUrl || null,
      }

      if (editingQuestion) {
        await fetch(`/api/admin/questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      mutate("/api/admin/questions")
      mutate("/api/admin/sections")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving question:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Bu savolni o'chirishni xohlaysizmi?")) return

    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" })
    mutate("/api/admin/questions")
    mutate("/api/admin/sections")
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Y1":
        return "bg-blue-100 text-blue-800"
      case "Y2":
        return "bg-purple-100 text-purple-800"
      case "O1":
        return "bg-green-100 text-green-800"
      case "O2":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Savollar boshqaruvi</h1>
          <p className="text-sm text-muted-foreground">
            Y1, O1, O2 savollarini qo&apos;shish (Y2 uchun &quot;Guruhlar&quot; bo&apos;limiga o&apos;ting)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Yangi savol</span>
          <span className="sm:hidden">Qo'shish</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterType} onValueChange={(v) => handleFilterChange("type", v)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha turlar</SelectItem>
            <SelectItem value="Y1">Y1</SelectItem>
            <SelectItem value="O1">O1</SelectItem>
            <SelectItem value="O2">O2</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={(v) => handleFilterChange("section", v)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Bo'lim" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha bo'limlar</SelectItem>
            {sections?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filteredQuestions.length > 0 && (
          <div className="text-sm text-muted-foreground self-center ml-auto">{filteredQuestions.length} ta savol</div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-20">Turi</TableHead>
                  <TableHead className="hidden sm:table-cell">Bo&apos;lim</TableHead>
                  <TableHead className="min-w-[200px]">Savol</TableHead>
                  <TableHead className="w-16 text-center">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingQuestions ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredQuestions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-base">Savollar topilmadi</p>
                      <p className="text-sm mt-1">Yangi savol qo'shish uchun tugmani bosing</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedQuestions.map((q) => (
                    <TableRow key={q.id} className="h-14">
                      <TableCell className="font-medium text-muted-foreground">{q.question_number}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeColor(q.question_type_code)}>{q.question_type_code}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {q.section_title}
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{q.text}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewQuestion(q)}
                            title="Ko'rish"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(q)}
                            title="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(q.id)}
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sahifa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span>Savol #{viewingQuestion?.question_number}</span>
              {viewingQuestion && (
                <Badge className={getTypeBadgeColor(viewingQuestion.question_type_code)}>
                  {viewingQuestion.question_type_code}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          {viewingQuestion && <QuestionDetails question={viewingQuestion} />}
        </SheetContent>
      </Sheet>

      <Dialog open={isViewOpen && !isMobile} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto hidden sm:block">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Savol #{viewingQuestion?.question_number}</span>
              {viewingQuestion && (
                <Badge className={getTypeBadgeColor(viewingQuestion.question_type_code)}>
                  {viewingQuestion.question_type_code}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingQuestion && <QuestionDetails question={viewingQuestion} />}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Savolni tahrirlash" : "Yangi savol qo'shish"}</DialogTitle>
            <DialogDescription>Savol raqami avtomatik belgilanadi (bo&apos;lim asosida)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Savol turi <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.questionTypeId}
                  onValueChange={(v) => setFormData({ ...formData, questionTypeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Turni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuestionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.code} - {type.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Bo&apos;lim <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.sectionId} onValueChange={(v) => setFormData({ ...formData, sectionId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bo'limni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((section) => (
                      <SelectItem key={section.id} value={section.id.toString()}>
                        {section.title} ({section.current_count || 0}/{section.task_count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Savol matni <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={4}
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Savol matnini kiriting..."
              />
            </div>

            <div className="space-y-2">
              <Label>Savol rasmi (ixtiyoriy)</Label>
              {formData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={formData.imageUrl || "/placeholder.svg"}
                    alt="Savol rasmi"
                    className="max-h-40 rounded-lg border object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50">
                  <input
                    type="file"
                    accept="image/png,image/jpg,image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="question-image-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="question-image-upload" className="flex cursor-pointer flex-col items-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Rasm yuklash (PNG, JPG, JPEG)</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            {selectedTypeCode === "Y1" && (
              <div className="space-y-4">
                <Label>
                  Variantlar <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["A", "B", "C", "D"].map((letter) => (
                    <div key={letter} className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{letter}</Label>
                      <Input
                        value={formData[`option${letter}` as keyof typeof formData] as string}
                        onChange={(e) => setFormData({ ...formData, [`option${letter}`]: e.target.value })}
                        placeholder={`${letter} varianti`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTypeCode === "Y1" && (
              <div className="space-y-2">
                <Label>
                  To&apos;g&apos;ri javob <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {["A", "B", "C", "D"].map((letter) => (
                    <Button
                      key={letter}
                      type="button"
                      variant={formData.y1CorrectAnswer === letter ? "default" : "outline"}
                      className={formData.y1CorrectAnswer === letter ? "ring-2 ring-green-500" : ""}
                      onClick={() => setFormData({ ...formData, y1CorrectAnswer: letter })}
                    >
                      {letter}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedTypeCode === "O1" && (
              <div className="space-y-2">
                <Label>
                  To&apos;g&apos;ri javob (son) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.o1Answer}
                  onChange={(e) => setFormData({ ...formData, o1Answer: e.target.value })}
                  placeholder="Raqam javobini kiriting"
                />
              </div>
            )}

            {selectedTypeCode === "O2" && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  O2 savollari rasm yuklash va matnli javob talab qiladi. To&apos;g&apos;ri javob o&apos;qituvchi
                  tomonidan baholanadi.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingQuestion ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuestionDetails({ question }: { question: Question }) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Y1":
        return "bg-blue-100 text-blue-800"
      case "O1":
        return "bg-green-100 text-green-800"
      case "O2":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <Label className="text-sm text-muted-foreground">Bo'lim</Label>
        <p className="font-medium">{question.section_title}</p>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Savol matni</Label>
        <p className="mt-1 p-3 bg-muted rounded-lg">{question.text}</p>
      </div>

      {question.image_url && (
        <div>
          <Label className="text-sm text-muted-foreground">Savol rasmi</Label>
          <img
            src={question.image_url || "/placeholder.svg"}
            alt="Savol rasmi"
            className="mt-2 max-h-48 rounded-lg border object-contain"
          />
        </div>
      )}

      {question.options && Object.keys(question.options).length > 0 && (
        <div>
          <Label className="text-sm text-muted-foreground">Variantlar</Label>
          <div className="mt-2 space-y-2">
            {Object.entries(question.options).map(([key, value]) => (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  key === question.correct_answer ? "bg-green-50 border-green-200" : "bg-background"
                }`}
              >
                <Badge
                  variant={key === question.correct_answer ? "default" : "outline"}
                  className={key === question.correct_answer ? "bg-green-600" : ""}
                >
                  {key}
                </Badge>
                <span>{value}</span>
                {key === question.correct_answer && (
                  <Badge className="ml-auto bg-green-100 text-green-800">To'g'ri</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {question.question_type_code === "O1" && question.correct_answer && (
        <div>
          <Label className="text-sm text-muted-foreground">To'g'ri javob</Label>
          <p className="mt-1 p-3 bg-green-50 rounded-lg border border-green-200 font-medium">
            {question.correct_answer}
          </p>
        </div>
      )}
    </div>
  )
}
