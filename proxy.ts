import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes (except login page)
  if (pathname.startsWith("/admin") && pathname !== "/admin") {
    const session = request.cookies.get("admin_session")

    if (!session) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
  }

  // Protect admin API routes
  if (pathname.startsWith("/api/admin")) {
    const session = request.cookies.get("admin_session")

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
