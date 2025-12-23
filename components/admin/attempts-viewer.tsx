"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Eye, Loader2, Search, ChevronLeft, ChevronRight, Users, AlertCircle, Clock, FileCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ITEMS_PER_PAGE = 20

interface Attempt {
  id: number
  student_id: number
  exam_id: number
  student_name: string
  telegram_id: string
  region?: string
  district?: string
  phone?: string
  exam_name: string
  code_used: string
  status: string
  started_at: string
  finished_at: string | null
  part1_started_at: string | null
  part1_finished_at: string | null
  part2_started_at: string | null
  part2_finished_at: string | null
  total_score: number | null
  final_score: number | null
  certificate_level: string | null
  y1_score: number
  y2_score: number
  o1_score: number
  o2_score: number
  has_o2: boolean
  o2_fully_checked: boolean
  rasch_score: number | null
  test_duration: number
  written_duration: number
  total_questions: number
  correct_count: number
  incorrect_count: number
  unanswered_count: number
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

function getCertificateLevel(percentage: number | null): { level: string; color: string } | null {
  if (percentage === null) return null
  if (percentage >= 90) return { level: "A+", color: "bg-emerald-500 text-white" }
  if (percentage >= 80) return { level: "A", color: "bg-green-500 text-white" }
  if (percentage >= 70) return { level: "B", color: "bg-blue-500 text-white" }
  if (percentage >= 60) return { level: "C", color: "bg-amber-500 text-white" }
  return null
}

export function AttemptsViewer() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: attempts, isLoading } = useSWR<Attempt[]>("/api/admin/attempts", fetcher)
  const { data: answers, isLoading: loadingAnswers } = useSWR<Answer[]>(
    selectedAttempt ? `/api/admin/answers/${selectedAttempt.id}` : null,
    fetcher,
  )

  const filteredAttempts =
    attempts?.filter(
      (a) =>
        a.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.telegram_id?.includes(searchTerm) ||
        a.code_used?.includes(searchTerm),
    ) || []

  const totalPages = Math.ceil(filteredAttempts.length / ITEMS_PER_PAGE)
  const paginatedAttempts = filteredAttempts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleViewDetails = (attempt: Attempt) => {
    setSelectedAttempt(attempt)
    setIsDialogOpen(true)
  }

  const getStatusBadge = (status: string, hasO2: boolean, o2FullyChecked: boolean) => {
    if (status === "in_progress") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          Davom etmoqda
        </Badge>
      )
    }
    if (status === "completed" && hasO2 && !o2FullyChecked) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          O2 kutilmoqda
        </Badge>
      )
    }
    if (status === "completed") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          Tugallangan
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
        {status}
      </Badge>
    )
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Urinishlar</h1>
        <p className="text-sm text-muted-foreground">Barcha imtihon urinishlari va natijalar</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ism, Telegram ID yoki kod..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>
        {filteredAttempts.length > 0 && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" />
            {filteredAttempts.length} ta urinish
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talaba</TableHead>
                  <TableHead className="hidden md:table-cell">Imtihon</TableHead>
                  <TableHead className="text-center">Yakuniy ball</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Foiz</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Sertifikat</TableHead>
                  <TableHead className="hidden sm:table-cell">Holat</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20 mt-1" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 mx-auto" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-4 w-12 mx-auto" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Skeleton className="h-6 w-12 mx-auto" />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredAttempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-base font-medium">Urinishlar topilmadi</p>
                      <p className="text-sm mt-1">Qidiruv so'rovingizni o'zgartiring</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAttempts.map((attempt) => {
                    // Calculate final score and percentage
                    const hasPendingO2 = attempt.has_o2 && !attempt.o2_fully_checked
                    const finalScore = hasPendingO2 ? null : (attempt.final_score ?? attempt.total_score)
                    const percentage = finalScore !== null ? Math.round((finalScore / 100) * 1000) / 10 : null
                    const cert = getCertificateLevel(percentage)

                    return (
                      <TableRow key={attempt.id} className="h-16">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{attempt.student_name || "Noma'lum"}</span>
                            <span className="text-xs text-muted-foreground">ID: {attempt.telegram_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {attempt.exam_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasPendingO2 ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              O2 kutilmoqda
                            </Badge>
                          ) : finalScore !== null ? (
                            <span className="font-semibold text-base">{finalScore.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell text-muted-foreground">
                          {hasPendingO2 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : percentage !== null ? (
                            <span className="font-medium">{percentage}%</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {hasPendingO2 ? (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                              Berilmagan
                            </Badge>
                          ) : cert ? (
                            <Badge className={cert.color}>{cert.level}</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                              Berilmagan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getStatusBadge(attempt.status, attempt.has_o2, attempt.o2_fully_checked)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(attempt)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
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

      {/* Details Sheet (mobile) */}
      <Sheet open={isDialogOpen && isMobile} onOpenChange={setIsDialogOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle>{selectedAttempt?.student_name || "Talaba"}</SheetTitle>
            <SheetDescription>Imtihon natijalari va batafsil ma'lumot</SheetDescription>
          </SheetHeader>
          {selectedAttempt && (
            <AttemptDetails
              attempt={selectedAttempt}
              answers={answers}
              loadingAnswers={loadingAnswers}
              onGoToO2={() => {
                setIsDialogOpen(false)
                router.push("/admin/o2-evaluation")
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Details Dialog (desktop) */}
      <Dialog open={isDialogOpen && !isMobile} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto hidden sm:block">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedAttempt?.student_name || "Talaba"} - Batafsil</DialogTitle>
          </DialogHeader>
          {selectedAttempt && (
            <AttemptDetails
              attempt={selectedAttempt}
              answers={answers}
              loadingAnswers={loadingAnswers}
              onGoToO2={() => {
                setIsDialogOpen(false)
                router.push("/admin/o2-evaluation")
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AttemptDetails({
  attempt,
  answers,
  loadingAnswers,
  onGoToO2,
}: {
  attempt: Attempt
  answers?: Answer[]
  loadingAnswers: boolean
  onGoToO2: () => void
}) {
  const hasPendingO2 = attempt.has_o2 && !attempt.o2_fully_checked
  const finalScore = hasPendingO2 ? null : (attempt.final_score ?? attempt.total_score)
  const percentage = finalScore !== null ? Math.round((finalScore / 100) * 1000) / 10 : null
  const cert = getCertificateLevel(percentage)

  // Calculate time spent
  const timeSpent = attempt.finished_at
    ? Math.round((new Date(attempt.finished_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)
    : null

  return (
    <div className="space-y-6 pt-4">
      {/* Pending O2 Warning */}
      {hasPendingO2 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Bu urinish uchun O2 baholash tugallanishi kerak. Yakuniy natija O2 baholangandan so'ng ko'rsatiladi.
          </AlertDescription>
          <Button variant="outline" size="sm" onClick={onGoToO2} className="mt-3 bg-white border-amber-400">
            O2 baholashga o'tish
          </Button>
        </Alert>
      )}

      {/* A) Student Info */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Talaba ma'lumotlari</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ism-familiya:</span>
              <p className="font-medium mt-1">{attempt.student_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Telegram ID:</span>
              <p className="font-medium mt-1">{attempt.telegram_id}</p>
            </div>
            {attempt.region && (
              <div>
                <span className="text-muted-foreground">Viloyat:</span>
                <p className="font-medium mt-1">{attempt.region}</p>
              </div>
            )}
            {attempt.district && (
              <div>
                <span className="text-muted-foreground">Tuman:</span>
                <p className="font-medium mt-1">{attempt.district}</p>
              </div>
            )}
            {attempt.phone && (
              <div>
                <span className="text-muted-foreground">Telefon:</span>
                <p className="font-medium mt-1">{attempt.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* B) Exam Info */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Imtihon ma'lumotlari</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Imtihon nomi:</span>
              <p className="font-medium mt-1">{attempt.exam_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Test kodi:</span>
              <p className="font-medium mt-1">
                <Badge variant="secondary">{attempt.code_used}</Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Boshlangan:</span>
              <p className="font-medium mt-1">{new Date(attempt.started_at).toLocaleString("uz-UZ")}</p>
            </div>
            {attempt.finished_at && (
              <div>
                <span className="text-muted-foreground">Tugatilgan:</span>
                <p className="font-medium mt-1">{new Date(attempt.finished_at).toLocaleString("uz-UZ")}</p>
              </div>
            )}
            {timeSpent && (
              <div>
                <span className="text-muted-foreground">Umumiy davomiyligi:</span>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {timeSpent} daqiqa
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* C) Score Breakdown */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Balllar taqsimoti</Label>

          {/* Component Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs text-blue-700 font-medium mb-1">Y1</p>
              <p className="text-2xl font-bold text-blue-900">{attempt.y1_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <p className="text-xs text-purple-700 font-medium mb-1">Y2</p>
              <p className="text-2xl font-bold text-purple-900">{attempt.y2_score.toFixed(1)}</p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-xs text-green-700 font-medium mb-1">O1</p>
              <p className="text-2xl font-bold text-green-900">{attempt.o1_score.toFixed(1)}</p>
            </div>
            <div
              className={`p-4 rounded-lg text-center ${
                hasPendingO2 ? "bg-amber-50 border border-amber-200" : "bg-orange-50 border border-orange-200"
              }`}
            >
              <p className={`text-xs font-medium mb-1 ${hasPendingO2 ? "text-amber-700" : "text-orange-700"}`}>O2</p>
              <p className={`text-2xl font-bold ${hasPendingO2 ? "text-amber-900" : "text-orange-900"}`}>
                {hasPendingO2 ? "—" : attempt.o2_score.toFixed(1)}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Combined Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Umumiy ball</p>
              <p className="text-3xl font-bold">
                {hasPendingO2 ? (
                  <span className="text-amber-600">Kutilmoqda</span>
                ) : finalScore !== null ? (
                  finalScore.toFixed(1)
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Foiz</p>
              <p className="text-3xl font-bold">
                {hasPendingO2 ? (
                  <span className="text-amber-600">—</span>
                ) : percentage !== null ? (
                  `${percentage}%`
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Sertifikat darajasi</p>
              <p className="text-3xl font-bold">
                {hasPendingO2 ? (
                  <Badge variant="outline" className="text-base">
                    Berilmagan
                  </Badge>
                ) : cert ? (
                  <Badge className={`${cert.color} text-xl px-4 py-1`}>{cert.level}</Badge>
                ) : (
                  <Badge variant="outline" className="text-base">
                    Berilmagan
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* D) Question Performance Summary */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Savollarga javoblar xulasasi</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 border rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Jami savollar</p>
              <p className="text-xl font-bold">{attempt.total_questions}</p>
            </div>
            <div className="p-3 border border-green-200 bg-green-50 rounded-lg text-center">
              <p className="text-xs text-green-700 mb-1">To'g'ri javoblar</p>
              <p className="text-xl font-bold text-green-900">{attempt.correct_count}</p>
            </div>
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-center">
              <p className="text-xs text-red-700 mb-1">Noto'g'ri javoblar</p>
              <p className="text-xl font-bold text-red-900">{attempt.incorrect_count}</p>
            </div>
            <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-700 mb-1">Javobsiz</p>
              <p className="text-xl font-bold text-gray-900">{attempt.unanswered_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E) Rasch Info */}
      {attempt.rasch_score !== null && (
        <Card>
          <CardContent className="pt-6">
            <Label className="text-base font-semibold mb-4 block">Rasch ma'lumotlari (Faqat o'qish)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 border rounded-lg">
                <span className="text-muted-foreground">Rasch balli:</span>
                <p className="font-mono font-bold text-lg mt-1">{attempt.rasch_score.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Answers list */}
      <div>
        <Label className="text-base font-semibold mb-4 block">Barcha javoblar</Label>
        {loadingAnswers ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Javoblar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {answers?.map((answer) => (
              <Card key={answer.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono">
                          #{answer.question_number}
                        </Badge>
                        <Badge variant="outline">{answer.question_type_code}</Badge>
                        {answer.is_correct === true && <Badge className="bg-green-500 text-white">To'g'ri</Badge>}
                        {answer.is_correct === false && <Badge className="bg-red-500 text-white">Noto'g'ri</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{answer.question_text}</p>
                      <p className="font-medium text-sm">
                        Javob: <span className="text-foreground">{answer.answer || "—"}</span>
                      </p>
                      {answer.image_urls && answer.image_urls.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {answer.image_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`Rasm ${i + 1}`}
                                className="h-20 w-20 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Ball</p>
                      <p className="text-2xl font-bold">{answer.teacher_score ?? answer.score ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
