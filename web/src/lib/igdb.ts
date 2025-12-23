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

// Transform IGDB response to our cleaner Game format
function transformGame(game: IGDBGame, includeArtworks: boolean = false): Game {
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
           artworks.url, artworks.width, artworks.height, artworks.image_id;
    where id = ${id};
  `

  const games = await igdbFetch('games', body) as IGDBGame[]

  if (games.length === 0) return null
  return transformGame(games[0], true) // Include artworks for game detail pages
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

// Get popular/trending games from IGDB
// Fetches games with the most followers/interest, sorted by popularity
export async function getPopularGames(limit: number = 15): Promise<Game[]> {
  // IGDB query for popular games:
  // - Main games only (category 0)
  // - Has a cover image
  // - Sorted by follows (most followed games)
  const body = `
    fields name, slug, summary, cover.image_id, first_release_date,
           genres.name, platforms.name, total_rating, follows;
    where category = 0
      & cover != null;
    sort follows desc;
    limit ${limit};
  `

  console.log('IGDB Popular Games Query:', body)

  const games = await igdbFetch('games', body) as IGDBGame[]
  return games.map(game => transformGame(game))
}
