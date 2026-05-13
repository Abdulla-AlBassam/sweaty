import { NextRequest, NextResponse } from 'next/server'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!

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
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
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

// IGDB Genre IDs - more reliable than name matching
const GENRE_IDS: Record<string, number> = {
  'Action': 25,        // Hack and slash/Beat 'em up
  'Adventure': 31,
  'RPG': 12,           // Role-playing (RPG)
  'Shooter': 5,
  'Sports': 14,        // Sport
  'Puzzle': 9,
  'Strategy': 15,
  'Racing': 10,
  'Fighting': 4,
  'Simulation': 13,    // Simulator
  'Platformer': 8,     // Platform
  'Indie': 32,
  'MOBA': 36,
  'Arcade': 33,
  'Music': 7,
}

// IGDB Theme IDs - these are THEMES, not genres
const THEME_IDS: Record<string, number> = {
  'Horror': 19,
  'Sci-Fi': 18,
  'Fantasy': 17,
  'Survival': 21,
  'Stealth': 22,
  'Comedy': 27,
  'Historical': 22,
  'War': 39,
  'Mystery': 43,
}

// IGDB Platform IDs
const PLATFORM_IDS: Record<string, number> = {
  'PlayStation 5': 167,
  'PlayStation 4': 48,
  'Xbox Series X|S': 169,
  'Xbox One': 49,
  'Nintendo Switch': 130,
  'PC (Microsoft Windows)': 6,
  'iOS': 39,
  'Android': 34,
  'macOS': 14,
  'Linux': 3,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const years = searchParams.get('years')?.split(',').filter(Boolean) || []
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || []
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '80')

  console.log('=== BROWSE GAMES API ===')
  console.log('Genres:', genres)
  console.log('Years:', years)
  console.log('Platforms:', platforms)

  try {
    const token = await getAccessToken()

    // Start with basic conditions
    // Note: category = 0 is DEPRECATED in IGDB v4 and breaks queries
    // total_rating_count > 5 filters out obscure games (IGDB sorts NULL first)
    const whereConditions: string[] = [
      'cover != null',
      'parent_game = null',
      'total_rating_count > 5',
    ]

    // Genre/Theme filter - use IDs for reliability
    // Always use parentheses: genres = (5) for proper array containment matching
    if (genres.length > 0) {
      const genreIdList: number[] = []
      const themeIdList: number[] = []

      for (const g of genres) {
        if (GENRE_IDS[g]) {
          genreIdList.push(GENRE_IDS[g])
        } else if (THEME_IDS[g]) {
          themeIdList.push(THEME_IDS[g])
        }
      }

      if (genreIdList.length > 0) {
        whereConditions.push(`genres = (${genreIdList.join(',')})`)
      }

      if (themeIdList.length > 0) {
        whereConditions.push(`themes = (${themeIdList.join(',')})`)
      }
    }

    // Year filter - use Date.UTC for proper timestamps
    if (years.length > 0) {
      const yearConditions: string[] = []

      for (const year of years) {
        if (year.endsWith('s')) {
          // Decade like "2010s" -> 2010-2019
          const decadeStart = parseInt(year.slice(0, 4))
          const startTs = Math.floor(Date.UTC(decadeStart, 0, 1) / 1000)
          const endTs = Math.floor(Date.UTC(decadeStart + 10, 0, 1) / 1000)
          yearConditions.push(`(first_release_date >= ${startTs} & first_release_date < ${endTs})`)
        } else {
          // Single year like "2024"
          const y = parseInt(year)
          const startTs = Math.floor(Date.UTC(y, 0, 1) / 1000)
          const endTs = Math.floor(Date.UTC(y + 1, 0, 1) / 1000)
          yearConditions.push(`(first_release_date >= ${startTs} & first_release_date < ${endTs})`)
        }
      }

      if (yearConditions.length > 0) {
        whereConditions.push(`(${yearConditions.join(' | ')})`)
      }
    }

    // Platform filter - use IDs
    // Always use parentheses: platforms = (167) for proper array containment matching
    if (platforms.length > 0) {
      const platformIdList = platforms.map(p => PLATFORM_IDS[p]).filter(Boolean)
      if (platformIdList.length > 0) {
        whereConditions.push(`platforms = (${platformIdList.join(',')})`)
      }
    }

    const whereClause = whereConditions.join(' & ')

    // Sports genre (ID 14) should prioritize recent games
    const isSportsQuery = genres.includes('Sports')
    const sortClause = isSportsQuery ? 'sort first_release_date desc' : 'sort total_rating_count desc'

    const query = `
      fields name, slug, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating, total_rating_count;
      where ${whereClause};
      ${sortClause};
      offset ${offset};
      limit ${limit};
    `

    console.log('=== BROWSE QUERY ===')
    console.log('Where clause:', whereClause)
    console.log('Full query:', query)
    console.log('Endpoint: https://api.igdb.com/v4/games')

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    console.log('IGDB Response Status:', response.status)
    const rawText = await response.text()
    console.log('IGDB Raw Response (first 500 chars):', rawText.slice(0, 500))

    let games
    try {
      games = JSON.parse(rawText)
    } catch (e) {
      console.error('Failed to parse IGDB response:', e)
      return NextResponse.json(
        { error: 'Failed to parse IGDB response', raw: rawText.slice(0, 500) },
        { status: 500 }
      )
    }

    console.log('Parsed games count:', Array.isArray(games) ? games.length : 'not an array')
    if (Array.isArray(games) && games.length > 0) {
      console.log('First game:', games[0].name)
    }

    // Check for error message
    if (!Array.isArray(games) && games.message) {
      console.error('IGDB Error:', games.message)
      return NextResponse.json(
        { games: [], count: 0, error: games.message, query: whereClause },
        { status: 400 }
      )
    }

    // Transform games
    const transformedGames = games.map((game: any) => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      coverUrl: game.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
      firstReleaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString()
        : null,
      genres: game.genres?.map((g: any) => g.name) || [],
      platforms: game.platforms?.map((p: any) => p.name) || [],
      rating: game.total_rating ? Math.round(game.total_rating) : null,
      ratingCount: game.total_rating_count || 0,
    }))

    return NextResponse.json({
      games: transformedGames,
      count: transformedGames.length,
      offset,
      hasMore: games.length === limit,
      debug_query: whereClause,
    })
  } catch (error) {
    console.error('Browse games error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games', games: [], count: 0 },
      { status: 500 }
    )
  }
}
