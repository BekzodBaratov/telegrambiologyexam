import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Panel - Biologiya Imtihoni",
  description: "Imtihon tizimi admin paneli",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
