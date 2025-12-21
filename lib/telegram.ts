export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
    }
    auth_date: number
    hash: string
  }
  colorScheme: "light" | "dark"
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    isVisible: boolean
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void
    notificationOccurred: (type: "error" | "success" | "warning") => void
    selectionChanged: () => void
  }
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return window.Telegram.WebApp
  }
  return null
}

export function initTelegramWebApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp()
  if (webApp) {
    webApp.ready()
    webApp.expand()
  }
  return webApp
}

export function getTelegramUser() {
  const webApp = getTelegramWebApp()
  return webApp?.initDataUnsafe?.user || null
}

export function getTelegramTheme() {
  const webApp = getTelegramWebApp()
  return {
    colorScheme: webApp?.colorScheme || "light",
    themeParams: webApp?.themeParams || {},
  }
}
