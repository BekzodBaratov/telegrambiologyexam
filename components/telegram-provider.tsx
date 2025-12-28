"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { initTelegramWebApp, type TelegramWebApp } from "@/lib/telegram"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface TelegramContextType {
  webApp: TelegramWebApp | null
  isReady: boolean
  colorScheme: "light" | "dark"
  telegramId: string | null
  authStatus: AuthStatus
  studentId: number | null
  studentName: string | null
  refreshAuth: () => Promise<void>
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  isReady: false,
  colorScheme: "light",
  telegramId: null,
  authStatus: "loading",
  studentId: null,
  studentName: null,
  refreshAuth: async () => {},
})

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light")
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading")
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentName, setStudentName] = useState<string | null>(null)

  const checkAuth = async (tgId: string) => {
    try {
      const response = await fetch("/api/student/check-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: tgId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.registered && data.verified) {
          setStudentId(data.studentId)
          setStudentName(data.fullName)
          setAuthStatus("authenticated")
        } else {
          setAuthStatus("unauthenticated")
        }
      } else {
        setAuthStatus("unauthenticated")
      }
    } catch (err) {
      console.error("Auth check failed:", err)
      setAuthStatus("unauthenticated")
    }
  }

  const refreshAuth = async () => {
    if (telegramId) {
      setAuthStatus("loading")
      await checkAuth(telegramId)
    }
  }

  useEffect(() => {
    const app = initTelegramWebApp()
    let tgId: string | null = null

    if (app) {
      setWebApp(app)
      setColorScheme(app.colorScheme)
      if (app.initDataUnsafe?.user?.id) {
        tgId = app.initDataUnsafe.user.id.toString()
      }
    }

    // For development outside Telegram - generate a test ID
    if (!tgId) {
      const storedDevId = typeof window !== "undefined" ? sessionStorage.getItem("dev_telegram_id") : null
      if (storedDevId) {
        tgId = storedDevId
      } else {
        tgId = "dev_" + Math.random().toString(36).substring(7)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("dev_telegram_id", tgId)
        }
      }
    }

    setTelegramId(tgId)
    setIsReady(true)

    if (tgId) {
      checkAuth(tgId)
    }
  }, [])

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        isReady,
        colorScheme,
        telegramId,
        authStatus,
        studentId,
        studentName,
        refreshAuth,
      }}
    >
      {children}
    </TelegramContext.Provider>
  )
}

export function useTelegram() {
  return useContext(TelegramContext)
}
