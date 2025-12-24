"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2, UserPlus, Phone, MapPin, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { regions, getDistrictsByRegion } from "@/lib/regions-data"

interface RegistrationFormProps {
  telegramId: string
  onComplete: (studentId: number, fullName: string) => void
}

export function RegistrationForm({ telegramId, onComplete }: RegistrationFormProps) {
  const [step, setStep] = useState<"form" | "otp">("form")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [setDebugOtp, debugOtp] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [region, setRegion] = useState("")
  const [district, setDistrict] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("+998")
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([])
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string
    region?: string
    district?: string
    phoneNumber?: string
  }>({})

  useEffect(() => {
    if (region) {
      const regionDistricts = getDistrictsByRegion(region)
      setDistricts(regionDistricts)
      setDistrict("")
    }
  }, [region])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const validateForm = () => {
    const errors: typeof fieldErrors = {}

    if (fullName.trim().length < 3) {
      errors.fullName = "Ism kamida 3 ta belgidan iborat bo'lishi kerak"
    }
    if (!region) {
      errors.region = "Viloyatni tanlang"
    }
    if (!district) {
      errors.district = "Tumanni tanlang"
    }
    if (!/^\+998\d{9}$/.test(phoneNumber)) {
      errors.phoneNumber = "Telefon raqam formati: +998XXXXXXXXX"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/student/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "SMS yuborishda xatolik")
      }

      const data = await response.json()

      // Development mode: show OTP code for testing
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp)
      }

      setResendTimer(60)
      setStep("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/student/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "SMS yuborishda xatolik")
      }

      setResendTimer(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/student/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          phoneNumber,
          otpCode,
          fullName: fullName.trim(),
          region,
          district,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Tasdiqlashda xatolik")
      }

      const data = await response.json()
      onComplete(data.studentId, fullName.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "otp") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">SMS Tasdiqlash</CardTitle>
            <CardDescription>{phoneNumber} raqamiga yuborilgan 6 xonali kodni kiriting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Tasdiqlash kodi { debugOtp }</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button onClick={handleVerifyOtp} className="w-full" disabled={isLoading || otpCode.length !== 6}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Tasdiqlash
                </>
              )}
            </Button>

            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-sm text-muted-foreground">Qayta yuborish: {resendTimer} soniya</p>
              ) : (
                <Button variant="link" onClick={handleResendOtp} disabled={isLoading} className="text-sm">
                  Kodni qayta yuborish
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={() => setStep("form")} className="w-full" disabled={isLoading}>
              Orqaga
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ro'yxatdan o'tish</CardTitle>
          <CardDescription>Davom etish uchun ma'lumotlaringizni kiriting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">To'liq ism</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => ({ ...prev, fullName: undefined }))
                  }
                }}
                placeholder="Familiya Ism Otasining ismi"
                disabled={isLoading}
              />
              {fieldErrors.fullName && <p className="text-sm text-destructive">{fieldErrors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label>Viloyat</Label>
              <Select
                value={region}
                onValueChange={(value) => {
                  setRegion(value)
                  if (fieldErrors.region) {
                    setFieldErrors((prev) => ({ ...prev, region: undefined }))
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Viloyatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.region && <p className="text-sm text-destructive">{fieldErrors.region}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tuman/Shahar</Label>
              <Select
                value={district}
                onValueChange={(value) => {
                  setDistrict(value)
                  if (fieldErrors.district) {
                    setFieldErrors((prev) => ({ ...prev, district: undefined }))
                  }
                }}
                disabled={isLoading || !region}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tumanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.district && <p className="text-sm text-destructive">{fieldErrors.district}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telefon raqam</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  if (fieldErrors.phoneNumber) {
                    setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }))
                  }
                }}
                placeholder="+998901234567"
                disabled={isLoading}
              />
              {fieldErrors.phoneNumber && <p className="text-sm text-destructive">{fieldErrors.phoneNumber}</p>}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Davom etish
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
