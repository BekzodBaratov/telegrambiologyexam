import type React from "react"
import type { Metadata } from "next"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export const metadata: Metadata = {
  title: "Admin Panel - Biologiya Imtihoni",
  description: "Imtihon tizimi admin paneli",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 p-4 sm:p-6 overflow-auto pt-14 lg:pt-6">{children}</main>
    </div>
  )
}
