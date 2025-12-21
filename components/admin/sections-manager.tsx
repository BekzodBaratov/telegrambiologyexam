"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Pencil, Trash2, Loader2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Section {
  id: number
  title: string
  task_count: number
  max_questions_per_exam: number
  subject_id: number
  subject_name: string
  current_count: number
  start_position: number
  end_position: number
}

interface Subject {
  id: number
  name: string
}

export function SectionsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    taskCount: "",
    maxQuestionsPerExam: "",
    subjectId: "",
  })

  const { data: sections, isLoading: loadingSections } = useSWR<Section[]>("/api/admin/sections", fetcher)
  const { data: subjects } = useSWR<Subject[]>("/api/admin/subjects", fetcher)

  const handleOpenDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section)
      setFormData({
        title: section.title,
        taskCount: section.task_count.toString(),
        maxQuestionsPerExam: (section.max_questions_per_exam || section.task_count).toString(),
        subjectId: section.subject_id.toString(),
      })
    } else {
      setEditingSection(null)
      setFormData({
        title: "",
        taskCount: "10",
        maxQuestionsPerExam: "10",
        subjectId: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const payload = {
        title: formData.title,
        taskCount: Number.parseInt(formData.taskCount),
        maxQuestionsPerExam: Number.parseInt(formData.maxQuestionsPerExam),
        subjectId: Number.parseInt(formData.subjectId),
      }

      if (editingSection) {
        await fetch(`/api/admin/sections/${editingSection.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch("/api/admin/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      mutate("/api/admin/sections")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving section:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Bu bo'limni o'chirishni xohlaysizmi? Bo'limdagi barcha savollar ham o'chiriladi.")) return

    await fetch(`/api/admin/sections/${id}`, { method: "DELETE" })
    mutate("/api/admin/sections")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bo&apos;limlar boshqaruvi</h1>
          <p className="text-muted-foreground">Savol bo&apos;limlari va pozitsiyalarini boshqarish</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi bo&apos;lim
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Savollar bo&apos;limlari
          </CardTitle>
          <CardDescription>
            Har bir bo&apos;lim ma&apos;lum sonli savollarni o&apos;z ichiga oladi. Savol raqamlari avtomatik
            belgilanadi.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bo&apos;lim nomi</TableHead>
                <TableHead>Fan</TableHead>
                <TableHead>Mavjud savollar</TableHead>
                <TableHead>Imtihon uchun limit</TableHead>
                <TableHead className="w-32">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSections ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sections?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Hozircha bo&apos;limlar yo&apos;q
                  </TableCell>
                </TableRow>
              ) : (
                sections?.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.title}</TableCell>
                    <TableCell className="text-muted-foreground">{section.subject_name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{section.current_count}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">
                        {section.max_questions_per_exam || section.task_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(section)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(section.id)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Bo'limni tahrirlash" : "Yangi bo'lim qo'shish"}</DialogTitle>
            <DialogDescription>
              Bo&apos;lim savollar guruhini belgilaydi. Savollar avtomatik raqamlanadi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bo&apos;lim nomi</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Masalan: Hujayraning tuzilishi"
              />
            </div>

            <div className="space-y-2">
              <Label>Fan</Label>
              <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
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

            <div className="space-y-2">
              <Label>Savollar soni (jami)</Label>
              <Input
                type="number"
                min="1"
                value={formData.taskCount}
                onChange={(e) => setFormData({ ...formData, taskCount: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Bu bo&apos;limda nechta savol bo&apos;lishi mumkinligini belgilang
              </p>
            </div>

            <div className="space-y-2">
              <Label>Imtihon uchun maksimal savollar</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxQuestionsPerExam}
                onChange={(e) => setFormData({ ...formData, maxQuestionsPerExam: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Bitta imtihonga bu bo&apos;limdan nechta savol tanlash mumkin
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSection ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
