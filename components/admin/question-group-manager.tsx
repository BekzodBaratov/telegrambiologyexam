"use client"
import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Trash2, Loader2, X, ChevronDown, ChevronUp } from "lucide-react"
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
import { Fragment } from "react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SubQuestion {
  id?: number
  text: string
  correctAnswer: string
}

interface QuestionGroup {
  id: number
  stem: string
  options: Record<string, string>
  section_id: number
  section_title: string
  questions: {
    id: number
    text: string
    correct_answer: string
    question_number: number
    order_in_group: number
  }[]
  created_at: string
}

interface Section {
  id: number
  title: string
  task_count: number
  subject_id: number
  current_count?: number
}

export function QuestionGroupManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const [formData, setFormData] = useState({
    sectionId: "",
    stem: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    optionF: "",
  })

  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([{ text: "", correctAnswer: "" }])

  const { data: groups, isLoading: loadingGroups } = useSWR<QuestionGroup[]>("/api/admin/question-groups", fetcher)
  const { data: sections } = useSWR<Section[]>("/api/admin/sections", fetcher)

  const handleOpenDialog = () => {
    setFormData({
      sectionId: "",
      stem: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      optionE: "",
      optionF: "",
    })
    setSubQuestions([{ text: "", correctAnswer: "" }])
    setIsDialogOpen(true)
  }

  const handleAddSubQuestion = () => {
    setSubQuestions([...subQuestions, { text: "", correctAnswer: "" }])
  }

  const handleRemoveSubQuestion = (index: number) => {
    if (subQuestions.length > 1) {
      setSubQuestions(subQuestions.filter((_, i) => i !== index))
    }
  }

  const handleSubQuestionChange = (index: number, field: keyof SubQuestion, value: string) => {
    const updated = [...subQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setSubQuestions(updated)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const options = {
        A: formData.optionA,
        B: formData.optionB,
        C: formData.optionC,
        D: formData.optionD,
        E: formData.optionE,
        F: formData.optionF,
      }

      const payload = {
        sectionId: Number.parseInt(formData.sectionId),
        stem: formData.stem,
        options,
        subQuestions: subQuestions.map((sq, index) => ({
          text: sq.text,
          correctAnswer: sq.correctAnswer,
          orderInGroup: index + 1,
        })),
      }

      await fetch("/api/admin/question-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      mutate("/api/admin/question-groups")
      mutate("/api/admin/questions")
      mutate("/api/admin/sections")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving question group:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Bu guruh va barcha sub-savollarni o'chirishni xohlaysizmi?")) return

    await fetch(`/api/admin/question-groups/${id}`, { method: "DELETE" })
    mutate("/api/admin/question-groups")
    mutate("/api/admin/questions")
    mutate("/api/admin/sections")
  }

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedGroups(newExpanded)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Y2 Guruhli savollar</h1>
          <p className="text-muted-foreground">Kompozit savollar - bir savol matni, bir nechta sub-savollar</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi guruh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Bo&apos;lim</TableHead>
                <TableHead>Savol matni (stem)</TableHead>
                <TableHead className="w-32">Sub-savollar</TableHead>
                <TableHead className="w-24">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingGroups ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : groups?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Hozircha Y2 guruhlar yo&apos;q
                  </TableCell>
                </TableRow>
              ) : (
                groups?.map((group) => (
                  <Fragment key={group.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpanded(group.id)}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(group.id)
                          }}
                        >
                          {expandedGroups.has(group.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{group.section_title}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{group.stem}</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-100 text-purple-800">{group.questions?.length || 0} ta</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(group.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedGroups.has(group.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="p-4">
                          <div className="space-y-4">
                            {/* Full stem text */}
                            <div>
                              <Label className="text-sm font-medium">To'liq savol matni:</Label>
                              <p className="mt-1 text-sm bg-background p-3 rounded-md border">{group.stem}</p>
                            </div>

                            {/* Options */}
                            <div>
                              <Label className="text-sm font-medium">Variantlar (A-F):</Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                {Object.entries(group.options || {}).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 p-2 bg-background rounded border">
                                    <Badge variant="outline" className="font-bold">
                                      {key}
                                    </Badge>
                                    <span className="text-sm">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Sub-questions - CRITICAL: Must be visible */}
                            <div>
                              <Label className="text-sm font-medium">Sub-savollar:</Label>
                              <div className="space-y-2 mt-2">
                                {!group.questions || group.questions.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">Sub-savollar mavjud emas</p>
                                ) : (
                                  group.questions.map((sq) => (
                                    <div
                                      key={sq.id}
                                      className="flex items-center gap-3 p-3 bg-background rounded border"
                                    >
                                      <Badge className="bg-blue-100 text-blue-800 font-bold">
                                        {sq.order_in_group}-sub
                                      </Badge>
                                      <span className="flex-1 text-sm">{sq.text}</span>
                                      <Badge className="bg-green-100 text-green-800">Javob: {sq.correct_answer}</Badge>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        #{sq.question_number}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi Y2 guruh qo&apos;shish</DialogTitle>
            <DialogDescription>Bir umumiy savol matni va bir nechta sub-savollar kiriting.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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

            <div className="space-y-2">
              <Label>Umumiy savol matni (stem)</Label>
              <Textarea
                rows={3}
                value={formData.stem}
                onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                placeholder="Barcha sub-savollar uchun umumiy savol matnini kiriting..."
              />
            </div>

            <div className="space-y-4">
              <Label>Variantlar (A-F)</Label>
              <div className="grid grid-cols-2 gap-3">
                {["A", "B", "C", "D", "E", "F"].map((letter) => (
                  <div key={letter} className="space-y-1">
                    <Label className="text-sm text-muted-foreground">{letter}</Label>
                    <Input
                      value={formData[`option${letter}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`option${letter}`]: e.target.value })}
                      placeholder={`${letter} varianti`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Sub-savollar</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddSubQuestion}>
                  <Plus className="h-4 w-4 mr-1" />
                  Qo&apos;shish
                </Button>
              </div>

              <div className="space-y-3">
                {subQuestions.map((sq, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{index + 1}-sub-savol</Badge>
                        {subQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSubQuestion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Savol matni</Label>
                        <Input
                          value={sq.text}
                          onChange={(e) => handleSubQuestionChange(index, "text", e.target.value)}
                          placeholder="Sub-savol matnini kiriting..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">To&apos;g&apos;ri javob</Label>
                        <Select
                          value={sq.correctAnswer}
                          onValueChange={(v) => handleSubQuestionChange(index, "correctAnswer", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                          <SelectContent>
                            {["A", "B", "C", "D", "E", "F"].map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
