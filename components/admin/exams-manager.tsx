"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Plus, Pencil, Trash2, Loader2, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

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

interface SendResultsCounts {
  pending_count: number
  sent_count: number
  not_finalized_count: number
}

export function ExamsManager() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: exams, isLoading: loadingExams } = useSWR<Exam[]>("/api/admin/exams", fetcher)

  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [sendCounts, setSendCounts] = useState<SendResultsCounts | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [sending, setSending] = useState(false)

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

  const handleOpenSendDialog = async (exam: Exam) => {
    setSelectedExam(exam)
    setSendDialogOpen(true)
    setLoadingCounts(true)
    setSendCounts(null)

    try {
      const res = await fetch(`/api/admin/send-results?examId=${exam.id}`)
      if (res.ok) {
        const data = await res.json()
        setSendCounts(data)
      }
    } catch (error) {
      console.error("Error fetching counts:", error)
    } finally {
      setLoadingCounts(false)
    }
  }

  const handleSendResults = async () => {
    if (!selectedExam) return

    setSending(true)
    try {
      const res = await fetch("/api/admin/send-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: selectedExam.id }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: "Natijalar yuborildi",
          description: `${data.sent_count} ta studentga yuborildi${data.failed_count > 0 ? `, ${data.failed_count} ta xatolik` : ""}`,
        })
        setSendDialogOpen(false)
      } else {
        toast({
          title: "Xatolik",
          description: data.error || "Natijalarni yuborishda xatolik",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Server bilan bog'lanishda xatolik",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
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
                <TableHead className="w-40">Amallar</TableHead>
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenSendDialog(exam)}
                          title="Natijalarni yuborish"
                        >
                          <Send className="h-4 w-4 text-blue-600" />
                        </Button>
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

      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Natijalarni Telegram orqali yuborish</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{selectedExam?.name}</strong> imtihoni natijalari studentlarga yuboriladi.
                </p>
                {loadingCounts ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tekshirilmoqda...
                  </div>
                ) : sendCounts ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-green-600">
                      Yuborishga tayyor: <strong>{sendCounts.pending_count}</strong> ta
                    </p>
                    <p className="text-muted-foreground">
                      Allaqachon yuborilgan: <strong>{sendCounts.sent_count}</strong> ta
                    </p>
                    {sendCounts.not_finalized_count > 0 && (
                      <p className="text-amber-600">
                        Yakunlanmagan (O2 baholanmagan): <strong>{sendCounts.not_finalized_count}</strong> ta
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendResults}
              disabled={sending || loadingCounts || (sendCounts?.pending_count || 0) === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Yuborish
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
