"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { initTelegramWebApp, type TelegramWebApp } from "@/lib/telegram"

interface TelegramContextType {
  webApp: TelegramWebApp | null
  isReady: boolean
  colorScheme: "light" | "dark"
  telegramId: string | null
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  isReady: false,
  colorScheme: "light",
  telegramId: null,
})

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light")
  const [telegramId, setTelegramId] = useState<string | null>(null)

  useEffect(() => {
    const app = initTelegramWebApp()
    if (app) {
      setWebApp(app)
      setColorScheme(app.colorScheme)
      if (app.initDataUnsafe?.user?.id) {
        setTelegramId(app.initDataUnsafe.user.id.toString())
      }
      setIsReady(true)
    } else {
      // For development outside Telegram - generate a test ID
      setTelegramId("dev_" + Math.random().toString(36).substring(7))
      setIsReady(true)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ webApp, isReady, colorScheme, telegramId }}>{children}</TelegramContext.Provider>
  )
}

export function useTelegram() {
  return useContext(TelegramContext)
}
