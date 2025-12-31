import { NextRequest, NextResponse } from 'next/server'

// Steam OpenID 2.0 authentication endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

// GET /api/import/steam/auth?user_id=xxx&redirect_uri=xxx
// Generates Steam OpenID authentication URL
// The user_id is passed through the state to associate the Steam account with the Sweaty user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')
  const redirectUri = searchParams.get('redirect_uri') // Where to redirect after success (mobile deep link)

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing required parameter: user_id' },
      { status: 400 }
    )
  }

  // Determine the callback URL based on environment
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sweaty-v1.vercel.app'
  const callbackUrl = `${baseUrl}/api/import/steam/callback`

  // Encode state to pass through the OAuth flow
  // This includes the user_id and optional redirect_uri for mobile deep linking
  const state = Buffer.from(JSON.stringify({
    user_id: userId,
    redirect_uri: redirectUri || null,
  })).toString('base64url')

  // Build Steam OpenID 2.0 authentication URL
  // Steam uses OpenID 2.0 protocol (not OAuth)
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${callbackUrl}?state=${state}`,
    'openid.realm': baseUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })

  const authUrl = `${STEAM_OPENID_URL}?${params.toString()}`

  return NextResponse.json({
    auth_url: authUrl,
    message: 'Open this URL in a browser to authenticate with Steam',
  })
}
