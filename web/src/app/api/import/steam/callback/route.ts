import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Steam OpenID verification endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

// Steam Web API for fetching user profile
const STEAM_API_URL = 'https://api.steampowered.com'

interface SteamPlayer {
  steamid: string
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
}

// Verify the OpenID response from Steam
async function verifyOpenIdResponse(params: URLSearchParams): Promise<boolean> {
  // Change mode to check_authentication for verification
  const verifyParams = new URLSearchParams(params)
  verifyParams.set('openid.mode', 'check_authentication')

  const response = await fetch(STEAM_OPENID_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: verifyParams.toString(),
  })

  const text = await response.text()
  return text.includes('is_valid:true')
}

// Extract Steam ID from the claimed_id URL
function extractSteamId(claimedId: string): string | null {
  // Format: https://steamcommunity.com/openid/id/76561198xxxxxxxxx
  const match = claimedId.match(/\/openid\/id\/(\d+)$/)
  return match ? match[1] : null
}

// Fetch Steam user profile
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
    const players = data.response?.players || []
    return players.length > 0 ? players[0] : null
  } catch (error) {
    console.error('Error fetching Steam profile:', error)
    return null
  }
}

// GET /api/import/steam/callback
// Handles the redirect from Steam after user authenticates
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Get the state we passed through
  const stateParam = searchParams.get('state')
  let userId: string | null = null
  let redirectUri: string | null = null

  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
      userId = state.user_id
      redirectUri = state.redirect_uri
    } catch (e) {
      console.error('Failed to parse state:', e)
    }
  }

  // Check for OpenID error
  const openidMode = searchParams.get('openid.mode')
  if (openidMode === 'cancel' || openidMode === 'error') {
    const errorUrl = redirectUri
      ? `${redirectUri}?error=cancelled`
      : '/settings?steam=cancelled'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  // Verify the OpenID response
  const isValid = await verifyOpenIdResponse(searchParams)
  if (!isValid) {
    console.error('OpenID verification failed')
    const errorUrl = redirectUri
      ? `${redirectUri}?error=verification_failed`
      : '/settings?steam=error'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  // Extract Steam ID from claimed_id
  const claimedId = searchParams.get('openid.claimed_id')
  if (!claimedId) {
    console.error('No claimed_id in response')
    const errorUrl = redirectUri
      ? `${redirectUri}?error=no_claimed_id`
      : '/settings?steam=error'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  const steamId = extractSteamId(claimedId)
  if (!steamId) {
    console.error('Could not extract Steam ID from:', claimedId)
    const errorUrl = redirectUri
      ? `${redirectUri}?error=invalid_steam_id`
      : '/settings?steam=error'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  console.log('Steam authentication successful, Steam ID:', steamId)

  // Fetch Steam profile to get username
  const steamProfile = await getSteamProfile(steamId)
  const steamUsername = steamProfile?.personaname || null

  if (!userId) {
    console.error('No user_id in state')
    const errorUrl = redirectUri
      ? `${redirectUri}?error=no_user_id`
      : '/settings?steam=error'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  // Save/update the platform connection
  const { error: upsertError } = await supabaseAdmin
    .from('platform_connections')
    .upsert({
      user_id: userId,
      platform: 'steam',
      platform_user_id: steamId,
      platform_username: steamUsername,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform',
    })

  if (upsertError) {
    console.error('Error saving platform connection:', upsertError)
    const errorUrl = redirectUri
      ? `${redirectUri}?error=database_error`
      : '/settings?steam=error'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  console.log('Platform connection saved successfully')

  // Redirect to success page or deep link back to app
  const successUrl = redirectUri
    ? `${redirectUri}?success=true&platform=steam&username=${encodeURIComponent(steamUsername || steamId)}`
    : `/settings?steam=connected&username=${encodeURIComponent(steamUsername || steamId)}`

  return NextResponse.redirect(new URL(successUrl, request.url))
}
