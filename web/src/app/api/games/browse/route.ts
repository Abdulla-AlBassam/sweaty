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

  // Incremental test mode - find exactly which filter breaks
  const testLevel = searchParams.get('test')
  if (testLevel) {
    try {
      const token = await getAccessToken()
      let testQuery = ''

      switch (testLevel) {
        case '1':
          // Simplest - no where clause
          testQuery = 'fields name; limit 10;'
          break
        case '2':
          // Cover filter only
          testQuery = 'fields name, cover.image_id; where cover != null; limit 10;'
          break
        case '3':
          // Cover + parent_game filter (exclude DLC)
          testQuery = 'fields name, cover.image_id; where cover != null & parent_game = null; limit 10;'
          break
        case '4':
          // Genre filter (Shooter = 5)
          testQuery = 'fields name, genres.name; where genres = 5; limit 10;'
          break
        case '5':
          // Genre with cover
          testQuery = 'fields name, genres.name, cover.image_id; where cover != null & genres = 5; limit 10;'
          break
        case '6':
          // Multiple genres with OR - using | operator
          testQuery = 'fields name, genres.name; where genres = 5 | genres = 31; limit 10;'
          break
        case '7':
          // Full query with genre
          testQuery = 'fields name, cover.image_id, genres.name; where cover != null & parent_game = null & genres = 5; sort total_rating desc; limit 10;'
          break
        default:
          testQuery = 'fields name; limit 5;'
      }

      console.log('TEST QUERY:', testQuery)

      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: testQuery,
      })

      const text = await response.text()
      console.log('RAW RESPONSE:', text.slice(0, 500))

      try {
        const games = JSON.parse(text)
        return NextResponse.json({
          test: testLevel,
          query: testQuery,
          count: Array.isArray(games) ? games.length : 0,
          games: Array.isArray(games) ? games.slice(0, 5) : games,
          error: games.message || null,
        })
      } catch {
        return NextResponse.json({
          test: testLevel,
          query: testQuery,
          parseError: true,
          raw: text.slice(0, 500),
        })
      }
    } catch (e) {
      return NextResponse.json({ error: 'Test failed', message: String(e) })
    }
  }

  // Lookup mode - search for a specific game and show all its data
  const lookupGame = searchParams.get('lookup')
  if (lookupGame) {
    try {
      const token = await getAccessToken()
      const lookupQuery = `
        search "${lookupGame}";
        fields name, themes.*, genres.*, platforms.name, total_rating, total_rating_count, follows, hypes, cover.image_id;
        limit 5;
      `

      console.log('LOOKUP QUERY:', lookupQuery)

      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: lookupQuery,
      })

      const games = await response.json()

      return NextResponse.json({
        lookup: lookupGame,
        query: lookupQuery,
        results: games,
      })
    } catch (e) {
      return NextResponse.json({ error: 'Lookup failed', message: String(e) })
    }
  }

  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []
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
    // Note: category = 0 is DEPRECATED in IGDB v4 and breaks queries
    // total_rating_count > 5 filters out obscure games (IGDB sorts NULL first)
    const whereConditions: string[] = [
      'cover != null',
      'parent_game = null',
      'total_rating_count > 5',
    ]

    // Genre/Theme filter - use IDs for reliability
    // Single value: genres = 5 (no parentheses)
    // Multiple values: genres = (5,31) (with parentheses)
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

      if (genreIdList.length === 1) {
        whereConditions.push(`genres = ${genreIdList[0]}`)
      } else if (genreIdList.length > 1) {
        whereConditions.push(`genres = (${genreIdList.join(',')})`)
      }

      if (themeIdList.length === 1) {
        whereConditions.push(`themes = ${themeIdList[0]}`)
      } else if (themeIdList.length > 1) {
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
    // Single value: platforms = 167 (no parentheses)
    // Multiple values: platforms = (167,48) (with parentheses)
    if (platforms.length > 0) {
      const platformIdList = platforms.map(p => PLATFORM_IDS[p]).filter(Boolean)
      if (platformIdList.length === 1) {
        whereConditions.push(`platforms = ${platformIdList[0]}`)
      } else if (platformIdList.length > 1) {
        whereConditions.push(`platforms = (${platformIdList.join(',')})`)
      }
    }

    const whereClause = whereConditions.join(' & ')

    const query = `
      fields name, slug, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating, total_rating_count;
      where ${whereClause};
      sort total_rating_count desc;
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
