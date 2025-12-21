"use client"

import { useState } from "react"
import useSWR from "swr"
import { Eye, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Attempt {
  id: number
  student_name: string
  exam_name: string
  code_used: string
  status: string
  started_at: string
  finished_at: string | null
  total_score: number | null
}

interface Answer {
  id: number
  question_number: number
  question_text: string
  question_type_code: string
  answer: string | null
  image_urls: string[] | null
  is_correct: boolean | null
  score: number | null
  teacher_score: number | null
}

export function AttemptsViewer() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: attempts, isLoading } = useSWR<Attempt[]>("/api/admin/attempts", fetcher)
  const { data: answers, isLoading: loadingAnswers } = useSWR<Answer[]>(
    selectedAttempt ? `/api/admin/answers/${selectedAttempt.id}` : null,
    fetcher,
  )

  const filteredAttempts = attempts?.filter(
    (a) => a.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || a.code_used.includes(searchTerm),
  )

  const handleViewDetails = (attempt: Attempt) => {
    setSelectedAttempt(attempt)
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Tugallangan</Badge>
      case "part1_complete":
        return <Badge className="bg-blue-100 text-blue-800">1-qism tugallangan</Badge>
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800">Davom etmoqda</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">O&apos;quvchi urinishlari</h1>
        <p className="text-muted-foreground">Barcha imtihon urinishlarini ko&apos;rish</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ism yoki kod bo'yicha qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>O&apos;quvchi</TableHead>
                <TableHead>Imtihon</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Boshlangan</TableHead>
                <TableHead>Ball</TableHead>
                <TableHead className="w-24">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredAttempts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Urinishlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttempts?.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.student_name || "Noma'lum"}</TableCell>
                    <TableCell>{attempt.exam_name}</TableCell>
                    <TableCell className="font-mono">{attempt.code_used}</TableCell>
                    <TableCell>{getStatusBadge(attempt.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(attempt.started_at).toLocaleString("uz")}
                    </TableCell>
                    <TableCell>{attempt.total_score ?? "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(attempt)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAttempt?.student_name || "O'quvchi"} - javoblar</DialogTitle>
            <DialogDescription>
              Kod: {selectedAttempt?.code_used} | {selectedAttempt?.exam_name}
            </DialogDescription>
          </DialogHeader>

          {loadingAnswers ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-4">
              {answers?.map((answer) => (
                <Card key={answer.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold">#{answer.question_number}</span>
                          <Badge variant="outline">{answer.question_type_code}</Badge>
                          {answer.is_correct === true && (
                            <Badge className="bg-green-100 text-green-800">To&apos;g&apos;ri</Badge>
                          )}
                          {answer.is_correct === false && (
                            <Badge className="bg-red-100 text-red-800">Noto&apos;g&apos;ri</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{answer.question_text}</p>
                        <p className="font-medium">Javob: {answer.answer || "-"}</p>
                        {answer.image_urls && answer.image_urls.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {answer.image_urls.map((url, i) => (
                              <img
                                key={i}
                                src={url || "/placeholder.svg"}
                                alt={`Rasm ${i + 1}`}
                                className="h-24 w-24 object-cover rounded border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Ball</p>
                        <p className="text-xl font-bold">{answer.teacher_score ?? answer.score ?? "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
