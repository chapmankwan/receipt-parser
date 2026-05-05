import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/health
//
// Simple liveness check — public, no auth.
// Returns 200 if the Next.js server is running.
// Listed as a public route in middleware.ts so Clerk doesn't redirect it.
// ---------------------------------------------------------------------------

export function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}