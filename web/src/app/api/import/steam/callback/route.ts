import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySteamState } from '@/lib/auth/steam-state'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'
const STEAM_API_URL = 'https://api.steampowered.com'

interface SteamPlayer {
  steamid: string
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
}

async function verifyOpenIdResponse(params: URLSearchParams): Promise<boolean> {
  const verifyParams = new URLSearchParams(params)
  verifyParams.set('openid.mode', 'check_authentication')

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  })

  const text = await response.text()
  return text.includes('is_valid:true')
}

function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/\/openid\/id\/(\d+)$/)
  return match ? match[1] : null
}

async function getSteamProfile(steamId: string): Promise<SteamPlayer | null> {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) {
    console.error('STEAM_API_KEY not configured')
    return null
  }

  const url = `${STEAM_API_URL}/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Steam API error:', response.status)
      return null
    }
    const data = await response.json()
    return data.response?.players?.[0] || null
  } catch (error) {
    console.error('Error fetching Steam profile:', error)
    return null
  }
}

// GET /api/import/steam/callback
//
// Steam OpenID redirects here after the user authenticates. The state token
// must be a valid HMAC-signed payload from `/auth` — the user_id is taken
// from the verified state, never from any other source. This is what
// prevents an attacker from linking their Steam account to a victim's
// Sweaty profile.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const stateParam = searchParams.get('state')
  const verified = stateParam ? verifySteamState(stateParam) : null
  const userId = verified?.user_id ?? null
  const redirectUri = verified?.redirect_uri ?? null

  // Helper: build a redirect that tells the caller (mobile or web) what
  // happened. Falls back to /settings when there's no deep link.
  const errorRedirect = (code: string) => {
    const url = redirectUri
      ? `${redirectUri}?error=${code}`
      : `/settings?steam=${code}`
    return NextResponse.redirect(new URL(url, request.url))
  }

  if (!verified) {
    return errorRedirect('invalid_state')
  }

  const openidMode = searchParams.get('openid.mode')
  if (openidMode === 'cancel' || openidMode === 'error') {
    return errorRedirect('cancelled')
  }

  const isValid = await verifyOpenIdResponse(searchParams)
  if (!isValid) {
    console.error('OpenID verification failed')
    return errorRedirect('verification_failed')
  }

  const claimedId = searchParams.get('openid.claimed_id')
  if (!claimedId) {
    return errorRedirect('no_claimed_id')
  }

  const steamId = extractSteamId(claimedId)
  if (!steamId) {
    console.error('Could not extract Steam ID from:', claimedId)
    return errorRedirect('invalid_steam_id')
  }

  const steamProfile = await getSteamProfile(steamId)
  const steamUsername = steamProfile?.personaname || null

  if (!userId) {
    // Should be unreachable given the verifySteamState guard above.
    return errorRedirect('no_user_id')
  }

  const { error: upsertError } = await supabaseAdmin
    .from('platform_connections')
    .upsert(
      {
        user_id: userId,
        platform: 'steam',
        platform_user_id: steamId,
        platform_username: steamUsername,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

  if (upsertError) {
    console.error('Error saving platform connection:', upsertError)
    return errorRedirect('database_error')
  }

  const successUrl = redirectUri
    ? `${redirectUri}?success=true&platform=steam&username=${encodeURIComponent(steamUsername || steamId)}`
    : `/settings?steam=connected&username=${encodeURIComponent(steamUsername || steamId)}`

  return NextResponse.redirect(new URL(successUrl, request.url))
}
