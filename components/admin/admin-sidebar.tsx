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
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"

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

function NavigationContent({ activeTab, onTabChange, onItemClick }: AdminSidebarProps & { onItemClick?: () => void }) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/admin"
  }

  const handleTabChange = (tab: string) => {
    onTabChange(tab)
    onItemClick?.()
  }

  return (
    <>
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
            onClick={() => handleTabChange(item.id)}
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
    </>
  )
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  if (isMobile) {
    return (
      <>
        {/* Mobile header with hamburger */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background border-b lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <NavigationContent
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  onItemClick={() => setIsOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">Biologiya Admin</span>
          </div>
        </div>
        {/* Spacer for fixed header */}
        <div className="h-14 lg:hidden" />
      </>
    )
  }

  return (
    <aside className="w-64 border-r bg-background p-4 flex flex-col sticky top-0 h-screen">
      <NavigationContent activeTab={activeTab} onTabChange={onTabChange} />
    </aside>
  )
}
