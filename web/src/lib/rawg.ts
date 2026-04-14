// RAWG API helper
// Docs: https://api.rawg.io/docs/
// Skill reference: .claude/skills/rawg-api/SKILL.md
//
// Role in Sweaty: IGDB is canonical; RAWG supplies enrichment fields
// (Metacritic, playtime, ESRB, stores, game modes, exact release date)
// and powers time-sensitive discovery feeds. Mobile never calls RAWG
// directly — everything goes through /web API routes.

const RAWG_KEY = process.env.RAWG_API_KEY
const RAWG_BASE = 'https://api.rawg.io/api'

export interface RawgGameDetail {
  id: number
  slug: string
  name: string
  released: string | null
  metacritic: number | null
  playtime: number // hours, 0 when RAWG has no Steam data
  platforms?: Array<{ platform: { id: number; name: string; slug: string } }>
  stores?: Array<{ store: { id: number; name: string; slug: string } }>
  game_modes?: Array<{ id: number; name: string; slug: string }>
  background_image?: string | null
  description_raw?: string
}

export interface RawgStoreLink {
  id: number
  store_id: number
  url: string
}

// Sweaty-shaped enrichment payload — exactly what GameDetailScreen consumes.
export interface RawgEnrichment {
  rawgId: number | null
  rawgSlug: string | null
  metacritic: number | null
  playtimeHours: number | null
  releasedDate: string | null
  gameModes: string[]
  stores: Array<{
    storeId: number
    name: string
    url: string
  }>
}

// RAWG store_id → display name. Per skill reference/endpoints.
export const STORE_NAMES: Record<number, string> = {
  1: 'Steam',
  2: 'Xbox Store',
  3: 'PlayStation Store',
  4: 'App Store',
  5: 'GOG',
  6: 'Nintendo Store',
  7: 'Xbox 360 Store',
  8: 'Google Play',
  9: 'itch.io',
  11: 'Epic Games',
}

function assertKey() {
  if (!RAWG_KEY) {
    throw new Error('RAWG_API_KEY is not set in the environment')
  }
}

function withKey(path: string, params?: Record<string, string | number | undefined>) {
  assertKey()
  const url = new URL(`${RAWG_BASE}${path}`)
  url.searchParams.set('key', RAWG_KEY!)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    }
  }
  return url.toString()
}

async function rawgGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(withKey(path, params), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`RAWG ${path} failed: ${res.status} ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

// ============================================
// RECONCILIATION (IGDB -> RAWG)
// ============================================

// Resolve an IGDB game (by name + optional slug + release year) to a RAWG game.
// Strategy:
//   1. If igdbSlug looks clean, try /games/{slug} directly — cheapest path.
//   2. Otherwise, search by name and score candidates by slug equality, release-year match, and name similarity.
// Returns null if no confident match.
export async function resolveRawgGame(args: {
  name: string
  igdbSlug?: string | null
  releaseYear?: number | null
}): Promise<RawgGameDetail | null> {
  const { name, igdbSlug, releaseYear } = args

  // Path 1: direct slug lookup
  if (igdbSlug) {
    try {
      const direct = await rawgGet<RawgGameDetail>(`/games/${encodeURIComponent(igdbSlug)}`)
      if (direct && direct.id && isConfidentMatch(direct, name, releaseYear)) {
        return direct
      }
    } catch {
      // Fall through to search
    }
  }

  // Path 2: search
  try {
    const search = await rawgGet<{ results: RawgGameDetail[] }>('/games', {
      search: name,
      search_precise: 'true',
      page_size: 5,
    })
    const candidates = search.results || []
    if (candidates.length === 0) return null

    // Score each candidate
    let best: { game: RawgGameDetail; score: number } | null = null
    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, name, igdbSlug ?? null, releaseYear ?? null)
      if (!best || score > best.score) {
        best = { game: candidate, score }
      }
    }
    if (!best || best.score < 3) return null

    // Fetch full detail for the winner (search results are truncated)
    try {
      return await rawgGet<RawgGameDetail>(`/games/${best.game.id}`)
    } catch {
      return best.game
    }
  } catch {
    return null
  }
}

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function isConfidentMatch(game: RawgGameDetail, name: string, releaseYear?: number | null): boolean {
  if (!game.name) return false
  const nameMatch = normaliseName(game.name) === normaliseName(name)
  if (!nameMatch) return false
  if (releaseYear && game.released) {
    const rawgYear = new Date(game.released).getUTCFullYear()
    if (Math.abs(rawgYear - releaseYear) > 1) return false
  }
  return true
}

function scoreCandidate(
  game: RawgGameDetail,
  name: string,
  igdbSlug: string | null,
  releaseYear: number | null,
): number {
  let score = 0
  const normTarget = normaliseName(name)
  const normCandidate = normaliseName(game.name || '')

  if (normCandidate === normTarget) score += 4
  else if (normCandidate.startsWith(normTarget) || normTarget.startsWith(normCandidate)) score += 2

  if (igdbSlug && game.slug === igdbSlug) score += 3

  if (releaseYear && game.released) {
    const rawgYear = new Date(game.released).getUTCFullYear()
    if (rawgYear === releaseYear) score += 2
    else if (Math.abs(rawgYear - releaseYear) === 1) score += 1
  }

  return score
}

// ============================================
// ENRICHMENT
// ============================================

// Fetch the per-game store link list. Detail endpoint gives us the available
// stores, but NOT the direct URLs. /games/{id}/stores returns URLs keyed by store_id.
export async function fetchStoreLinks(rawgId: number): Promise<RawgStoreLink[]> {
  try {
    const res = await rawgGet<{ results: RawgStoreLink[] }>(`/games/${rawgId}/stores`)
    return res.results || []
  } catch {
    return []
  }
}

// Transform a raw RAWG detail + store list into the Sweaty shape the UI expects.
// Handles the "playtime = 0 means hide" and "null metacritic/ESRB means hide" rules.
export function normaliseEnrichment(
  detail: RawgGameDetail | null,
  storeLinks: RawgStoreLink[],
): RawgEnrichment {
  if (!detail) {
    return {
      rawgId: null,
      rawgSlug: null,
      metacritic: null,
      playtimeHours: null,
      releasedDate: null,
      gameModes: [],
      stores: [],
    }
  }

  const urlByStore = new Map<number, string>()
  for (const link of storeLinks) {
    urlByStore.set(link.store_id, link.url)
  }

  const stores =
    (detail.stores ?? [])
      .map((entry) => {
        const storeId = entry.store.id
        const url = urlByStore.get(storeId) ?? null
        if (!url) return null
        return {
          storeId,
          name: STORE_NAMES[storeId] ?? entry.store.name,
          url,
        }
      })
      .filter(Boolean) as RawgEnrichment['stores']

  return {
    rawgId: detail.id,
    rawgSlug: detail.slug,
    metacritic: typeof detail.metacritic === 'number' ? detail.metacritic : null,
    // playtime = 0 in RAWG means "no Steam data", hide it per skill guidance.
    playtimeHours:
      typeof detail.playtime === 'number' && detail.playtime > 0 ? detail.playtime : null,
    releasedDate: detail.released || null,
    gameModes: (detail.game_modes ?? []).map((m) => m.name),
    stores,
  }
}

// ============================================
// DISCOVERY (date-range feeds)
// ============================================

// A lightweight game summary returned by RAWG listing endpoints.
export interface RawgGameSummary {
  id: number
  slug: string
  name: string
  released: string | null  // "YYYY-MM-DD"
  tba: boolean
  background_image: string | null
  rating: number           // 1-5 community rating
  ratings_count: number
  added: number            // total users who added this game
  metacritic: number | null
}

// Discover games from RAWG within a date range.
// RAWG page_size caps at 40, so we paginate up to maxPages.
export async function discoverGamesByDate(opts: {
  dateFrom: string          // "YYYY-MM-DD"
  dateTo: string            // "YYYY-MM-DD"
  ordering?: string         // e.g. "-released", "-added", "-rating"
  minAdded?: number         // filter out low-interest games
  limit?: number            // max games to return
  maxPages?: number         // max pages to fetch (default 3)
}): Promise<RawgGameSummary[]> {
  const {
    dateFrom,
    dateTo,
    ordering = '-released',
    minAdded = 0,
    limit = 50,
    maxPages = 3,
  } = opts

  const games: RawgGameSummary[] = []

  for (let page = 1; page <= maxPages; page++) {
    const res = await rawgGet<{ results: RawgGameSummary[]; next: string | null }>('/games', {
      dates: `${dateFrom},${dateTo}`,
      ordering,
      exclude_additions: 'true',
      // Parent platforms: PC, PlayStation, Xbox, Nintendo
      parent_platforms: '1,2,3,7',
      page_size: 40,
      page,
    })

    for (const game of res.results || []) {
      if (game.added >= minAdded) {
        games.push(game)
      }
    }

    // Stop if we have enough or no more pages
    if (games.length >= limit || !res.next) break

    // Small delay between pages to be respectful
    if (page < maxPages) {
      await new Promise(r => setTimeout(r, 250))
    }
  }

  return games.slice(0, limit)
}

// One-shot enrichment: reconcile + fetch detail + fetch store links + normalise.
export async function enrichFromRawg(args: {
  name: string
  igdbSlug?: string | null
  releaseYear?: number | null
}): Promise<RawgEnrichment> {
  const detail = await resolveRawgGame(args)
  if (!detail) {
    return normaliseEnrichment(null, [])
  }
  const storeLinks = await fetchStoreLinks(detail.id)
  return normaliseEnrichment(detail, storeLinks)
}
