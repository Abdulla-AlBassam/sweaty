import { NextRequest, NextResponse } from 'next/server'

// ============================================
// TYPES
// ============================================

interface IGDBGame {
  id: number
  name: string
  slug?: string
  cover?: {
    id: number
    image_id: string
  }
  first_release_date?: number
  genres?: { id: number; name: string }[]
  platforms?: { id: number; name: string }[]
  total_rating?: number
}

interface BrowseGame {
  id: number
  name: string
  coverUrl: string | null
  rating: number | null
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedToken: string | null = null
let tokenExpiresAt: number = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 300000) {
    return cachedToken
  }

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
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000

  return cachedToken!
}

// ============================================
// IGDB API
// ============================================

async function igdbFetch(endpoint: string, body: string): Promise<unknown> {
  const token = await getAccessToken()

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('IGDB API error:', response.status, errorText)
    throw new Error(`IGDB API error: ${response.status} ${errorText}`)
  }

  return response.json()
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCoverUrl(cover?: { image_id: string }): string | null {
  if (!cover?.image_id) return null
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`
}

// Map our genre names to IGDB genre names
const GENRE_MAP: Record<string, string> = {
  'Action': 'Action',
  'Adventure': 'Adventure',
  'RPG': 'Role-playing (RPG)',
  'Horror': 'Horror',
  'Shooter': 'Shooter',
  'Sports': 'Sport',
  'Puzzle': 'Puzzle',
  'Strategy': 'Strategy',
  'Racing': 'Racing',
  'Fighting': 'Fighting',
  'Simulation': 'Simulator',
  'Platformer': 'Platform',
  'Indie': 'Indie',
  'MOBA': 'MOBA',
  'Music': 'Music',
}

// Build timestamp range for year filters
function getYearTimestampRange(year: string): { start: number; end: number } | null {
  if (year.endsWith('s')) {
    // Decade like "2010s", "2000s"
    const decadeStart = parseInt(year.replace('s', ''))
    if (isNaN(decadeStart)) return null

    const startDate = new Date(decadeStart, 0, 1) // Jan 1 of decade start
    const endDate = new Date(decadeStart + 10, 0, 1) // Jan 1 of next decade

    return {
      start: Math.floor(startDate.getTime() / 1000),
      end: Math.floor(endDate.getTime() / 1000),
    }
  } else {
    // Single year like "2024"
    const yearNum = parseInt(year)
    if (isNaN(yearNum)) return null

    const startDate = new Date(yearNum, 0, 1) // Jan 1
    const endDate = new Date(yearNum + 1, 0, 1) // Jan 1 next year

    return {
      start: Math.floor(startDate.getTime() / 1000),
      end: Math.floor(endDate.getTime() / 1000),
    }
  }
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const genresParam = searchParams.get('genres')
    const yearsParam = searchParams.get('years')
    const platformsParam = searchParams.get('platforms')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const genres = genresParam ? genresParam.split(',').filter(Boolean) : []
    const years = yearsParam ? yearsParam.split(',').filter(Boolean) : []
    const platforms = platformsParam ? platformsParam.split(',').filter(Boolean) : []
    const limit = Math.min(parseInt(limitParam || '50'), 100)
    const offset = parseInt(offsetParam || '0')

    console.log('=== Browse Games API ===')
    console.log('Genres:', genres)
    console.log('Years:', years)
    console.log('Platforms:', platforms)
    console.log('Limit:', limit, 'Offset:', offset)

    // Build where conditions
    const whereConditions: string[] = [
      'category = 0',  // Main games only
      'cover != null', // Must have cover art
    ]

    // Genre filter
    if (genres.length > 0) {
      const igdbGenres = genres
        .map(g => GENRE_MAP[g] || g)
        .map(g => `"${g}"`)
        .join(',')
      whereConditions.push(`genres.name = (${igdbGenres})`)
    }

    // Platform filter
    if (platforms.length > 0) {
      const platformQueries = platforms.map(p => `"${p}"`).join(',')
      whereConditions.push(`platforms.name = (${platformQueries})`)
    }

    // Year filter - use first year only for IGDB query (multiple OR not well supported)
    if (years.length > 0) {
      const range = getYearTimestampRange(years[0])
      if (range) {
        whereConditions.push(`first_release_date >= ${range.start}`)
        whereConditions.push(`first_release_date < ${range.end}`)
      }
    }

    const query = `
      fields name, slug, cover.image_id, total_rating, first_release_date, genres.name, platforms.name;
      where ${whereConditions.join(' & ')};
      sort total_rating desc;
      limit ${limit};
      offset ${offset};
    `

    console.log('IGDB Query:', query)

    const games = await igdbFetch('games', query) as IGDBGame[]
    console.log('Results count:', games.length)

    // Transform to simpler format
    const results: BrowseGame[] = games.map(game => ({
      id: game.id,
      name: game.name,
      coverUrl: getCoverUrl(game.cover),
      rating: game.total_rating ? Math.round(game.total_rating) : null,
    }))

    return NextResponse.json({
      games: results,
      count: results.length,
      offset,
      hasMore: results.length === limit,
    })
  } catch (error) {
    console.error('Browse games error:', error)
    return NextResponse.json(
      { error: 'Failed to browse games' },
      { status: 500 }
    )
  }
}
