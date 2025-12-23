import crypto from "crypto"

// Generate cryptographically secure random seed for randomization
export function generateSecureRandomSeed(): number {
  const buffer = crypto.randomBytes(4)
  return buffer.readUInt32BE(0)
}

// Secure random number generator using crypto
export class SecureRandom {
  private buffer: Buffer
  private position: number

  constructor() {
    this.buffer = crypto.randomBytes(1024)
    this.position = 0
  }

  private refillBuffer(): void {
    this.buffer = crypto.randomBytes(1024)
    this.position = 0
  }

  next(): number {
    if (this.position >= this.buffer.length - 4) {
      this.refillBuffer()
    }
    const value = this.buffer.readUInt32BE(this.position) / 0xffffffff
    this.position += 4
    return value
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  // Generate random integer in range [min, max]
  randomInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}

// Rate limiting store (in-memory, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// Simple rate limiter
export function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt }
}

// Sanitize user input - remove dangerous characters
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return ""

  // Remove null bytes and control characters
  return input
    .replace(/\0/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
}

// Validate and sanitize Telegram ID
export function validateTelegramId(id: string | number): string | null {
  const idStr = String(id)
  // Telegram IDs are numeric only
  if (!/^\d+$/.test(idStr)) return null
  // Reasonable length check
  if (idStr.length > 20) return null
  return idStr
}

// Generate secure OTP code
export function generateSecureOTP(length = 6): string {
  const digits = "0123456789"
  let otp = ""
  const randomBytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % 10]
  }
  return otp
}
