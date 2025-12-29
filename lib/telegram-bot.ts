/**
 * Server-side Telegram Bot API utility
 * Used ONLY for sending outgoing messages to students
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

interface TelegramSendMessageResponse {
  ok: boolean
  result?: {
    message_id: number
    chat: { id: number }
    date: number
    text: string
  }
  description?: string
  error_code?: number
}

/**
 * Send a message to a Telegram user via Bot API
 * @param chatId - The student's telegram_id (acts as chat_id)
 * @param text - Message text (supports Markdown)
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[TelegramBot] TELEGRAM_BOT_TOKEN is not configured")
    return { success: false, error: "Bot token not configured" }
  }

  // Skip dev mode telegram IDs
  if (typeof chatId === "string" && chatId.startsWith("dev_")) {
    console.log(`[TelegramBot] Skipping dev mode ID: ${chatId}`)
    return { success: true } // Treat as success for dev mode
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    })

    const data: TelegramSendMessageResponse = await response.json()

    if (!data.ok) {
      console.error(`[TelegramBot] Failed to send message to ${chatId}:`, data.description)
      return { success: false, error: data.description || "Unknown error" }
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Network error"
    console.error(`[TelegramBot] Error sending message to ${chatId}:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Build exam result message for a student
 */
export function buildResultMessage(params: {
  studentName: string
  examName: string
  finalScore: number
  percentage: number
  certificateLevel: string
}): string {
  const { studentName, examName, finalScore, percentage, certificateLevel } = params

  // Certificate emoji based on level
  const certEmoji =
    {
      "A+": "🥇",
      A: "🥈",
      "B+": "🥉",
      B: "📜",
      C: "📄",
    }[certificateLevel] || "📄"

  return `📘 *${examName}*

👤 Ism: ${studentName}
📊 Yakuniy ball: ${finalScore.toFixed(1)}
📈 Foiz: ${percentage.toFixed(1)}%
${certEmoji} Sertifikat: *${certificateLevel}*

Tabriklaymiz! 🎉`
}
