// IGDB API Helper
// IGDB is owned by Twitch, so we authenticate via Twitch OAuth

// ============================================
// CONSTANTS
// ============================================

// Major gaming platforms (modern consoles + PC)
// PC=6, PS4=48, PS5=167, XboxOne=49, XboxSeriesX=169, Switch=130
const MAJOR_PLATFORMS = [6, 48, 167, 49, 169, 130]
const MAJOR_PLATFORMS_FILTER = `platforms = (${MAJOR_PLATFORMS.join(',')})`

// User-selectable platform mapping (name -> IGDB IDs)
export const PLATFORM_ID_MAP: Record<string, number[]> = {
  playstation: [48, 167],     // PS4, PS5
  xbox: [49, 169],            // Xbox One, Xbox Series X|S
  pc: [6],                    // PC (Windows)
  nintendo: [130],            // Nintendo Switch
}

// Convert platform names to IGDB platform IDs
export function getPlatformIds(platforms: string[] | null | undefined): number[] {
  if (!platforms || platforms.length === 0) return MAJOR_PLATFORMS

  const ids: number[] = []
  for (const platform of platforms) {
    const platformIds = PLATFORM_ID_MAP[platform.toLowerCase()]
    if (platformIds) {
      ids.push(...platformIds)
    }
  }
  return ids.length > 0 ? [...new Set(ids)] : MAJOR_PLATFORMS
}

// Build IGDB WHERE clause for platform filter
function buildPlatformFilter(platforms?: string[] | null): string {
  const ids = getPlatformIds(platforms)
  return `platforms = (${ids.join(',')})`
}

// Valid game categories (exclude DLCs, mods, episodes, bundles, seasons)
// 0=Main, 4=Standalone Expansion, 8=Remake, 9=Remaster, 10=Expanded Game
const VALID_CATEGORIES = [0, 4, 8, 9, 10]

// Edition keywords to filter out (Ultimate Edition, GOTY, Deluxe, etc.)
const EDITION_KEYWORDS = [
  'ultimate edition', 'deluxe edition', 'gold edition', 'goty edition',
  'game of the year edition', 'complete edition', 'definitive edition',
  'premium edition', 'collector\'s edition', 'special edition',
  'enhanced edition', 'director\'s cut edition', 'extended edition',
  'anniversary edition', 'legendary edition', 'royal edition',
  'season pass', 'bundle', 'pack',
]

// Check if a game name contains edition keywords (case-insensitive)
function isSpecialEdition(name: string): boolean {
  const lowerName = name.toLowerCase()
  return EDITION_KEYWORDS.some(keyword => lowerName.includes(keyword))
}

// PC platform names that indicate a game is on PC
const PC_PLATFORM_NAMES = [
  'pc',
  'windows',
  'mac',
  'linux',
  'pc (microsoft windows)',
  'macos',
  'classic mac os',
  'steam',
  'dos',
]

// Check if a game is PC-only based on its platforms array
export function isPcOnlyGame(platforms: string[] | null | undefined): boolean {
  if (!platforms || platforms.length === 0) return false
  const normalizedPlatforms = platforms.map(p => p.toLowerCase().trim())
  return normalizedPlatforms.every(platform =>
    PC_PLATFORM_NAMES.some(pcName => platform.includes(pcName))
  )
}

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
  themes?: { id: number; name: string }[]
  platforms?: { id: number; name: string }[]
  rating?: number
  rating_count?: number
  total_rating?: number
  total_rating_count?: number // Number of ratings (for popularity filtering)
  category?: number // Game type: 0=main, 1=dlc, 2=expansion, 8=remake, 9=remaster, 10=expanded, 11=port
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

// Pick the best banner image from screenshots and artworks.
// Prefers landscape screenshots (in-game footage) over artworks (often text/logo heavy).
export function pickBestBannerImage(
  screenshots?: { image_id: string; width?: number; height?: number }[],
  artworks?: { image_id: string; width?: number; height?: number }[]
): string | null {
  const toUrl = (imageId: string) =>
    `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`

  const isLandscape = (img: { width?: number; height?: number }) =>
    img.width && img.height && img.width / img.height >= 1.3

  const validScreenshots = (screenshots || []).filter(s => s.image_id)
  const validArtworks = (artworks || []).filter(a => a.image_id)

  // 1. Landscape screenshot (ideal)
  const landscapeScreenshot = validScreenshots.find(isLandscape)
  if (landscapeScreenshot) return toUrl(landscapeScreenshot.image_id)

  // 2. Any screenshot (still better than promotional art)
  if (validScreenshots.length > 0) return toUrl(validScreenshots[0].image_id)

  // 3. Landscape artwork with decent width
  const landscapeArtwork = validArtworks.find(a => isLandscape(a) && (a.width ?? 0) >= 500)
  if (landscapeArtwork) return toUrl(landscapeArtwork.image_id)

  // 4. Any artwork (last resort)
  if (validArtworks.length > 0) return toUrl(validArtworks[0].image_id)

  return null
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
// Optional platforms param filters to specific platforms (e.g., ['playstation', 'pc'])
export async function searchGames(query: string, limit: number = 50, platforms?: string[]): Promise<Game[]> {
  // Use IGDB search command for fuzzy name matching
  // Then sort results client-side by popularity (total_rating_count)
  const escapedQuery = query.replace(/"/g, '\\"')
  const platformFilter = buildPlatformFilter(platforms)

  const body = `search "${escapedQuery}";
fields name, slug, summary, cover.image_id, first_release_date, genres.name, platforms.name, total_rating, total_rating_count, category;
where ${platformFilter};
limit ${Math.min(limit * 2, 100)};`

  console.log('IGDB Query:', body)

  const games = await igdbFetch('games', body) as (IGDBGame & { category?: number })[]

  // Category definitions:
  // Main games: 0=Main Game, 8=Remake, 9=Remaster, 10=Expanded Game, 11=Port
  // Excluded: 1=DLC, 2=Expansion(old), 3=Bundle, 6=Mod, 7=Episode
  const mainGameCategories = new Set([0, 8, 9, 10, 11])
  const excludedCategories = new Set([1, 2, 3, 6, 7])

  // Filter out DLCs, mods, bundles, episodes
  const filtered = games.filter(game => {
    if (game.category === undefined) return true
    return !excludedCategories.has(game.category)
  })

  // Sort by popularity (total_rating_count) - most popular first
  const sorted = filtered.sort((a, b) => {
    const aIsMain = a.category === undefined || mainGameCategories.has(a.category)
    const bIsMain = b.category === undefined || mainGameCategories.has(b.category)

    // Main games come first
    if (aIsMain && !bIsMain) return -1
    if (!aIsMain && bIsMain) return 1

    // Sort by popularity (total_rating_count descending)
    const aPopularity = a.total_rating_count || 0
    const bPopularity = b.total_rating_count || 0

    return bPopularity - aPopularity
  })

  return sorted.slice(0, limit).map(game => transformGame(game))
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

// Fetch popularity data from IGDB PopScore API
// popularity_type: 1=Visits, 2=Want to Play, 3=Playing, 4=Played, 5=Steam Peak, 6=Positive Reviews
export async function getPopularityForGames(gameIds: number[]): Promise<Map<number, number>> {
  const popularityMap = new Map<number, number>()

  if (gameIds.length === 0) return popularityMap

  try {
    // Get "Want to Play" popularity (type 2) - good indicator of mainstream appeal
    const body = `
      fields game_id, value, popularity_type;
      where game_id = (${gameIds.join(',')}) & popularity_type = 2;
      limit 500;
    `
    const data = await igdbFetch('popularity_primitives', body) as Array<{
      game_id: number
      value: number
      popularity_type: number
    }>

    for (const item of data) {
      popularityMap.set(item.game_id, item.value)
    }
  } catch (error) {
    console.log('[getPopularityForGames] Could not fetch popularity data:', error)
  }

  return popularityMap
}

// Graph-based recommendation engine.
// Instead of rigid tiers, traverses IGDB's similar_games graph 2 hops deep
// and scores every candidate on a continuous scale:
//   score = baseSignal * genreRelevance * quality * confidence * recency
//
// Sources (accumulated per candidate -- a game found through multiple sources scores higher):
//   +5  Direct similar_games (community-curated)
//   +2  2nd-hop similar_games (per link, uncapped -- convergence = relevance)
//   +4  Collection sibling (same series)
//   +3  Franchise sibling
//   +2  Same developer
//   +1  Genre fallback (only when pool < 15)
//
// Filters DLCs via parent_game, editions via version_parent, junk via keyword list.
export async function getSmartSimilarGames(gameId: number, limit: number = 15, platforms?: string[], excludePcOnly: boolean = false): Promise<Game[]> {
  const platformFilter = buildPlatformFilter(platforms)
  const TAG = '[SmartSimilar]'

  const GAME_FIELDS = `name, slug, summary, cover.image_id, first_release_date,
    genres.id, genres.name, themes.id, themes.name, platforms.name,
    total_rating, total_rating_count, category, parent_game, version_parent`

  function isValidCandidate(g: IGDBGame & { parent_game?: number | null; version_parent?: number | null }): boolean {
    if (!VALID_CATEGORIES.includes(g.category || 0)) return false
    if (g.parent_game) return false
    if (g.version_parent) return false
    if (isSpecialEdition(g.name || '')) return false
    return true
  }

  try {
    // ── Step 1: Fetch seed game data ─────────────────────────
    const gameBody = `
      fields name, similar_games, genres.id, genres.name, themes.id, themes.name,
             franchise, franchises, collections,
             involved_companies.company.id, involved_companies.company.name, involved_companies.developer;
      where id = ${gameId};
    `
    const gameData = await igdbFetch('games', gameBody) as Array<{
      name?: string
      similar_games?: number[]
      genres?: { id: number; name: string }[]
      themes?: { id: number; name: string }[]
      franchise?: number
      franchises?: number[]
      collections?: number[]
      involved_companies?: Array<{
        company: { id: number; name: string }
        developer: boolean
      }>
    }>

    if (!gameData?.[0]) {
      console.log(TAG, 'Game not found:', gameId)
      return []
    }

    const game = gameData[0]
    const baseGenreIds = new Set(game.genres?.map(g => g.id) || [])
    const baseThemeIds = new Set(game.themes?.map(t => t.id) || [])
    const primaryDeveloper = (game.involved_companies || []).find(ic => ic?.developer && ic?.company)?.company || null

    console.log(TAG, 'Seed:', game.name,
      '| Genres:', game.genres?.map(g => g.name).join(', ') || 'none',
      '| similar_games:', game.similar_games?.length || 0,
      '| Collections:', game.collections?.length || 0,
      '| Developer:', primaryDeveloper?.name || 'none')

    // ── Step 2: Gather candidates with source scores ─────────
    const candidateScores = new Map<number, number>()
    function addScore(id: number, points: number) {
      if (id === gameId) return
      candidateScores.set(id, (candidateScores.get(id) || 0) + points)
    }

    // Source A: Direct similar_games (+5 each) -- strongest signal
    const directSimilarIds = game.similar_games || []
    for (const id of directSimilarIds) addScore(id, 5)

    // Fire all source queries in parallel (Pro plan: 60s timeout)
    await Promise.all([
      // Source B: 2nd-hop -- similar_games of similar_games (+2 per link)
      (async () => {
        if (directSimilarIds.length === 0) return
        try {
          const hopData = await igdbFetch('games', `
            fields id, similar_games;
            where id = (${directSimilarIds.slice(0, 25).join(',')});
            limit 25;
          `) as Array<{ id: number; similar_games?: number[] }>

          for (const g of hopData || []) {
            for (const id of (g.similar_games || []).slice(0, 10)) {
              addScore(id, 2)
            }
          }
          console.log(TAG, `2nd-hop: expanded through ${hopData?.length || 0} games`)
        } catch (e) { console.log(TAG, '2nd-hop failed:', e) }
      })(),

      // Source C: Collection siblings (+4) -- same series
      (async () => {
        if (!game.collections?.length) return
        try {
          const data = await igdbFetch('collections', `
            fields name, games;
            where id = (${game.collections.join(',')});
          `) as Array<{ name?: string; games?: number[] }>

          for (const c of data || []) {
            console.log(TAG, `Collection "${c.name}": ${c.games?.length || 0} games`)
            for (const id of c.games || []) addScore(id, 4)
          }
        } catch (e) { console.log(TAG, 'Collection failed:', e) }
      })(),

      // Source D: Franchise siblings (+3)
      (async () => {
        const ids = [...new Set([
          ...(game.franchise ? [game.franchise] : []),
          ...(game.franchises || []),
        ])]
        if (ids.length === 0) return
        try {
          const data = await igdbFetch('franchises', `
            fields name, games;
            where id = (${ids.join(',')});
          `) as Array<{ name?: string; games?: number[] }>

          for (const f of data || []) {
            console.log(TAG, `Franchise "${f.name}": ${f.games?.length || 0} games`)
            for (const id of f.games || []) addScore(id, 3)
          }
        } catch (e) { console.log(TAG, 'Franchise failed:', e) }
      })(),

      // Source E: Developer's other games (+2)
      (async () => {
        if (!primaryDeveloper?.id) return
        try {
          const data = await igdbFetch('involved_companies', `
            fields game;
            where company = ${primaryDeveloper.id} & developer = true;
            limit 100;
          `) as Array<{ game?: number }>

          for (const ic of data || []) {
            if (ic.game) addScore(ic.game, 2)
          }
          console.log(TAG, `Developer "${primaryDeveloper.name}": ${data?.length || 0} games`)
        } catch (e) { console.log(TAG, 'Developer failed:', e) }
      })(),
    ])

    // Source F: Genre+theme fallback if pool is too thin
    if (candidateScores.size < 15 && baseGenreIds.size >= 2) {
      try {
        const genreArr = [...baseGenreIds].slice(0, 3)
        const themeArr = [...baseThemeIds].slice(0, 2)
        let where = `genres = (${genreArr.join(',')}) & cover != null & total_rating >= 75 & total_rating_count >= 20 & category = (${VALID_CATEGORIES.join(',')}) & id != ${gameId} & parent_game = null & ${platformFilter}`
        if (themeArr.length > 0) where += ` & themes = (${themeArr.join(',')})`

        const results = await igdbFetch('games', `
          fields id;
          where ${where};
          sort total_rating desc;
          limit 40;
        `) as Array<{ id: number }>

        for (const g of results || []) addScore(g.id, 1)
        console.log(TAG, `Genre fallback: +${results?.length || 0} candidates`)
      } catch (e) { console.log(TAG, 'Genre fallback failed:', e) }
    }

    console.log(TAG, 'Unique candidates:', candidateScores.size)
    if (candidateScores.size === 0) return []

    // ── Step 3: Fetch candidate details in batches ───────────
    // Fetch top 200 candidates (Pro plan: 60s timeout)
    const rankedIds = [...candidateScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 200)

    const allCandidates: (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[] = []
    for (let i = 0; i < rankedIds.length; i += 50) {
      const batch = rankedIds.slice(i, i + 50)
      const results = await igdbFetch('games', `
        fields ${GAME_FIELDS};
        where id = (${batch.join(',')}) & cover != null & ${platformFilter};
        limit 50;
      `) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]
      allCandidates.push(...(results || []))
    }

    const validCandidates = allCandidates.filter(isValidCandidate)
    console.log(TAG, `Fetched ${allCandidates.length}, valid after DLC/edition filter: ${validCandidates.length}`)

    // ── Step 4: Final scoring with full game data ────────────
    const scored = validCandidates.map(g => {
      const base = candidateScores.get(g.id) || 0

      // Genre relevance: +0.3 per shared genre (multiplicative)
      const genreOverlap = (g.genres || []).filter(genre => baseGenreIds.has(genre.id)).length
      const themeOverlap = (g.themes || []).filter(theme => baseThemeIds.has(theme.id)).length
      const relevance = 1 + genreOverlap * 0.3 + themeOverlap * 0.15

      // Quality: higher-rated games score better (floor 0.4)
      const quality = Math.max(0.4, (g.total_rating || 40) / 100)

      // Confidence: more ratings = less likely to be random noise
      const rc = g.total_rating_count || 0
      const confidence = rc >= 50 ? 1.0 : rc >= 10 ? 0.8 : rc >= 3 ? 0.5 : 0.3

      // Recency: newer games get a significant boost
      const ageYears = g.first_release_date
        ? (Date.now() / 1000 - g.first_release_date) / (365.25 * 24 * 3600)
        : 15
      const recency = ageYears <= 2 ? 1.5
        : ageYears <= 5 ? 1.2
        : ageYears <= 10 ? 1.0
        : ageYears <= 20 ? 0.7
        : 0.5

      const score = base * relevance * quality * confidence * recency
      return { game: g, score, base, genreOverlap }
    })

    scored.sort((a, b) => b.score - a.score)

    // ── Step 5: Transform and return ─────────────────────────
    let games = scored.map(s => transformGame(s.game))

    if (excludePcOnly) {
      const before = games.length
      games = games.filter(g => !isPcOnlyGame(g.platforms))
      if (before !== games.length) console.log(TAG, `Filtered ${before - games.length} PC-only`)
    }

    const result = games.slice(0, limit)

    console.log(TAG, `Returning ${result.length}/${validCandidates.length}:`)
    scored.slice(0, 15).forEach((s, i) => {
      console.log(TAG, `  ${i + 1}. ${s.game.name} (score: ${s.score.toFixed(1)} | base: ${s.base} | genres: ${s.genreOverlap})`)
    })

    return result
  } catch (error) {
    console.error(TAG, 'Error:', error)
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
