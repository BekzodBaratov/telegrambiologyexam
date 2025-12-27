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
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sections", label: "Bo'limlar", icon: Layers },
  { href: "/admin/questions", label: "Savollar", icon: BookOpen },
  { href: "/admin/y2groups", label: "Guruhlar (Y2)", icon: FolderTree },
  { href: "/admin/exams", label: "Imtihonlar", icon: FileText },
  { href: "/admin/codes", label: "Test kodlari", icon: Key },
  { href: "/admin/attempts", label: "Urinishlar", icon: Users },
  { href: "/admin/evaluation", label: "O2 baholash", icon: FileCheck },
  { href: "/admin/rasch", label: "Rasch hisoblash", icon: Calculator },
]

function NavigationContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/admin")
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Biologiya</h2>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start h-10", isActive && "bg-secondary font-medium")}
              asChild
              onClick={onItemClick}
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="pt-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Chiqish
        </Button>
      </div>
    </>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
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

  // Close sheet on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Don't render sidebar on login page
  if (pathname === "/admin") {
    return null
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile header with hamburger */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background border-b lg:hidden">
          <div className="flex items-center gap-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <NavigationContent onItemClick={() => setIsOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">Biologiya Admin</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <aside className="w-64 border-r bg-background p-4 flex flex-col sticky top-0 h-screen">
      <NavigationContent />
    </aside>
  )
}
