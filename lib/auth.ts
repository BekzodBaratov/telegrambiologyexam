import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import crypto from "crypto"

// Session configuration
const SESSION_COOKIE_NAME = "admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Generate a cryptographically secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Hash password using PBKDF2 (available in Node.js crypto)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

// Verify password against stored hash
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":")
  if (!salt || !hash) return false
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash))
}

// Create a new session for a user
export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  // Store session in database
  await sql`
    INSERT INTO admin_sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `

  return token
}

// Validate session token and return user if valid
export async function validateSession(token: string): Promise<{ id: number; email: string; name: string } | null> {
  if (!token) return null

  const [session] = await sql`
    SELECT s.user_id, s.expires_at, u.email, u.name
    FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ${token}
  `

  if (!session) return null

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`
    return null
  }

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
  }
}

// Delete a session (logout)
export async function deleteSession(token: string): Promise<void> {
  await sql`DELETE FROM admin_sessions WHERE token = ${token}`
}

// Clean up expired sessions (can be called periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`
}

// Get current user from request cookies
export async function getCurrentUser(): Promise<{ id: number; email: string; name: string } | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) return null

  return validateSession(sessionCookie.value)
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  })
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
