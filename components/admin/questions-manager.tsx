"use client"

import type React from "react"
import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Pencil, Trash2, Loader2, Upload, X, ImageIcon } from "lucide-react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Savollar boshqaruvi</h1>
          <p className="text-muted-foreground">
            Y1, O1, O2 savollarini qo&apos;shish (Y2 uchun &quot;Guruhlar&quot; bo&apos;limiga o&apos;ting)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi savol
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead className="w-24">Turi</TableHead>
                <TableHead>Bo&apos;lim</TableHead>
                <TableHead>Savol matni</TableHead>
                <TableHead className="w-20">Rasm</TableHead>
                <TableHead className="w-32">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingQuestions ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : questions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Hozircha savollar yo&apos;q
                  </TableCell>
                </TableRow>
              ) : (
                questions?.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.question_number}</TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(q.question_type_code)}>{q.question_type_code}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.section_title}</TableCell>
                    <TableCell className="max-w-md truncate">{q.text}</TableCell>
                    <TableCell>
                      {q.image_url ? (
                        <ImageIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Savolni tahrirlash" : "Yangi savol qo'shish"}</DialogTitle>
            <DialogDescription>Savol raqami avtomatik belgilanadi (bo&apos;lim asosida)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Savol turi</Label>
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
                <Label>Bo&apos;lim</Label>
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
              <Label>Savol matni</Label>
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
                        <span className="text-sm text-muted-foreground">
                          Rasm yuklash uchun bosing (PNG, JPG, JPEG)
                        </span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>

            {selectedTypeCode === "Y1" && (
              <div className="space-y-4">
                <Label>Variantlar</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">A</Label>
                    <Input
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                      placeholder="A varianti"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">B</Label>
                    <Input
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                      placeholder="B varianti"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">C</Label>
                    <Input
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                      placeholder="C varianti"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">D</Label>
                    <Input
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                      placeholder="D varianti"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedTypeCode === "Y1" && (
              <div className="space-y-2">
                <Label>To&apos;g&apos;ri javob</Label>
                <Select
                  value={formData.y1CorrectAnswer}
                  onValueChange={(v) => setFormData({ ...formData, y1CorrectAnswer: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="To'g'ri javobni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTypeCode === "O1" && (
              <div className="space-y-2">
                <Label>To&apos;g&apos;ri javob (son)</Label>
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

          <DialogFooter>
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
