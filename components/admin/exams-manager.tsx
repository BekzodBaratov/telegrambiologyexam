"use client"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Exam {
  id: number
  name: string
  subject_id: number
  subject_name: string
  test_duration: number
  written_duration: number
  is_active: boolean
  created_at: string
  question_count: number
}

export function ExamsManager() {
  const router = useRouter()
  const { data: exams, isLoading: loadingExams } = useSWR<Exam[]>("/api/admin/exams", fetcher)

  const handleDelete = async (id: number) => {
    if (!confirm("Bu imtihonni o'chirishni xohlaysizmi?")) return

    await fetch(`/api/admin/exams/${id}`, { method: "DELETE" })
    mutate("/api/admin/exams")
  }

  const handleToggleActive = async (exam: Exam) => {
    await fetch(`/api/admin/exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !exam.is_active }),
    })
    mutate("/api/admin/exams")
  }

  const handleCreateExam = () => {
    router.push("/admin/exams/new")
  }

  const handleEditExam = (examId: number) => {
    router.push(`/admin/exams/${examId}/edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Imtihonlar boshqaruvi</h1>
          <p className="text-muted-foreground">Imtihonlarni yaratish va boshqarish</p>
        </div>
        <Button onClick={handleCreateExam}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi imtihon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Imtihonlar ro&apos;yxati
          </CardTitle>
          <CardDescription>Har bir imtihon tanlangan savollar asosida tuziladi</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imtihon nomi</TableHead>
                <TableHead>Fan</TableHead>
                <TableHead>Test vaqti</TableHead>
                <TableHead>Yozma vaqti</TableHead>
                <TableHead>Savollar</TableHead>
                <TableHead>Faollashtirish</TableHead>
                <TableHead className="w-32">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExams ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : exams?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Hozircha imtihonlar yo&apos;q
                  </TableCell>
                </TableRow>
              ) : (
                exams?.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">{exam.name}</TableCell>
                    <TableCell className="text-muted-foreground">{exam.subject_name}</TableCell>
                    <TableCell>{exam.test_duration} daqiqa</TableCell>
                    <TableCell>{exam.written_duration} daqiqa</TableCell>
                    <TableCell>{exam.question_count}</TableCell>
                    <TableCell>
                      <Switch checked={exam.is_active} onCheckedChange={() => handleToggleActive(exam)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditExam(exam.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
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
    </div>
  )
}
