"use client"
import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Trash2, Loader2, X, Eye, FolderTree } from "lucide-react"
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

  const [viewingGroup, setViewingGroup] = useState<QuestionGroup | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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

  const handleViewGroup = (group: QuestionGroup) => {
    setViewingGroup(group)
    setIsViewOpen(true)
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Y2 Guruhli savollar</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kompozit savollar - bir savol matni, bir nechta sub-savollar
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="w-full sm:w-auto self-start">
          <Plus className="mr-2 h-4 w-4" />
          Yangi guruh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">#</TableHead>
                  <TableHead className="hidden sm:table-cell w-32">Bo&apos;lim</TableHead>
                  <TableHead>Savol matni</TableHead>
                  <TableHead className="w-20 text-center">Soni</TableHead>
                  <TableHead className="w-24 text-center">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingGroups ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="h-14">
                      <TableCell>
                        <Skeleton className="h-4 w-8 mx-auto" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full max-w-xs" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-10 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !groups || groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <FolderTree className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Hozircha Y2 guruhlar yo&apos;q</p>
                      <p className="text-xs mt-1">Yangi guruh qo'shish uchun tugmani bosing</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group, index) => (
                    <TableRow key={group.id} className="h-14">
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {group.section_title}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-xs lg:max-w-md">{group.stem}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-purple-100 text-purple-800">{group.questions?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewGroup(group)}
                            title="Ko'rish"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(group.id)}
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

      {isMobile ? (
        <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-xl">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <span>Y2 Guruh</span>
                <Badge className="bg-purple-100 text-purple-800">
                  {viewingGroup?.questions?.length || 0} ta sub-savol
                </Badge>
              </SheetTitle>
            </SheetHeader>
            {viewingGroup && <GroupDetails group={viewingGroup} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>Y2 Guruh</span>
                <Badge className="bg-purple-100 text-purple-800">
                  {viewingGroup?.questions?.length || 0} ta sub-savol
                </Badge>
              </DialogTitle>
            </DialogHeader>
            {viewingGroup && <GroupDetails group={viewingGroup} />}
          </DialogContent>
        </Dialog>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi Y2 guruh qo&apos;shish</DialogTitle>
            <DialogDescription>Bir umumiy savol matni va bir nechta sub-savollar kiriting.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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

            <div className="space-y-2">
              <Label>
                Umumiy savol matni (stem) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                value={formData.stem}
                onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                placeholder="Barcha sub-savollar uchun umumiy savol matnini kiriting..."
              />
            </div>

            <div className="space-y-3">
              <Label>
                Variantlar (A-F) <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["A", "B", "C", "D", "E", "F"].map((letter) => (
                  <div key={letter} className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 w-8 justify-center">
                      {letter}
                    </Badge>
                    <Input
                      value={formData[`option${letter}` as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [`option${letter}`]: e.target.value })}
                      placeholder={`${letter} varianti`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Sub-savollar <span className="text-destructive">*</span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddSubQuestion}>
                  <Plus className="h-4 w-4 mr-1" />
                  Qo&apos;shish
                </Button>
              </div>

              <div className="space-y-3">
                {subQuestions.map((sq, index) => (
                  <Card key={index} className="border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{index + 1}-sub-savol</Badge>
                        {subQuestions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveSubQuestion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr,120px] gap-3">
                        <Input
                          value={sq.text}
                          onChange={(e) => handleSubQuestionChange(index, "text", e.target.value)}
                          placeholder="Sub-savol matnini kiriting..."
                        />
                        <Select
                          value={sq.correctAnswer}
                          onValueChange={(v) => handleSubQuestionChange(index, "correctAnswer", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Javob" />
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

          <DialogFooter className="gap-2 sm:gap-0">
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

function GroupDetails({ group }: { group: QuestionGroup }) {
  return (
    <div className="space-y-5 pt-4">
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Bo'lim</Label>
        <p className="font-medium mt-1">{group.section_title}</p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Savol matni (Stem)</Label>
        <p className="mt-1 p-3 bg-muted rounded-lg text-sm leading-relaxed">{group.stem}</p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Variantlar (A-F)</Label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(group.options || {}).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 p-2 bg-muted/50 rounded border">
              <Badge variant="outline" className="shrink-0">
                {key}
              </Badge>
              <span className="text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sub-savollar</Label>
        <div className="mt-2 space-y-2">
          {!group.questions || group.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded">Sub-savollar mavjud emas</p>
          ) : (
            group.questions.map((sq) => (
              <div key={sq.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                <Badge className="bg-blue-100 text-blue-800 shrink-0">{sq.order_in_group}</Badge>
                <span className="flex-1 text-sm">{sq.text}</span>
                <Badge className="bg-green-100 text-green-800 shrink-0">{sq.correct_answer}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
