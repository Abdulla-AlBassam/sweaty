import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/require-session'
import { signSteamState } from '@/lib/auth/steam-state'

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

// GET /api/import/steam/auth?redirect_uri=<deep-link>
//
// Generates a Steam OpenID 2.0 authentication URL. The state token is
// HMAC-signed and bound to the *authenticated* user, so the callback can
// trust which Sweaty account to link without accepting a UUID from the
// client.
//
// Auth: requires `Authorization: Bearer <session.access_token>`. Previously
// the route accepted `?user_id=` from the query string, which let any
// attacker generate an auth URL bound to any victim's UUID.
export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if ('error' in session) return session.error

  const searchParams = request.nextUrl.searchParams
  const redirectUri = searchParams.get('redirect_uri')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sweaty-v1.vercel.app'
  const callbackUrl = `${baseUrl}/api/import/steam/callback`

  let state: string
  try {
    state = signSteamState({ userId: session.user.id, redirectUri })
  } catch (err) {
    console.error('[steam/auth] failed to sign state:', err)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${callbackUrl}?state=${state}`,
    'openid.realm': baseUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })

  return NextResponse.json({
    auth_url: `${STEAM_OPENID_URL}?${params.toString()}`,
    message: 'Open this URL in a browser to authenticate with Steam',
  })
}
