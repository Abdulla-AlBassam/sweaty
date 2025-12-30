import { NextResponse } from 'next/server'

// ============================================
// TYPES
// ============================================

interface TwitchStream {
  streamer_name: string
  streamer_login: string
  title: string
  viewer_count: number
  thumbnail_url: string
  twitch_url: string
}

interface StreamsResponse {
  success: true
  game_name: string
  total_live: number
  streams: TwitchStream[]
}

interface ErrorResponse {
  success: false
  error: string
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

// Cache the access token in memory (shared with IGDB since same credentials)
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken
  }

  // Fetch new token from Twitch
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get Twitch token: ${response.statusText}`)
  }

  const data = await response.json()

  // Cache the token
  cachedToken = data.access_token
  // expires_in is in seconds, convert to milliseconds and add to current time
  tokenExpiresAt = Date.now() + data.expires_in * 1000

  return cachedToken!
}

// ============================================
// TWITCH HELIX API CALLS
// ============================================

interface TwitchGameResponse {
  data: Array<{
    id: string
    name: string
    box_art_url: string
  }>
}

interface TwitchStreamsResponse {
  data: Array<{
    id: string
    user_id: string
    user_login: string
    user_name: string
    game_id: string
    game_name: string
    type: string
    title: string
    viewer_count: number
    started_at: string
    language: string
    thumbnail_url: string
    is_mature: boolean
  }>
  pagination?: {
    cursor?: string
  }
}

async function twitchFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const token = await getAccessToken()

  const url = new URL(`https://api.twitch.tv/helix/${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Twitch API error:', response.status, errorText)
    throw new Error(`Twitch API error: ${response.status}`)
  }

  return response.json()
}

// Generate name variations to try matching on Twitch
function getNameVariations(gameName: string): string[] {
  const variations: string[] = [gameName]

  // Try replacing "Delta" with Greek Δ symbol (common for remakes)
  if (gameName.toLowerCase().includes('delta')) {
    variations.push(gameName.replace(/delta/gi, 'Δ'))
  }

  // Try replacing Δ with "Delta" (reverse)
  if (gameName.includes('Δ')) {
    variations.push(gameName.replace(/Δ/g, 'Delta'))
  }

  // Handle Japanese romanization variations (o vs ō, u vs ū, etc.)
  // Common in game names like "Yotei" vs "Yōtei"
  const romanizationMap: Record<string, string> = {
    'o': 'ō', 'O': 'Ō',
    'u': 'ū', 'U': 'Ū',
    'a': 'ā', 'A': 'Ā',
  }

  // Try adding macrons to vowels before consonants in Japanese-sounding words
  const withMacrons = gameName
    .replace(/Yotei/gi, 'Yōtei')
    .replace(/Tsushima/gi, 'Tsushima')
    .replace(/Sekiro/gi, 'Sekiro')
  if (withMacrons !== gameName) {
    variations.push(withMacrons)
  }

  // Also try the reverse - removing macrons
  const withoutMacrons = gameName
    .replace(/ō/g, 'o').replace(/Ō/g, 'O')
    .replace(/ū/g, 'u').replace(/Ū/g, 'U')
    .replace(/ā/g, 'a').replace(/Ā/g, 'A')
  if (withoutMacrons !== gameName) {
    variations.push(withoutMacrons)
  }

  // Remove subtitles after colon/dash
  const simplifiedName = gameName.split(/[:\-–—]/)[0].trim()
  if (simplifiedName !== gameName && simplifiedName.length > 3) {
    variations.push(simplifiedName)
  }

  // Remove "The " prefix
  if (gameName.startsWith('The ')) {
    variations.push(gameName.slice(4))
  }

  // Remove edition suffixes
  const withoutEdition = gameName.replace(/\s*(:|-)?\s*(Definitive|Ultimate|Complete|Game of the Year|GOTY|Deluxe|Standard|Premium|Gold)\s*Edition\s*$/i, '').trim()
  if (withoutEdition !== gameName) {
    variations.push(withoutEdition)
  }

  // Return unique variations
  return [...new Set(variations)]
}

// Search for game on Twitch to get Twitch game ID
async function getTwitchGameId(gameName: string): Promise<string | null> {
  const variations = getNameVariations(gameName)

  for (const name of variations) {
    try {
      const response = await twitchFetch<TwitchGameResponse>('games', { name })

      if (response.data && response.data.length > 0) {
        return response.data[0].id
      }
    } catch (error) {
      console.error(`Error fetching Twitch game for "${name}":`, error)
    }
  }

  return null
}

// Get live streams for a game
async function getLiveStreams(gameId: string, limit: number = 5): Promise<TwitchStreamsResponse> {
  return twitchFetch<TwitchStreamsResponse>('streams', {
    game_id: gameId,
    first: String(limit),
    type: 'live',
  })
}

// Get total stream count for a game (for "X people streaming" text)
async function getTotalStreamCount(gameId: string): Promise<number> {
  try {
    // Fetch with first=1 just to get pagination info
    // Twitch doesn't give total count directly, so we estimate from first batch
    const response = await twitchFetch<TwitchStreamsResponse>('streams', {
      game_id: gameId,
      first: '100',
      type: 'live',
    })

    // If we got 100, there are probably more
    // This is an estimate - for accurate count we'd need to paginate
    return response.data.length
  } catch {
    return 0
  }
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: Request): Promise<NextResponse<StreamsResponse | ErrorResponse>> {
  try {
    // Check for required environment variables
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.error('Twitch credentials not configured')
      return NextResponse.json({ success: false, error: 'twitch_not_configured' }, { status: 503 })
    }

    const body = await request.json()
    const { game_name } = body as { game_name?: string; igdb_id?: number }

    if (!game_name) {
      return NextResponse.json({ success: false, error: 'game_name is required' }, { status: 400 })
    }

    // Get Twitch game ID from game name
    const twitchGameId = await getTwitchGameId(game_name)

    if (!twitchGameId) {
      return NextResponse.json({ success: false, error: 'game_not_found' }, { status: 404 })
    }

    // Fetch streams and total count in parallel
    const [streamsResponse, totalLive] = await Promise.all([
      getLiveStreams(twitchGameId, 5),
      getTotalStreamCount(twitchGameId),
    ])

    // Transform streams to our format
    const streams: TwitchStream[] = streamsResponse.data.map(stream => ({
      streamer_name: stream.user_name,
      streamer_login: stream.user_login,
      title: stream.title,
      viewer_count: stream.viewer_count,
      // Twitch thumbnails have {width} and {height} placeholders
      // Using 320x180 for 16:9 aspect ratio
      thumbnail_url: stream.thumbnail_url
        .replace('{width}', '320')
        .replace('{height}', '180'),
      twitch_url: `https://twitch.tv/${stream.user_login}`,
    }))

    // Streams are already sorted by viewer count from Twitch API
    return NextResponse.json({
      success: true,
      game_name,
      total_live: totalLive,
      streams,
    })

  } catch (error) {
    console.error('Error fetching Twitch streams:', error)
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
  }
}
