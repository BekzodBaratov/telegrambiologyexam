import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {}

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await sql`SELECT 1`
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
  } catch (e) {
    checks.database = { status: "error", error: e instanceof Error ? e.message : "Unknown error" }
  }

  // Overall status
  const isHealthy = Object.values(checks).every((c) => c.status === "ok")
  const totalLatency = Date.now() - startTime

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      latencyMs: totalLatency,
      checks,
    },
    { status: isHealthy ? 200 : 503 },
  )
}
