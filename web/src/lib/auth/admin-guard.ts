import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Constant-time bearer-token comparison. Returns false for any length mismatch
// without leaking the token length via timing.
function tokenMatches(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Gate for admin / cron-only endpoints.
 *
 * Accepts an `Authorization: Bearer <token>` header where the token equals
 * either `ADMIN_API_KEY` (for manual admin invocations) or `CRON_SECRET`
 * (which Vercel Cron sends automatically when the env var is set).
 *
 * On failure returns a `NextResponse` to be returned directly from the route.
 * On success returns `null` so the route can continue.
 *
 * Usage:
 *   const denied = requireAdmin(request)
 *   if (denied) return denied
 */
export function requireAdmin(request: NextRequest | Request): NextResponse | null {
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()

  const adminKey = process.env.ADMIN_API_KEY
  const cronSecret = process.env.CRON_SECRET

  if (!adminKey && !cronSecret) {
    // Misconfiguration — fail closed rather than silently allowing requests.
    console.error('[admin-guard] Neither ADMIN_API_KEY nor CRON_SECRET is set')
    return NextResponse.json(
      { error: 'Admin auth not configured' },
      { status: 503 }
    )
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ok =
    (adminKey ? tokenMatches(token, adminKey) : false) ||
    (cronSecret ? tokenMatches(token, cronSecret) : false)

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
