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
  rating_count?: number
  message?: string // For error responses
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
// HELPER FUNCTIONS
// ============================================

// Map our genre names to IGDB genre names for exact matching
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

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const years = searchParams.get('years')?.split(',').filter(Boolean) || []
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || []
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  console.log('=== BROWSE GAMES API ===')
  console.log('Genres:', genres)
  console.log('Years:', years)
  console.log('Platforms:', platforms)
  console.log('Offset:', offset, 'Limit:', limit)

  try {
    const token = await getAccessToken()

    // Build where conditions
    const whereConditions: string[] = [
      'category = 0',      // Main games only
      'cover != null',     // Must have cover
      'total_rating != null', // Must have ratings for sorting
    ]

    // Genre filter - use case-insensitive partial match with ~ operator
    if (genres.length > 0) {
      const genreConditions = genres.map(g => {
        const igdbGenre = GENRE_MAP[g] || g
        return `genres.name ~ *"${igdbGenre}"*`
      })
      // Use | for OR between multiple genres
      if (genreConditions.length === 1) {
        whereConditions.push(genreConditions[0])
      } else {
        whereConditions.push(`(${genreConditions.join(' | ')})`)
      }
    }

    // Year filter - build timestamp conditions
    if (years.length > 0) {
      const yearConditions: string[] = []

      for (const year of years) {
        if (year.endsWith('s')) {
          // Decade like "2010s"
          const decadeStart = parseInt(year.slice(0, 4))
          const startTimestamp = Math.floor(new Date(`${decadeStart}-01-01T00:00:00Z`).getTime() / 1000)
          const endTimestamp = Math.floor(new Date(`${decadeStart + 10}-01-01T00:00:00Z`).getTime() / 1000)
          yearConditions.push(`(first_release_date >= ${startTimestamp} & first_release_date < ${endTimestamp})`)
        } else {
          // Single year like "2024"
          const yearNum = parseInt(year)
          const startTimestamp = Math.floor(new Date(`${yearNum}-01-01T00:00:00Z`).getTime() / 1000)
          const endTimestamp = Math.floor(new Date(`${yearNum + 1}-01-01T00:00:00Z`).getTime() / 1000)
          yearConditions.push(`(first_release_date >= ${startTimestamp} & first_release_date < ${endTimestamp})`)
        }
      }

      if (yearConditions.length === 1) {
        whereConditions.push(yearConditions[0])
      } else if (yearConditions.length > 1) {
        whereConditions.push(`(${yearConditions.join(' | ')})`)
      }
    }

    // Platform filter - use case-insensitive partial match
    if (platforms.length > 0) {
      const platformConditions = platforms.map(p => `platforms.name ~ *"${p}"*`)
      if (platformConditions.length === 1) {
        whereConditions.push(platformConditions[0])
      } else {
        whereConditions.push(`(${platformConditions.join(' | ')})`)
      }
    }

    const query = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating, rating_count;
      where ${whereConditions.join(' & ')};
      sort total_rating desc;
      offset ${offset};
      limit ${limit};
    `

    console.log('IGDB Query:', query)

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('IGDB API error:', response.status, errorText)
      return NextResponse.json(
        { error: `IGDB API error: ${response.status}`, games: [], count: 0 },
        { status: 500 }
      )
    }

    const games = await response.json() as IGDBGame[]

    console.log('IGDB Response count:', games.length)
    if (games.length > 0) {
      console.log('First game:', games[0].name)
    }

    // Check if IGDB returned an error message
    if (Array.isArray(games) === false && (games as unknown as { message?: string }).message) {
      console.error('IGDB Error:', (games as unknown as { message: string }).message)
      return NextResponse.json(
        { games: [], count: 0, error: (games as unknown as { message: string }).message },
        { status: 400 }
      )
    }

    // Transform games to our format
    const transformedGames = games.map((game) => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      coverUrl: game.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
      firstReleaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString()
        : null,
      genres: game.genres?.map((g) => g.name) || [],
      platforms: game.platforms?.map((p) => p.name) || [],
      rating: game.total_rating ? Math.round(game.total_rating) : null,
    }))

    return NextResponse.json({
      games: transformedGames,
      count: transformedGames.length,
      offset,
      hasMore: games.length === limit,
    })
  } catch (error) {
    console.error('Browse games error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games', games: [], count: 0 },
      { status: 500 }
    )
  }
}
