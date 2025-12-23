import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE_NAME = "admin_session"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Add security headers to all responses
  const response = NextResponse.next()
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Protect admin routes (except login page at /admin)
  if (pathname.startsWith("/admin") && pathname !== "/admin") {
    const session = request.cookies.get(SESSION_COOKIE_NAME)

    if (!session?.value) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }

    // Note: Full session validation happens in the API route
    // Middleware only does a basic check for cookie presence
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    const session = request.cookies.get(SESSION_COOKIE_NAME)

    if (!session?.value) {
      return NextResponse.json({ message: "Ruxsat yo'q. Iltimos, tizimga kiring." }, { status: 401 })
    }
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
