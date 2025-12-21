"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Plus, Copy, Trash2, Loader2, Check, Clock, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TestCode {
  id: number
  code: string
  exam_id: number
  exam_name: string
  max_attempts: number
  used_count: number
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
  created_at: string
  server_time: string
}

function getValidityStatus(tc: TestCode): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  if (!tc.is_active) {
    return { label: "O'chirilgan", variant: "secondary" }
  }

  const now = new Date(tc.server_time)
  const validFrom = tc.valid_from ? new Date(tc.valid_from) : null
  const validTo = tc.valid_to ? new Date(tc.valid_to) : null

  if (validFrom && now < validFrom) {
    return { label: "Boshlanmagan", variant: "outline" }
  }

  if (validTo && now > validTo) {
    return { label: "Muddati tugagan", variant: "destructive" }
  }

  return { label: "Faol", variant: "default" }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("uz", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateTimeForInput(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toISOString().slice(0, 16)
}

export function TestCodesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    code: "",
    examId: "",
    maxAttempts: "1",
    validFrom: "",
    validTo: "",
  })

  const [dateError, setDateError] = useState("")

  const { data: codes, isLoading: loadingCodes } = useSWR<TestCode[]>("/api/admin/test-codes", fetcher)
  const { data: exams } = useSWR("/api/admin/exams", fetcher)

  const generateCode = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
    setFormData({ ...formData, code: randomCode })
  }

  const validateDates = (from: string, to: string): boolean => {
    if (from && to) {
      const fromDate = new Date(from)
      const toDate = new Date(to)
      if (toDate < fromDate) {
        setDateError("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak")
        return false
      }
    }
    setDateError("")
    return true
  }

  const handleSubmit = async () => {
    if (!validateDates(formData.validFrom, formData.validTo)) return

    setIsLoading(true)
    try {
      const method = editingId ? "PUT" : "POST"
      const url = editingId ? `/api/admin/test-codes/${editingId}` : "/api/admin/test-codes"

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          examId: Number.parseInt(formData.examId),
          maxAttempts: Number.parseInt(formData.maxAttempts),
          validFrom: formData.validFrom || null,
          validTo: formData.validTo || null,
        }),
      })

      mutate("/api/admin/test-codes")
      setIsDialogOpen(false)
      setEditingId(null)
      setFormData({ code: "", examId: "", maxAttempts: "1", validFrom: "", validTo: "" })
      setDateError("")
    } catch (error) {
      console.error("Error saving code:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (tc: TestCode) => {
    setEditingId(tc.id)
    setFormData({
      code: tc.code,
      examId: tc.exam_id.toString(),
      maxAttempts: tc.max_attempts.toString(),
      validFrom: formatDateTimeForInput(tc.valid_from),
      validTo: formatDateTimeForInput(tc.valid_to),
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Bu kodni o'chirishni xohlaysizmi?")) return

    await fetch(`/api/admin/test-codes/${id}`, { method: "DELETE" })
    mutate("/api/admin/test-codes")
  }

  const handleCopy = async (code: string, id: number) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await fetch(`/api/admin/test-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    })
    mutate("/api/admin/test-codes")
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingId(null)
    setFormData({ code: "", examId: "", maxAttempts: "1", validFrom: "", validTo: "" })
    setDateError("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Test kodlari</h1>
          <p className="text-muted-foreground">O&apos;quvchilar uchun kirish kodlarini boshqarish</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi kod
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Imtihon</TableHead>
                <TableHead>Foydalanish</TableHead>
                <TableHead>Amal qilish muddati</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Faollik</TableHead>
                <TableHead className="w-32">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCodes ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : codes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Hozircha kodlar yo&apos;q
                  </TableCell>
                </TableRow>
              ) : (
                codes?.map((tc) => {
                  const status = getValidityStatus(tc)
                  return (
                    <TableRow key={tc.id}>
                      <TableCell className="font-mono font-bold text-lg">{tc.code}</TableCell>
                      <TableCell>{tc.exam_name}</TableCell>
                      <TableCell>
                        {tc.used_count} / {tc.max_attempts}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-3 w-3" />
                            <span>Boshlanish: {formatDateTime(tc.valid_from)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Tugash: {formatDateTime(tc.valid_to)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={tc.is_active}
                          onCheckedChange={(checked) => handleToggleActive(tc.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleCopy(tc.code, tc.id)}>
                            {copiedId === tc.id ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tc)}>
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tc.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Test kodini tahrirlash" : "Yangi test kodi yaratish"}</DialogTitle>
            <DialogDescription>O&apos;quvchilar imtihonga kirishi uchun kod yarating</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kod</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Masalan: 8080"
                  className="font-mono"
                  disabled={!!editingId}
                />
                {!editingId && (
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Generatsiya
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imtihon</Label>
              <Select
                value={formData.examId}
                onValueChange={(v) => setFormData({ ...formData, examId: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Imtihonni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {exams?.map((exam: { id: number; name: string }) => (
                    <SelectItem key={exam.id} value={exam.id.toString()}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maksimal foydalanish soni</Label>
              <Input
                type="number"
                min="1"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Boshlanish vaqti (ixtiyoriy)</Label>
                <Input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => {
                    setFormData({ ...formData, validFrom: e.target.value })
                    validateDates(e.target.value, formData.validTo)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Tugash vaqti (ixtiyoriy)</Label>
                <Input
                  type="datetime-local"
                  value={formData.validTo}
                  onChange={(e) => {
                    setFormData({ ...formData, validTo: e.target.value })
                    validateDates(formData.validFrom, e.target.value)
                  }}
                />
              </div>
            </div>
            {dateError && <p className="text-sm text-destructive">{dateError}</p>}
            <p className="text-xs text-muted-foreground">
              Server vaqti ishlatiladi. Bo'sh qoldirilsa cheklov qo'yilmaydi.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Bekor qilish
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !formData.code || !formData.examId || !!dateError}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Saqlash" : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
