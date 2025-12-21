"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface QuestionO2Props {
  questionNumber: number
  text: string
  selectedAnswer?: string
  selectedImages?: string[]
  imageUrl?: string | null
  onAnswerChange: (answer: string, imageUrls: string[]) => void
}

export function QuestionO2({ questionNumber, text, selectedImages, imageUrl, onAnswerChange }: QuestionO2Props) {
  const [images, setImages] = useState<string[]>(selectedImages || [])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setImages(selectedImages || [])
  }, [selectedImages])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("/api/student/upload", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          newImages.push(data.url)
        }
      } catch (error) {
        console.error("Upload error:", error)
      }
    }

    const updatedImages = [...images, ...newImages]
    setImages(updatedImages)
    onAnswerChange("", updatedImages)
    setIsUploading(false)
  }

  const removeImage = useCallback(
    (index: number) => {
      const updatedImages = images.filter((_, i) => i !== index)
      setImages(updatedImages)
      onAnswerChange("", updatedImages)
    },
    [images, onAnswerChange],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {questionNumber}
          </span>
          <span className="text-base font-normal leading-relaxed">{text}</span>
        </CardTitle>
        {imageUrl && (
          <div className="mt-4 ml-11">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={`${questionNumber}-savol rasmi`}
              className="max-h-64 rounded-lg border object-contain"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Rasm yuklash (majburiy)</label>
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-muted-foreground/50">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id={`image-upload-${questionNumber}`}
              disabled={isUploading}
            />
            <label
              htmlFor={`image-upload-${questionNumber}`}
              className="flex cursor-pointer flex-col items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Yuklanmoqda...</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Rasm yuklash uchun bosing yoki tortib olib keling
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {images.map((url, index) => (
              <div key={index} className="group relative">
                <img
                  src={url || "/placeholder.svg"}
                  alt={`Yuklangan rasm ${index + 1}`}
                  className="h-32 w-full rounded-lg object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-amber-700">
            <ImageIcon className="h-4 w-4" />
            <span className="text-sm">Kamida bitta rasm yuklash talab qilinadi</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
