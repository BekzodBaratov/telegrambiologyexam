"use client"

import {
  LayoutDashboard,
  BookOpen,
  Key,
  Users,
  FileCheck,
  Calculator,
  LogOut,
  Layers,
  FileText,
  FolderTree,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sections", label: "Bo'limlar", icon: Layers },
  { id: "questions", label: "Savollar", icon: BookOpen },
  { id: "y2groups", label: "Guruhlar (Y2)", icon: FolderTree },
  { id: "exams", label: "Imtihonlar", icon: FileText },
  { id: "codes", label: "Test kodlari", icon: Key },
  { id: "attempts", label: "Urinishlar", icon: Users },
  { id: "evaluation", label: "O2 baholash", icon: FileCheck },
  { id: "rasch", label: "Rasch hisoblash", icon: Calculator },
]

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/admin"
  }

  return (
    <aside className="w-64 border-r bg-background p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">Biologiya</h2>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className={cn("w-full justify-start", activeTab === item.id && "bg-secondary")}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>

      <Button
        variant="ghost"
        className="w-full justify-start text-destructive hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Chiqish
      </Button>
    </aside>
  )
}
