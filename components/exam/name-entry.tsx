"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { studentNameSchema, type StudentNameInput } from "@/lib/validations"

interface NameEntryProps {
  onSubmit: (name: string) => Promise<void>
}

export function NameEntry({ onSubmit }: NameEntryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentNameInput>({
    resolver: zodResolver(studentNameSchema),
  })

  const handleFormSubmit = async (data: StudentNameInput) => {
    setIsLoading(true)
    setError(null)
    try {
      await onSubmit(data.fullName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ismingizni kiriting</CardTitle>
          <CardDescription>To&apos;liq ism-familiyangizni kiriting</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input {...register("fullName")} placeholder="To'liq ismingiz" className="text-lg" disabled={isLoading} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
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
