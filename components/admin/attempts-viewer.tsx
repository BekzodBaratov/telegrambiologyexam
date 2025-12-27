"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Eye, Search, ChevronLeft, ChevronRight, Users, AlertCircle, FileCheck2, Clock, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const ITEMS_PER_PAGE = 20

interface Attempt {
  id: number
  student_id: number
  exam_id: number
  student_name: string
  telegram_id: string
  region: string | null
  district: string | null
  phone_number: string | null
  exam_name: string
  code_used: string
  status: string
  started_at: string
  finished_at: string | null
  part1_score: number | null
  part2_score: number | null
  final_score: number | null
  percentage: number | null
  certificate_level: string | null
  has_o2: boolean
  o2_fully_checked: boolean
}

interface PaginatedResponse {
  data: Attempt[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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

function getCertificateBadge(level: string | null): { level: string; color: string } | null {
  if (!level) return null
  const badges: Record<string, { level: string; color: string }> = {
    "A+": { level: "A+", color: "bg-emerald-500 text-white" },
    A: { level: "A", color: "bg-green-500 text-white" },
    "B+": { level: "B+", color: "bg-blue-500 text-white" },
    B: { level: "B", color: "bg-sky-500 text-white" },
    "C+": { level: "C+", color: "bg-amber-500 text-white" },
    C: { level: "C", color: "bg-orange-500 text-white" },
  }
  return badges[level] || null
}

function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—"
  }
  return `${value.toFixed(1)}%`
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
    return "—"
  }
  return value.toString()
}

export function AttemptsViewer() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: response, isLoading } = useSWR<PaginatedResponse>(
    `/api/admin/attempts?page=${currentPage}&limit=${ITEMS_PER_PAGE}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    fetcher,
  )

  const { data: answers, isLoading: loadingAnswers } = useSWR<Answer[]>(
    selectedAttempt ? `/api/admin/answers/${selectedAttempt.id}` : null,
    fetcher,
  )

  const attempts = Array.isArray(response?.data) ? response.data : []
  const pagination = response?.pagination
  const totalPages = pagination?.totalPages || 1

  const handleViewDetails = (attempt: Attempt) => {
    setSelectedAttempt(attempt)
    setIsDialogOpen(true)
  }

  const getStatusBadge = (attempt: Attempt) => {
    if (attempt.status === "in_progress") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          <Clock className="w-3 h-3 mr-1" />
          Davom etmoqda
        </Badge>
      )
    }
    if (attempt.status === "completed" && attempt.has_o2 && !attempt.o2_fully_checked) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          O2 kutilmoqda
        </Badge>
      )
    }
    if (attempt.status === "completed") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          Yakunlangan
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
        {attempt.status}
      </Badge>
    )
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return "—"
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    if (hours > 0) {
      return `${hours} soat ${mins} daqiqa`
    }
    return `${mins} daqiqa`
  }

  const isPendingResult = (attempt: Attempt): boolean => {
    return attempt.status === "completed" && attempt.has_o2 && !attempt.o2_fully_checked
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64" />
        </div>
        <Card>
          <CardContent className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-b-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (attempts.length === 0 && !debouncedSearch) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Urinishlar</h1>
          <p className="text-sm text-muted-foreground">Talabalarning imtihon urinishlari</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Hali urinishlar yo&apos;q</h3>
            <p className="text-sm text-muted-foreground text-center">
              Talabalar imtihon topshirganda, natijalar shu yerda ko&apos;rinadi
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Urinishlar</h1>
          <p className="text-sm text-muted-foreground">
            Talabalarning imtihon urinishlari ({pagination?.total || 0} ta)
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Talaba nomi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talaba</TableHead>
                  <TableHead className="hidden md:table-cell">Imtihon</TableHead>
                  <TableHead>Yakuniy ball</TableHead>
                  <TableHead className="hidden sm:table-cell">Foiz</TableHead>
                  <TableHead className="hidden sm:table-cell">Sertifikat</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => {
                  const pending = isPendingResult(attempt)
                  const certificate = getCertificateBadge(attempt.certificate_level)

                  return (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{attempt.student_name}</p>
                          <p className="text-xs text-muted-foreground">{attempt.telegram_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-sm line-clamp-1">{attempt.exam_name}</p>
                          <p className="text-xs text-muted-foreground">{attempt.code_used}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {attempt.status === "in_progress" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : pending ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                            O2 kutilmoqda
                          </Badge>
                        ) : (
                          <span className="font-semibold">{formatScore(attempt.final_score)}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {pending ? "—" : formatPercentage(attempt.percentage)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {certificate && !pending ? (
                          <Badge className={certificate.color}>{certificate.level}</Badge>
                        ) : pending ? (
                          <span className="text-xs text-muted-foreground">Berilmagan</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(attempt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(attempt)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
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
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Urinish tafsilotlari</SheetTitle>
            <SheetDescription>Talabaning imtihon natijalari</SheetDescription>
          </SheetHeader>

          {selectedAttempt && (
            <div className="mt-6 space-y-6">
              {/* Pending O2 Warning */}
              {isPendingResult(selectedAttempt) && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Bu urinish O2 baholashni kutmoqda. Yakuniy natija O2 tekshirilgandan keyin aniqlanadi.
                  </AlertDescription>
                </Alert>
              )}

              {/* Student Info */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Talaba ma&apos;lumotlari
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ism</span>
                    <span className="text-sm font-medium">{selectedAttempt.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Telegram ID</span>
                    <span className="text-sm font-medium">{selectedAttempt.telegram_id}</span>
                  </div>
                  {selectedAttempt.region && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Viloyat</span>
                      <span className="text-sm font-medium">{selectedAttempt.region}</span>
                    </div>
                  )}
                  {selectedAttempt.district && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tuman</span>
                      <span className="text-sm font-medium">{selectedAttempt.district}</span>
                    </div>
                  )}
                  {selectedAttempt.phone_number && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Telefon</span>
                      <span className="text-sm font-medium">{selectedAttempt.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Exam Info */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4" />
                  Imtihon ma&apos;lumotlari
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Imtihon</span>
                    <span className="text-sm font-medium">{selectedAttempt.exam_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Test kodi</span>
                    <span className="text-sm font-medium font-mono">{selectedAttempt.code_used}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Boshlangan</span>
                    <span className="text-sm font-medium">{formatDateTime(selectedAttempt.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tugallangan</span>
                    <span className="text-sm font-medium">{formatDateTime(selectedAttempt.finished_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Davomiyligi</span>
                    <span className="text-sm font-medium">
                      {calculateDuration(selectedAttempt.started_at, selectedAttempt.finished_at)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Score Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Natijalar
                </h4>

                {/* Part scores */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">1-qism (Y1 + Y2 + O1)</span>
                    <span className="text-sm font-medium">{formatScore(selectedAttempt.part1_score)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">2-qism (O2)</span>
                    {selectedAttempt.has_o2 && !selectedAttempt.o2_fully_checked ? (
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                        Baholanmagan
                      </Badge>
                    ) : (
                      <span className="text-sm font-medium">{formatScore(selectedAttempt.part2_score)}</span>
                    )}
                  </div>
                </div>

                {/* Final results cards */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-2">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">
                        {isPendingResult(selectedAttempt) ? "—" : formatScore(selectedAttempt.final_score)}
                      </p>
                      <p className="text-xs text-muted-foreground">Yakuniy ball</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">
                        {isPendingResult(selectedAttempt) ? "—" : formatPercentage(selectedAttempt.percentage)}
                      </p>
                      <p className="text-xs text-muted-foreground">Foiz</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="p-4 text-center">
                      {(() => {
                        if (isPendingResult(selectedAttempt)) {
                          return <span className="text-2xl font-bold text-muted-foreground">—</span>
                        }
                        const cert = getCertificateBadge(selectedAttempt.certificate_level)
                        return cert ? (
                          <Badge className={`text-lg px-3 py-1 ${cert.color}`}>{cert.level}</Badge>
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">—</span>
                        )
                      })()}
                      <p className="text-xs text-muted-foreground mt-1">Sertifikat</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Final certificate result label */}
                {!isPendingResult(selectedAttempt) && selectedAttempt.certificate_level && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-muted-foreground">Yakuniy sertifikat natijasi</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Answers Summary */}
              {loadingAnswers ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : answers && Array.isArray(answers) && answers.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-3">Javoblar xulosasi</h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-lg font-bold">{answers.length}</p>
                      <p className="text-xs text-muted-foreground">Jami</p>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-lg font-bold text-green-600">
                        {answers.filter((a) => a.is_correct === true).length}
                      </p>
                      <p className="text-xs text-muted-foreground">To&apos;g&apos;ri</p>
                    </div>
                    <div className="bg-red-50 rounded p-3">
                      <p className="text-lg font-bold text-red-600">
                        {answers.filter((a) => a.is_correct === false).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Noto&apos;g&apos;ri</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-lg font-bold text-gray-600">
                        {answers.filter((a) => a.answer === null || a.answer === "").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Javobsiz</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* O2 Evaluation Button - Fixed routing to proper URL */}
              {isPendingResult(selectedAttempt) && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsDialogOpen(false)
                    router.push("/admin/evaluation")
                  }}
                >
                  <FileCheck2 className="mr-2 h-4 w-4" />
                  O2 baholashga o&apos;tish
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
