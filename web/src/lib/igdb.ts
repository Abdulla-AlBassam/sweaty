// IGDB API Helper
// IGDB is owned by Twitch, so we authenticate via Twitch OAuth

// ============================================
// TYPES
// ============================================

export interface IGDBGame {
  id: number
  name: string
  slug?: string
  summary?: string
  cover?: {
    id: number
    image_id: string
  }
  first_release_date?: number // Unix timestamp
  genres?: { id: number; name: string }[]
  platforms?: { id: number; name: string }[]
  rating?: number
  rating_count?: number
  total_rating?: number
  artworks?: { id: number; url: string; width: number; height: number; image_id: string }[]
  screenshots?: { id: number; url: string; width: number; height: number; image_id: string }[]
  videos?: { id: number; video_id: string; name?: string }[] // YouTube video IDs
}

// Video data for trailers
export interface GameVideo {
  videoId: string  // YouTube video ID
  name: string     // e.g., "Launch Trailer", "Gameplay Trailer"
}

// Transformed game data (cleaner format for our app)
export interface Game {
  id: number
  name: string
  slug: string | null
  summary: string | null
  coverUrl: string | null
  firstReleaseDate: string | null // ISO date string
  genres: string[]
  platforms: string[]
  rating: number | null
  artworkUrls?: string[] // Optional array of artwork URLs for poster selection
  screenshotUrls?: string[] // Optional array of screenshot URLs for banners
  videos?: GameVideo[]   // YouTube trailers
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

// Cache the access token in memory
let cachedToken: string | null = null
let tokenExpiresAt: number = 0

// Get a valid access token (fetches new one if expired)
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
// IGDB API CALLS
// ============================================

// Make a request to the IGDB API
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

// Convert IGDB cover to full URL
// IGDB returns image_id, we need to construct the URL
function getCoverUrl(cover?: { image_id: string }): string | null {
  if (!cover?.image_id) return null
  // t_cover_big = 264x374 pixels
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`
}

// Convert Unix timestamp to ISO date string
function unixToIso(timestamp?: number): string | null {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

// Convert IGDB artwork to full URL with specified size
// Sizes: t_thumb, t_cover_big, t_720p, t_1080p, t_screenshot_big
export function getArtworkUrl(imageId: string, size: string = 't_720p'): string {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`
}

// Get artwork URLs from IGDB artworks array, filtered by minimum width
function getArtworkUrls(artworks?: IGDBGame['artworks'], minWidth: number = 500): string[] {
  if (!artworks || artworks.length === 0) return []

  return artworks
    .filter(art => art.width >= minWidth && art.image_id)
    .map(art => getArtworkUrl(art.image_id, 't_720p'))
}

// Get screenshot URLs from IGDB screenshots array (for banners)
// Uses t_screenshot_big size (889x500) which works well for profile banners
function getScreenshotUrls(screenshots?: IGDBGame['screenshots']): string[] {
  if (!screenshots || screenshots.length === 0) return []

  return screenshots
    .filter(s => s.image_id)
    .map(s => `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`)
}

// Transform IGDB response to our cleaner Game format
interface TransformOptions {
  includeArtworks?: boolean
  includeScreenshots?: boolean
  includeVideos?: boolean
}

function transformGame(game: IGDBGame, options: TransformOptions = {}): Game {
  const { includeArtworks = false, includeScreenshots = false, includeVideos = false } = options

  const result: Game = {
    id: game.id,
    name: game.name,
    slug: game.slug || null,
    summary: game.summary || null,
    coverUrl: getCoverUrl(game.cover),
    firstReleaseDate: unixToIso(game.first_release_date),
    genres: game.genres?.map(g => g.name) || [],
    platforms: game.platforms?.map(p => p.name) || [],
    rating: game.total_rating ? Math.round(game.total_rating) : null,
  }

  if (includeArtworks && game.artworks) {
    result.artworkUrls = getArtworkUrls(game.artworks)
  }

  if (includeScreenshots && game.screenshots) {
    result.screenshotUrls = getScreenshotUrls(game.screenshots)
  }

  if (includeVideos && game.videos) {
    result.videos = game.videos.map(v => ({
      videoId: v.video_id,
      name: v.name || 'Trailer'
    }))
  }

  return result
}

// ============================================
// PUBLIC API
// ============================================

// Search for games by name
export async function searchGames(query: string, limit: number = 50): Promise<Game[]> {
  // IGDB uses a custom query language called "Apicalypse"
  // search "query" - fuzzy searches game names (relevance-based)
  // fields - which fields to return
  // limit - max results (we fetch more and filter client-side)
  const body = `search "${query}";
fields name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, total_rating, category;
limit ${limit};`

  // Log the query for debugging
  console.log('IGDB Query:', body)

  const games = await igdbFetch('games', body) as (IGDBGame & { category?: number })[]

  // Filter and sort results:
  // - Category 0 = Main Game, 4 = Expansion, 8 = Remake, 9 = Remaster, 10 = Expanded Game, 11 = Port
  // - Exclude: 1 = DLC, 2 = Expansion (old), 3 = Bundle, 5 = Standalone Expansion, 6 = Mod, 7 = Episode
  const validCategories = new Set([0, 4, 8, 9, 10, 11])

  const filtered = games.filter(game => {
    // Include if category is valid or undefined (assume main game)
    return game.category === undefined || validCategories.has(game.category)
  })

  // Sort by rating (popular games first), then by name
  const sorted = filtered.sort((a, b) => {
    // Games with ratings come first
    if (a.total_rating && !b.total_rating) return -1
    if (!a.total_rating && b.total_rating) return 1
    // Then sort by rating descending
    if (a.total_rating && b.total_rating) {
      return b.total_rating - a.total_rating
    }
    // Finally by name
    return a.name.localeCompare(b.name)
  })

  return sorted.map(game => transformGame(game))
}

// Get a single game by ID
export async function getGameById(id: number): Promise<Game | null> {
  const body = `
    fields name, slug, summary, cover.image_id, first_release_date,
           genres.name, platforms.name, total_rating, rating, rating_count,
           artworks.url, artworks.width, artworks.height, artworks.image_id,
           screenshots.url, screenshots.width, screenshots.height, screenshots.image_id,
           videos.video_id, videos.name;
    where id = ${id};
  `

  const games = await igdbFetch('games', body) as IGDBGame[]

  if (games.length === 0) return null
  return transformGame(games[0], { includeArtworks: true, includeScreenshots: true, includeVideos: true })
}

// Get multiple games by IDs (useful for batch fetching)
export async function getGamesByIds(ids: number[]): Promise<Game[]> {
  if (ids.length === 0) return []

  const body = `
    fields name, slug, summary, cover.image_id, first_release_date,
           genres.name, platforms.name, total_rating;
    where id = (${ids.join(',')});
    limit ${ids.length};
  `

  const games = await igdbFetch('games', body) as IGDBGame[]
  return games.map(game => transformGame(game))
}

// Get recent games released within the last N months
// Useful for AI recommendations when user asks for "new" or "recent" games
export async function getRecentGames(limit: number = 50, monthsBack: number = 24): Promise<Game[]> {
  // Calculate timestamp for N months ago
  const now = new Date()
  const pastDate = new Date(now.setMonth(now.getMonth() - monthsBack))
  const unixTimestamp = Math.floor(pastDate.getTime() / 1000)

  const body = `
    fields name, slug, summary, cover.image_id, first_release_date,
           genres.name, platforms.name, total_rating, category;
    where first_release_date > ${unixTimestamp}
      & category = (0, 8, 9, 10)
      & total_rating != null
      & cover != null;
    sort total_rating desc;
    limit ${limit};
  `

  console.log('IGDB Recent Games Query:', body)

  const games = await igdbFetch('games', body) as IGDBGame[]
  return games.map(game => transformGame(game))
}

// Get popular game IDs from IGDB's popularity_primitives endpoint
// This is the same data source as IGDB's homepage "Popular Right Now"
async function getPopularGameIds(limit: number = 15): Promise<number[]> {
  const token = await getAccessToken()

  const query = `
    fields game_id, value, popularity_type;
    sort value desc;
    limit ${limit};
  `

  console.log('=== IGDB Popularity Primitives ===')
  console.log('Query:', query)

  const response = await fetch('https://api.igdb.com/v4/popularity_primitives', {
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
    console.error('Popularity primitives error:', response.status, errorText)
    throw new Error(`IGDB API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('Popularity primitives count:', data.length)
  if (data.length > 0) {
    console.log('First primitive:', JSON.stringify(data[0]))
  }

  // Deduplicate game IDs (popularity_primitives can return multiple entries per game)
  const allGameIds = data.map((item: { game_id: number }) => item.game_id)
  const gameIds = [...new Set(allGameIds)] as number[]
  return gameIds.slice(0, limit)
}

// Get popular/trending games from IGDB
// Uses the popularity_primitives endpoint (same as IGDB homepage "Popular Right Now")
export async function getPopularGames(limit: number = 15): Promise<Game[]> {
  console.log('=== IGDB Popular Games ===')

  try {
    // First get popular game IDs from popularity_primitives
    const gameIds = await getPopularGameIds(limit)

    if (gameIds.length === 0) {
      console.log('No popular game IDs found')
      return []
    }

    console.log('Popular game IDs:', gameIds)

    // Then fetch full game details for those IDs
    const body = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating;
      where id = (${gameIds.join(',')});
      limit ${limit};
    `

    const games = await igdbFetch('games', body) as IGDBGame[]
    console.log('Fetched games count:', games.length)

    // Sort by original popularity order (preserve ranking from popularity_primitives)
    const sortedGames = gameIds
      .map(id => games.find(g => g.id === id))
      .filter((g): g is IGDBGame => g !== undefined)

    return sortedGames.map(game => transformGame(game))
  } catch (error) {
    console.error('getPopularGames error:', error)
    throw error
  }
}

// Get similar games to a specific game
// Uses IGDB's similar_games field, with genre-based fallback
export async function getSimilarGames(gameId: number, limit: number = 15): Promise<Game[]> {
  try {
    // Get the game's similar_games and genres for fallback
    const gameBody = `
      fields similar_games, genres;
      where id = ${gameId};
    `

    const gameData = await igdbFetch('games', gameBody) as Array<{ similar_games?: number[], genres?: number[] }>

    console.log('[getSimilarGames] Game data for ID', gameId, ':', JSON.stringify(gameData[0]))

    // Try similar_games first
    if (gameData[0]?.similar_games && gameData[0].similar_games.length > 0) {
      const similarIds = gameData[0].similar_games.slice(0, limit)
      console.log('[getSimilarGames] Found', similarIds.length, 'similar_games IDs:', similarIds.slice(0, 5), '...')

      const body = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where id = (${similarIds.join(',')})
          & cover != null;
        limit ${limit};
      `

      const games = await igdbFetch('games', body) as IGDBGame[]
      console.log('[getSimilarGames] Fetched', games.length, 'games from similar_games')

      if (games.length > 0) {
        const sorted = games.sort((a, b) => (b.total_rating || 0) - (a.total_rating || 0))
        console.log('[getSimilarGames] Returning', sorted.length, 'similar games')
        return sorted.map(game => transformGame(game))
      }
    } else {
      console.log('[getSimilarGames] No similar_games field found for game', gameId)
    }

    // Fallback: Find games with same genres
    if (gameData[0]?.genres && gameData[0].genres.length > 0) {
      console.log('[getSimilarGames] Falling back to genre-based search with genres:', gameData[0].genres)
      const genreIds = gameData[0].genres.slice(0, 2) // Use up to 2 genres for better matches

      // Try with rating first (lowered threshold to 60)
      let body = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where genres = (${genreIds.join(',')})
          & id != ${gameId}
          & cover != null
          & total_rating != null
          & total_rating > 60
          & category = (0, 8, 9, 10);
        sort total_rating desc;
        limit ${limit};
      `

      let games = await igdbFetch('games', body) as IGDBGame[]
      console.log('[getSimilarGames] Found', games.length, 'genre-based recommendations (rated 60+)')

      // If no rated games, try without rating filter
      if (games.length === 0) {
        console.log('[getSimilarGames] Trying without rating filter')
        body = `
          fields name, slug, summary, cover.image_id, first_release_date,
                 genres.name, platforms.name, total_rating, category;
          where genres = (${genreIds.join(',')})
            & id != ${gameId}
            & cover != null
            & category = (0, 8, 9, 10);
          sort first_release_date desc;
          limit ${limit};
        `
        games = await igdbFetch('games', body) as IGDBGame[]
        console.log('[getSimilarGames] Found', games.length, 'genre-based recommendations (unrated)')
      }

      return games.map(game => transformGame(game))
    }

    console.log('[getSimilarGames] No similar games or genres found')
    return []
  } catch (error) {
    console.error('getSimilarGames error:', error)
    return []
  }
}

// Get games by a specific company (developer/publisher)
export async function getGamesByCompany(companyName: string, limit: number = 15): Promise<Game[]> {
  try {
    // First find the company ID - try exact match then search
    let companyBody = `
      fields id, name;
      where name ~ "${companyName}"*;
      limit 5;
    `

    let companyData = await igdbFetch('companies', companyBody) as Array<{
      id: number
      name: string
    }>

    // If no results, try search
    if (!companyData || companyData.length === 0) {
      companyBody = `
        fields id, name;
        search "${companyName}";
        limit 5;
      `
      companyData = await igdbFetch('companies', companyBody) as Array<{
        id: number
        name: string
      }>
    }

    if (!companyData || companyData.length === 0) {
      console.log('[getGamesByCompany] Company not found:', companyName)
      return []
    }

    // Try to find exact match first
    const exactMatch = companyData.find(c => c.name.toLowerCase() === companyName.toLowerCase())
    const company = exactMatch || companyData[0]

    console.log('[getGamesByCompany] Found company:', company.name, 'ID:', company.id)

    // Get involved_companies records - prioritize developer roles
    const involvedBody = `
      fields game;
      where company = ${company.id} & developer = true;
      limit 150;
    `

    let involvedData = await igdbFetch('involved_companies', involvedBody) as Array<{ game: number }>
    console.log('[getGamesByCompany] Found', involvedData.length, 'games as developer')

    // If no games as developer, check publisher too
    if (involvedData.length === 0) {
      const pubBody = `
        fields game;
        where company = ${company.id};
        limit 150;
      `
      involvedData = await igdbFetch('involved_companies', pubBody) as Array<{ game: number }>
      console.log('[getGamesByCompany] Found', involvedData.length, 'games as dev/pub')
    }

    if (involvedData.length === 0) {
      return []
    }

    const gameIds = [...new Set(involvedData.map(ic => ic.game))]
    console.log('[getGamesByCompany] Unique game IDs:', gameIds.length)

    // Fetch full game details - first try with rating filter (lowered to 50)
    let body = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating, category;
      where id = (${gameIds.join(',')})
        & cover != null
        & total_rating != null
        & total_rating > 50
        & category = (0, 8, 9, 10);
      sort total_rating desc;
      limit ${limit};
    `

    let games = await igdbFetch('games', body) as IGDBGame[]
    console.log('[getGamesByCompany] Found', games.length, 'rated games (50+) from', company.name)

    // If not enough, try without rating filter
    if (games.length < 5) {
      console.log('[getGamesByCompany] Not enough rated games, trying without rating filter...')
      body = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where id = (${gameIds.join(',')})
          & cover != null
          & category = (0, 8, 9, 10);
        sort first_release_date desc;
        limit ${limit};
      `
      const unratedGames = await igdbFetch('games', body) as IGDBGame[]
      console.log('[getGamesByCompany] Found', unratedGames.length, 'total games from', company.name)

      // Merge and dedupe
      const allIds = new Set(games.map(g => g.id))
      for (const g of unratedGames) {
        if (!allIds.has(g.id)) {
          games.push(g)
          allIds.add(g.id)
        }
      }
    }

    return games.slice(0, limit).map(game => transformGame(game))
  } catch (error) {
    console.error('getGamesByCompany error:', error)
    return []
  }
}

// Get smart similar games - simplified and reliable
export async function getSmartSimilarGames(gameId: number, limit: number = 15): Promise<Game[]> {
  try {
    // Get the game's data
    const gameBody = `
      fields name, similar_games, genres, themes, franchises;
      where id = ${gameId};
    `

    const gameData = await igdbFetch('games', gameBody) as Array<{
      name?: string
      similar_games?: number[]
      genres?: number[]
      themes?: number[]
      franchises?: number[]
    }>

    if (!gameData[0]) {
      console.log('[getSmartSimilarGames] Game not found:', gameId)
      return []
    }

    const game = gameData[0]
    console.log('[getSmartSimilarGames] Finding similar games for:', game.name)
    console.log('[getSmartSimilarGames] similar_games:', game.similar_games?.length || 0)
    console.log('[getSmartSimilarGames] themes:', game.themes)
    console.log('[getSmartSimilarGames] franchises:', game.franchises)
    console.log('[getSmartSimilarGames] genres:', game.genres)

    let allCandidates: IGDBGame[] = []

    // Strategy 1: IGDB's similar_games (most reliable - IGDB already curates this)
    if (game.similar_games && game.similar_games.length > 0) {
      const similarIds = game.similar_games.slice(0, 20)
      console.log('[getSmartSimilarGames] Fetching similar_games IDs:', similarIds)
      const similarBody = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where id = (${similarIds.join(',')})
          & cover != null;
        limit 20;
      `
      const similarGames = await igdbFetch('games', similarBody) as IGDBGame[]
      console.log('[getSmartSimilarGames] Got', similarGames.length, 'from similar_games')
      allCandidates.push(...similarGames)
    }

    // Strategy 2: Same franchise (e.g., The Last of Us → other Naughty Dog games)
    if (game.franchises && game.franchises.length > 0 && allCandidates.length < limit) {
      const franchiseBody = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where franchises = (${game.franchises.join(',')})
          & id != ${gameId}
          & cover != null
          & category = (0, 8, 9, 10);
        sort total_rating desc;
        limit 15;
      `
      const franchiseGames = await igdbFetch('games', franchiseBody) as IGDBGame[]
      console.log('[getSmartSimilarGames] Got', franchiseGames.length, 'from franchise')
      allCandidates.push(...franchiseGames)
    }

    // Strategy 3: Same themes (if available)
    if (game.themes && game.themes.length > 0 && allCandidates.length < limit) {
      const themeBody = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where themes = (${game.themes.slice(0, 2).join(',')})
          & id != ${gameId}
          & cover != null
          & total_rating > 70
          & category = (0, 8, 9, 10);
        sort total_rating desc;
        limit 15;
      `
      const themeGames = await igdbFetch('games', themeBody) as IGDBGame[]
      console.log('[getSmartSimilarGames] Got', themeGames.length, 'from themes')
      allCandidates.push(...themeGames)
    }

    // Strategy 4: Genre fallback (always works)
    if (game.genres && game.genres.length > 0 && allCandidates.length < limit) {
      const genreBody = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where genres = (${game.genres.slice(0, 2).join(',')})
          & id != ${gameId}
          & cover != null
          & total_rating > 75
          & category = (0, 8, 9, 10);
        sort total_rating desc;
        limit 15;
      `
      const genreGames = await igdbFetch('games', genreBody) as IGDBGame[]
      console.log('[getSmartSimilarGames] Got', genreGames.length, 'from genres')
      allCandidates.push(...genreGames)
    }

    // Strategy 5: Ultimate fallback - just get highly rated games
    if (allCandidates.length < 5) {
      console.log('[getSmartSimilarGames] Using ultimate fallback - top rated games')
      const fallbackBody = `
        fields name, slug, summary, cover.image_id, first_release_date,
               genres.name, platforms.name, total_rating, category;
        where id != ${gameId}
          & cover != null
          & total_rating > 85
          & category = (0, 8, 9, 10);
        sort total_rating desc;
        limit 20;
      `
      const fallbackGames = await igdbFetch('games', fallbackBody) as IGDBGame[]
      console.log('[getSmartSimilarGames] Got', fallbackGames.length, 'from fallback')
      allCandidates.push(...fallbackGames)
    }

    // Deduplicate and sort by rating
    const uniqueGames = new Map<number, IGDBGame>()
    for (const g of allCandidates) {
      if (!uniqueGames.has(g.id)) {
        uniqueGames.set(g.id, g)
      }
    }

    const sortedGames = Array.from(uniqueGames.values())
      .sort((a, b) => (b.total_rating || 0) - (a.total_rating || 0))
      .slice(0, limit)

    console.log('[getSmartSimilarGames] Returning', sortedGames.length, 'unique games')
    return sortedGames.map(g => transformGame(g))
  } catch (error) {
    console.error('getSmartSimilarGames error:', error)
    return []
  }
}

// Get game with company info (for identifying user's most-played studio)
// Returns developers separately from publishers for better recommendations
export async function getGameWithCompany(gameId: number): Promise<{
  game: Game
  companies: string[]
  developers: string[]
  publishers: string[]
} | null> {
  try {
    const body = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${gameId};
    `

    const games = await igdbFetch('games', body) as Array<IGDBGame & {
      involved_companies?: Array<{
        company: { name: string }
        developer: boolean
        publisher: boolean
      }>
    }>

    if (!games[0]) return null

    const game = games[0]

    // Separate developers from publishers
    const developers = game.involved_companies
      ?.filter(ic => ic.developer)
      .map(ic => ic.company.name) || []

    const publishers = game.involved_companies
      ?.filter(ic => ic.publisher && !ic.developer)
      .map(ic => ic.company.name) || []

    // All companies for backwards compatibility
    const companies = game.involved_companies
      ?.filter(ic => ic.developer || ic.publisher)
      .map(ic => ic.company.name) || []

    return {
      game: transformGame(game),
      companies,
      developers,
      publishers
    }
  } catch (error) {
    console.error('getGameWithCompany error:', error)
    return null
  }
}
