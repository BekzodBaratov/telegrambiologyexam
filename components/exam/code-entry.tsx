"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, KeyRound, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { codeEntrySchema, type CodeEntryInput } from "@/lib/validations"

interface CodeEntryProps {
  onSubmit: (code: string) => Promise<void>
  studentName?: string | null
}

export function CodeEntry({ onSubmit, studentName }: CodeEntryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyTaken, setAlreadyTaken] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CodeEntryInput>({
    resolver: zodResolver(codeEntrySchema),
  })

  const handleFormSubmit = async (data: CodeEntryInput) => {
    setIsLoading(true)
    setError(null)
    setAlreadyTaken(false)
    try {
      await onSubmit(data.code)
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("allaqachon") || err.message.includes("already")) {
          setAlreadyTaken(true)
          setError("Siz bu testni allaqachon topshirgansiz")
        } else {
          setError(err.message)
        }
      } else {
        setError("Invalid code")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Biologiya Imtihoni</CardTitle>
          {studentName && (
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Xush kelibsiz, {studentName}!</span>
            </div>
          )}
          <CardDescription className="mt-2">Imtihonni boshlash uchun kirish kodingizni kiriting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                {...register("code")}
                placeholder="Kirish kodi (masalan: 8080)"
                className="text-center text-lg tracking-widest"
                disabled={isLoading}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
              {alreadyTaken && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-800 font-medium">Siz bu testni allaqachon topshirgansiz</p>
                </div>
              )}
              {error && !alreadyTaken && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tekshirilmoqda...
                </>
              ) : (
                "Davom etish"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
