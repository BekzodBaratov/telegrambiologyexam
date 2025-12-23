import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { adminLoginSchema } from "@/lib/validations"
import { verifyPassword, createSession, setSessionCookie, hashPassword } from "@/lib/auth"
import { checkRateLimit } from "@/lib/security"

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get("x-forwarded-for") || "unknown"

    // Rate limit: 5 attempts per minute per IP
    const rateLimit = checkRateLimit(`login:${clientIP}`, 5, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: "Juda ko'p urinish. Iltimos, 1 daqiqadan so'ng qayta urinib ko'ring.",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 },
      )
    }

    const body = await request.json()

    // Validate input
    const validation = adminLoginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar" },
        { status: 400 },
      )
    }

    const { email, password } = validation.data

    // Find admin user
    const [admin] = await sql`
      SELECT id, email, password_hash, name
      FROM admin_users 
      WHERE email = ${email.toLowerCase()}
    `

    if (!admin) {
      // Use same error message to prevent email enumeration
      return NextResponse.json({ message: "Email yoki parol noto'g'ri" }, { status: 401 })
    }

    // Check if using environment variable credentials (fallback for initial setup)
    const envEmail = process.env.ADMIN_EMAIL
    const envPassword = process.env.ADMIN_PASSWORD

    let isValidPassword = false

    if (envEmail && envPassword && email.toLowerCase() === envEmail.toLowerCase()) {
      // Check against environment variable password
      isValidPassword = password === envPassword

      // If valid and password_hash is 'direct_auth', update to proper hash
      if (isValidPassword && admin.password_hash === "direct_auth") {
        const newHash = await hashPassword(envPassword)
        await sql`
          UPDATE admin_users 
          SET password_hash = ${newHash}
          WHERE id = ${admin.id}
        `
      }
    } else if (admin.password_hash && admin.password_hash !== "direct_auth") {
      // Verify against stored hash
      isValidPassword = await verifyPassword(password, admin.password_hash)
    }

    if (!isValidPassword) {
      return NextResponse.json({ message: "Email yoki parol noto'g'ri" }, { status: 401 })
    }

    // Create session
    const sessionToken = await createSession(admin.id)
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      success: true,
      user: { id: admin.id, email: admin.email, name: admin.name },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 })
  }
}
