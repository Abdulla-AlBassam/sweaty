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

// Get similar games using a 4-tier recommendation system:
//   Tier 0: Franchise / Collection (same series)
//   Tier 1: IGDB similar_games (community-curated)
//   Tier 2: Same developer with genre overlap
//   Tier 3: Genre + theme discovery (broadest net)
// Uses parent_game + version_parent fields to filter DLCs and edition variants.
// Franchise results are genre-gated to prevent broad franchises (e.g. "Marvel") from polluting results.
export async function getSmartSimilarGames(gameId: number, limit: number = 15, platforms?: string[], excludePcOnly: boolean = false): Promise<Game[]> {
  const platformFilter = buildPlatformFilter(platforms)
  const TAG = '[SmartSimilar]'

  // Shared fields we request for every candidate game batch
  const GAME_FIELDS = `name, slug, summary, cover.image_id, first_release_date,
    genres.id, genres.name, themes.id, themes.name, platforms.name,
    total_rating, total_rating_count, category, parent_game, version_parent`

  // Central filter: valid category, not a DLC/expansion/edition
  function isValidCandidate(g: IGDBGame & { parent_game?: number | null; version_parent?: number | null }): boolean {
    if (!VALID_CATEGORIES.includes(g.category || 0)) return false
    if (g.parent_game) return false          // has a parent → it's DLC/expansion content
    if (g.version_parent) return false       // has a version parent → it's an edition variant (GOTY, Deluxe, etc.)
    if (isSpecialEdition(g.name || '')) return false  // keyword fallback for unlabelled editions
    return true
  }

  try {
    // ── Step 1: Fetch base game data ──────────────────────────
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
    const developerCompanies = game.involved_companies?.filter(ic => ic?.developer && ic?.company) || []
    const primaryDeveloper = developerCompanies[0]?.company || null

    console.log(TAG, 'Base game:', game.name)
    console.log(TAG, 'Genres:', game.genres?.map(g => g.name).join(', ') || 'none')
    console.log(TAG, 'Themes:', game.themes?.map(t => t.name).join(', ') || 'none')
    console.log(TAG, 'Developer:', primaryDeveloper?.name || 'none',
      '| Franchise:', game.franchise || 'none',
      '| Franchises:', game.franchises?.length || 0,
      '| Collections:', game.collections?.length || 0,
      '| similar_games:', game.similar_games?.length || 0)

    // Buckets per tier
    const tier0Games: IGDBGame[] = []  // franchise + collection
    const tier1Games: IGDBGame[] = []  // IGDB similar_games
    const tier2Games: IGDBGame[] = []  // same developer
    const tier3Games: IGDBGame[] = []  // genre + theme discovery

    // Helper: fetch a batch of games by ID and filter
    async function fetchAndFilter(ids: number[], tag: string): Promise<IGDBGame[]> {
      if (ids.length === 0) return []
      const unique = [...new Set(ids)].filter(id => id !== gameId).slice(0, 50)
      if (unique.length === 0) return []
      const body = `
        fields ${GAME_FIELDS};
        where id = (${unique.join(',')}) & cover != null & ${platformFilter};
        limit 50;
      `
      const results = await igdbFetch('games', body) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]
      const valid = (results || []).filter(isValidCandidate)
      console.log(TAG, `${tag}: ${valid.length}/${results?.length || 0} valid`)
      return valid
    }

    // ── Tier 0a: COLLECTIONS (series-level, most specific) ───
    // Collections = specific series (e.g. "Spider-Man series"), preferred over franchises
    if (game.collections && game.collections.length > 0) {
      try {
        const collectionQuery = `
          fields name, games;
          where id = (${game.collections.join(',')});
        `
        const collectionData = await igdbFetch('collections', collectionQuery) as Array<{ name?: string; games?: number[] }>
        const collectionIds: number[] = []
        for (const c of collectionData || []) {
          if (c?.games) {
            console.log(TAG, `Collection "${c.name}": ${c.games.length} games`)
            collectionIds.push(...c.games)
          }
        }
        const results = await fetchAndFilter(collectionIds, 'COLLECTION')
        tier0Games.push(...results)
      } catch (e) {
        console.log(TAG, 'Collection query failed:', e)
      }
    }

    // ── Tier 0b: FRANCHISE (broader umbrella, genre-gated) ───
    // Franchises can be very broad (e.g. "Marvel" includes fighting games,
    // strategy games, etc.). Require at least 1 genre overlap with the seed
    // game so Spider-Man 2 won't pull in Marvel vs Capcom.
    const allFranchiseIds = [
      ...(game.franchise ? [game.franchise] : []),
      ...(game.franchises || []),
    ]
    const uniqueFranchiseIds = [...new Set(allFranchiseIds)]

    if (uniqueFranchiseIds.length > 0 && baseGenreIds.size > 0) {
      try {
        const franchiseQuery = `
          fields name, games;
          where id = (${uniqueFranchiseIds.join(',')});
        `
        const franchiseData = await igdbFetch('franchises', franchiseQuery) as Array<{ name?: string; games?: number[] }>
        const franchiseGameIds: number[] = []
        for (const f of franchiseData || []) {
          if (f?.games) {
            console.log(TAG, `Franchise "${f.name}": ${f.games.length} games`)
            franchiseGameIds.push(...f.games)
          }
        }

        // Fetch candidates but require genre overlap to narrow broad franchises
        const candidateIds = [...new Set(franchiseGameIds)].filter(id => id !== gameId).slice(0, 50)
        if (candidateIds.length > 0) {
          const body = `
            fields ${GAME_FIELDS};
            where id = (${candidateIds.join(',')}) & cover != null & ${platformFilter};
            limit 50;
          `
          const results = await igdbFetch('games', body) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]
          const valid = (results || []).filter(g => {
            if (!isValidCandidate(g)) return false
            // Genre gate: at least 1 shared genre with seed game
            const gGenreIds = g.genres?.map(genre => genre.id) || []
            return gGenreIds.some(id => baseGenreIds.has(id))
          })
          // Dedupe against collection results already in tier0
          const existingIds = new Set(tier0Games.map(g => g.id))
          const newResults = valid.filter(g => !existingIds.has(g.id))
          console.log(TAG, `FRANCHISE (genre-gated): ${newResults.length}/${results?.length || 0} valid`)
          tier0Games.push(...newResults)
        }
      } catch (e) {
        console.log(TAG, 'Franchise query failed:', e)
      }
    }

    // ── Tier 0 fallback: name-based search when collection/franchise is empty ──
    if (tier0Games.length === 0 && game.name) {
      try {
        const baseName = game.name
          .replace(/\s+(Part\s+)?[IVX]+$/i, '')
          .replace(/\s+\d+$/i, '')
          .replace(/\s+(Remastered|Remake|Definitive|GOTY|Edition|Enhanced|Director's Cut)$/i, '')
          .replace(/:\s+.*$/, '')
          .trim()

        if (baseName.length >= 4 && baseName !== game.name) {
          console.log(TAG, 'NAME FALLBACK: Searching for', baseName)
          const searchQuery = `
            search "${baseName}";
            fields ${GAME_FIELDS};
            where cover != null & total_rating != null & total_rating >= 70;
            limit 20;
          `
          const searchResults = await igdbFetch('games', searchQuery) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]
          const valid = (searchResults || []).filter(g => g.id !== gameId && isValidCandidate(g))
          console.log(TAG, `NAME FALLBACK: ${valid.length} valid`)
          tier0Games.push(...valid)
        }
      } catch (e) {
        console.log(TAG, 'Name search fallback failed:', e)
      }
    }

    // ── Tier 1: IGDB similar_games (community-curated) ───────
    if (game.similar_games && game.similar_games.length > 0) {
      try {
        const results = await fetchAndFilter(game.similar_games, 'SIMILAR_GAMES')
        tier1Games.push(...results)
      } catch (e) {
        console.log(TAG, 'Similar games query failed:', e)
      }
    }

    // ── Tier 2: SAME DEVELOPER (with genre overlap) ──────────
    if (primaryDeveloper?.id && baseGenreIds.size > 0) {
      try {
        const devQuery = `
          fields game;
          where company = ${primaryDeveloper.id} & developer = true;
          limit 100;
        `
        const devInvolved = await igdbFetch('involved_companies', devQuery) as Array<{ game?: number }>
        const devGameIds = [...new Set((devInvolved || []).filter(ic => ic?.game).map(ic => ic.game as number))].filter(id => id !== gameId)

        if (devGameIds.length > 0) {
          const body = `
            fields ${GAME_FIELDS};
            where id = (${devGameIds.slice(0, 30).join(',')}) & cover != null & ${platformFilter};
            limit 30;
          `
          const devGames = await igdbFetch('games', body) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]
          const valid = (devGames || []).filter(g => {
            if (!isValidCandidate(g)) return false
            const devGenreIds = g.genres?.map(genre => genre.id) || []
            return devGenreIds.some(id => baseGenreIds.has(id))
          })
          console.log(TAG, `DEVELOPER (${primaryDeveloper.name}): ${valid.length} valid (genre-filtered)`)
          tier2Games.push(...valid)
        }
      } catch (e) {
        console.log(TAG, 'Developer query failed:', e)
      }
    }

    // ── Tier 3: GENRE + THEME DISCOVERY ──────────────────────
    // Find well-known, highly-rated games that share 2+ genres AND 1+ themes.
    // This is the broadest discovery tier — surfaces games the user wouldn't find
    // through series or developer alone.
    // Gated by total_rating_count >= 20 to exclude obscure titles that
    // inflate ratings with few votes.
    if (baseGenreIds.size >= 2) {
      try {
        // Pick up to 3 genre IDs and up to 2 theme IDs for the query
        const genreArr = [...baseGenreIds].slice(0, 3)
        const themeArr = [...baseThemeIds].slice(0, 2)

        // IGDB WHERE: must match at least one genre (we filter for 2+ overlap in JS),
        // have a decent rating, AND enough ratings to be a known title
        let whereClause = `genres = (${genreArr.join(',')}) & cover != null & total_rating >= 70 & total_rating_count >= 20 & category = (${VALID_CATEGORIES.join(',')}) & id != ${gameId} & parent_game = null & ${platformFilter}`
        if (themeArr.length > 0) {
          whereClause += ` & themes = (${themeArr.join(',')})`
        }

        const discoveryQuery = `
          fields ${GAME_FIELDS};
          where ${whereClause};
          sort total_rating desc;
          limit 40;
        `
        const discoveryResults = await igdbFetch('games', discoveryQuery) as (IGDBGame & { parent_game?: number | null; version_parent?: number | null })[]

        // Post-filter: must have 2+ genre overlap, valid candidate
        const valid = (discoveryResults || []).filter(g => {
          if (!isValidCandidate(g)) return false
          const gGenreIds = g.genres?.map(genre => genre.id) || []
          const genreOverlap = gGenreIds.filter(id => baseGenreIds.has(id)).length
          return genreOverlap >= 2
        })

        console.log(TAG, `GENRE+THEME DISCOVERY: ${valid.length}/${discoveryResults?.length || 0} valid (2+ genre overlap, 20+ ratings)`)
        tier3Games.push(...valid)
      } catch (e) {
        console.log(TAG, 'Genre+theme discovery failed:', e)
      }
    }

    // ── Step 2: Deduplicate and assign tiers ─────────────────
    const seenIds = new Set<number>()
    const finalList: IGDBGame[] = []
    const tierMap = new Map<number, number>()

    const tiers = [
      { games: tier0Games, tier: 0, label: 'SERIES' },
      { games: tier1Games, tier: 1, label: 'SIMILAR' },
      { games: tier2Games, tier: 2, label: 'DEVELOPER' },
      { games: tier3Games, tier: 3, label: 'DISCOVERY' },
    ]

    for (const { games: tierGames, tier, label } of tiers) {
      let added = 0
      for (const g of tierGames) {
        if (!seenIds.has(g.id)) {
          seenIds.add(g.id)
          tierMap.set(g.id, tier)
          finalList.push(g)
          added++
        }
      }
      if (added > 0) console.log(TAG, `After ${label}: +${added} (total: ${finalList.length})`)
    }

    if (finalList.length === 0) {
      console.log(TAG, 'No similar games found')
      return []
    }

    // ── Step 3: Fetch PopScore and sort ──────────────────────
    const allGameIds = finalList.map(g => g.id)
    const popularityMap = await getPopularityForGames(allGameIds)
    console.log(TAG, 'PopScore data for', popularityMap.size, '/', allGameIds.length, 'games')

    const scoredGames = finalList.map(g => ({
      game: g,
      tier: tierMap.get(g.id) ?? 3,
      popScore: popularityMap.get(g.id) || 0,
    }))

    scoredGames.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier
      return b.popScore - a.popScore
    })

    // ── Step 4: Transform and filter ─────────────────────────
    let games = scoredGames.map(g => transformGame(g.game))

    if (excludePcOnly) {
      const beforeCount = games.length
      games = games.filter(g => !isPcOnlyGame(g.platforms))
      if (beforeCount !== games.length) {
        console.log(TAG, `Filtered ${beforeCount - games.length} PC-only games`)
      }
    }

    const result = games.slice(0, limit)

    // Log top results
    const tierLabels = ['SERIES', 'SIMILAR', 'DEVELOPER', 'DISCOVERY']
    console.log(TAG, `Final ${result.length} games:`)
    scoredGames.slice(0, Math.min(10, limit)).forEach((g, i) => {
      console.log(`  ${i + 1}. ${g.game.name} [${tierLabels[g.tier] || '?'}] (pop: ${g.popScore})`)
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
