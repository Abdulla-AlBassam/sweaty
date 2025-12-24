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

// Genre mapping - our app names to exact IGDB genre names
// Based on debug output: Shooter, Adventure, Indie, Visual Novel, Role-playing (RPG), Strategy, Platform, Sport, Racing, Arcade, Puzzle
const GENRE_MAP: Record<string, string> = {
  'Action': 'Hack and slash/Beat \'em up',
  'Adventure': 'Adventure',
  'RPG': 'Role-playing (RPG)',
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
  'Arcade': 'Arcade',
}

// Horror is a THEME in IGDB, not a genre
const HORROR_THEME = 'Horror'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Debug mode - extensive logging for troubleshooting
  if (searchParams.get('debug') === '1') {
    console.log('=== DEBUG MODE ===')
    console.log('TWITCH_CLIENT_ID exists:', !!TWITCH_CLIENT_ID)
    console.log('TWITCH_CLIENT_SECRET exists:', !!TWITCH_CLIENT_SECRET)
    console.log('TWITCH_CLIENT_ID value:', TWITCH_CLIENT_ID?.slice(0, 5) + '...')

    // Get token and log it
    let token: string
    try {
      const tokenResponse = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
        { method: 'POST' }
      )
      const tokenData = await tokenResponse.json()
      console.log('Token response:', tokenData)
      token = tokenData.access_token

      if (!token) {
        return NextResponse.json({
          error: 'Failed to get access token',
          tokenResponse: tokenData,
          clientIdExists: !!TWITCH_CLIENT_ID,
          clientSecretExists: !!TWITCH_CLIENT_SECRET,
        })
      }
    } catch (e) {
      return NextResponse.json({ error: 'Token fetch failed', message: String(e) })
    }

    // Simple query
    const testQuery = `fields name, genres.name; limit 10;`
    console.log('Test query:', testQuery)

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: testQuery,
      })

      console.log('IGDB response status:', response.status)
      const rawText = await response.text()
      console.log('IGDB raw response:', rawText.slice(0, 500))

      // Try to parse as JSON
      let parsed
      try {
        parsed = JSON.parse(rawText)
      } catch {
        parsed = null
      }

      return NextResponse.json({
        debug: true,
        tokenOk: !!token,
        tokenPreview: token.slice(0, 10) + '...',
        igdbStatus: response.status,
        rawResponse: rawText.slice(0, 1000),
        parsed: parsed,
      })
    } catch (e) {
      return NextResponse.json({ error: 'IGDB fetch failed', message: String(e) })
    }
  }

  let genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const years = searchParams.get('years')?.split(',').filter(Boolean) || []
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || []
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '30')

  console.log('=== BROWSE GAMES API ===')
  console.log('Genres:', genres)
  console.log('Years:', years)
  console.log('Platforms:', platforms)

  try {
    const token = await getAccessToken()

    // Start with basic conditions
    const whereConditions: string[] = [
      'category = 0',
      'cover != null',
    ]

    // Check if Horror is requested (it's a theme, not genre in IGDB)
    const includeHorror = genres.includes('Horror')
    if (includeHorror) {
      whereConditions.push(`themes.name = "${HORROR_THEME}"`)
      genres = genres.filter(g => g !== 'Horror')
    }

    // Genre filter - use exact match
    if (genres.length > 0) {
      const mappedGenres = genres.map(g => GENRE_MAP[g] || g)
      const genreConditions = mappedGenres.map(g => `genres.name = "${g}"`).join(' | ')
      whereConditions.push(`(${genreConditions})`)
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

    // Platform filter - use exact match
    if (platforms.length > 0) {
      const platformConditions = platforms.map(p => `platforms.name = "${p}"`).join(' | ')
      whereConditions.push(`(${platformConditions})`)
    }

    const whereClause = whereConditions.join(' & ')

    const query = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, themes.name, total_rating;
      where ${whereClause};
      sort total_rating desc;
      offset ${offset};
      limit ${limit};
    `

    console.log('=== BROWSE QUERY ===')
    console.log('Where clause:', whereClause)
    console.log('Full query:', query)

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    const games = await response.json()

    console.log('Response count:', games.length)
    if (games.length > 0) {
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
