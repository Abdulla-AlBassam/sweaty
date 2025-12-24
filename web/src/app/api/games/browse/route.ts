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

// Genre mapping - our names to IGDB names
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Debug mode - show what genres IGDB uses
  if (searchParams.get('debug') === '1') {
    try {
      const token = await getAccessToken()

      // Simple query to get games and see their genre names
      const testQuery = `
        fields name, genres.name;
        where category = 0 & cover != null;
        limit 20;
      `

      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: testQuery,
      })

      const games = await response.json()

      // Collect all unique genre names
      const allGenres = games.flatMap((g: any) => g.genres?.map((genre: any) => genre.name) || [])
      const uniqueGenres = [...new Set(allGenres)].sort()

      return NextResponse.json({
        debug: true,
        games: games.map((g: any) => ({ name: g.name, genres: g.genres })),
        availableGenres: uniqueGenres,
      })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  }

  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
  const years = searchParams.get('years')?.split(',').filter(Boolean) || []
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || []
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  console.log('=== BROWSE GAMES API ===')
  console.log('Genres:', genres)
  console.log('Years:', years)
  console.log('Platforms:', platforms)

  try {
    const token = await getAccessToken()

    // Simpler where conditions - removed total_rating requirement
    const whereConditions: string[] = [
      'category = 0',
      'cover != null',
    ]

    // Genre filter - use exact match
    if (genres.length > 0) {
      const mappedGenres = genres.map(g => GENRE_MAP[g] || g)
      const genreConditions = mappedGenres.map(g => `genres.name = "${g}"`).join(' | ')
      whereConditions.push(`(${genreConditions})`)
    }

    // Year filter
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

      if (yearConditions.length > 0) {
        const joined = yearConditions.length === 1 ? yearConditions[0] : `(${yearConditions.join(' | ')})`
        whereConditions.push(joined)
      }
    }

    // Platform filter - use exact match
    if (platforms.length > 0) {
      const platformConditions = platforms.map(p => `platforms.name = "${p}"`).join(' | ')
      whereConditions.push(`(${platformConditions})`)
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
        'Client-ID': TWITCH_CLIENT_ID,
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

    const games = await response.json()

    console.log('IGDB Response count:', games.length)
    if (games.length > 0) {
      console.log('First game:', games[0].name)
    }

    // Check for error message
    if (!Array.isArray(games) && games.message) {
      console.error('IGDB Error:', games.message)
      return NextResponse.json(
        { games: [], count: 0, error: games.message },
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
    })
  } catch (error) {
    console.error('Browse games error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games', games: [], count: 0 },
      { status: 500 }
    )
  }
}
