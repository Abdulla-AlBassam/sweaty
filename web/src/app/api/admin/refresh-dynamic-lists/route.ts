import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchGames, getGamesByIds, Game } from '@/lib/igdb'
import { discoverGamesByDate, RawgGameSummary } from '@/lib/rawg'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const maxDuration = 60

const TAG = '[refresh-dynamic-lists]'

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Clean a RAWG game name for comparison:
// - Strip "(YYYY)" year suffixes
// - Normalise unicode (Cyrillic → Latin)
function cleanName(name: string): string {
  return name
    .replace(/\s*\(\d{4}\)\s*$/g, '')
    .replace(/\u041E/g, 'O')
    .replace(/\u0430/g, 'a')
    .trim()
}

// Normalise for fuzzy comparison: lowercase, digits for numerals, strip punctuation
function norm(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\biv\b/g, '4')
    .replace(/\bzero\b/g, '0')
    .replace(/[^a-z0-9]/g, '')
}

// Build a name→ID lookup from games_cache for fast local matching
async function buildCacheLookup(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from('games_cache')
    .select('id, name')

  if (error || !data) {
    console.error(TAG, 'Failed to load games_cache:', error)
    return new Map()
  }

  const lookup = new Map<string, number>()
  for (const game of data) {
    lookup.set(norm(game.name), game.id)
  }
  console.log(TAG, `Cache lookup built: ${lookup.size} games`)
  return lookup
}

// Try to match a RAWG game name against the local cache first,
// then fall back to IGDB search.
function matchFromCache(rawgName: string, lookup: Map<string, number>): number | null {
  const n = norm(rawgName)
  const direct = lookup.get(n)
  if (direct) return direct

  // Try without trailing numbers (e.g. "Resident Evil 9 Requiem" → "Resident Evil Requiem")
  // Some RAWG names include a sequel number that IGDB omits
  const withoutTrailingNum = n.replace(/(\d+)([a-z])/, '$2')
  if (withoutTrailingNum !== n) {
    const match = lookup.get(withoutTrailingNum)
    if (match) return match
  }

  return null
}

async function matchToIgdb(rawgGame: RawgGameSummary): Promise<number | null> {
  try {
    const cleaned = cleanName(rawgGame.name)
    const results = await searchGames(cleaned, 5)
    if (results.length === 0) return null

    const normTarget = norm(rawgGame.name)
    const rawgYear = rawgGame.released
      ? new Date(rawgGame.released).getUTCFullYear()
      : null

    let best: { id: number; score: number } | null = null
    for (const game of results) {
      let score = 0
      const normName = norm(game.name)

      if (normName === normTarget) score += 4
      else if (normName.startsWith(normTarget) || normTarget.startsWith(normName)) score += 2

      if (rawgYear && game.firstReleaseDate) {
        const igdbYear = new Date(game.firstReleaseDate).getUTCFullYear()
        if (igdbYear === rawgYear) score += 2
        else if (Math.abs(igdbYear - rawgYear) === 1) score += 1
      }

      if (!best || score > best.score) {
        best = { id: game.id, score }
      }
    }

    return best && best.score >= 3 ? best.id : null
  } catch {
    return null
  }
}

// Cache IGDB games into games_cache
async function cacheGames(igdbIds: number[]): Promise<number> {
  if (igdbIds.length === 0) return 0

  const { data: existing } = await supabaseAdmin
    .from('games_cache')
    .select('id')
    .in('id', igdbIds)

  const existingIds = new Set((existing || []).map((g: { id: number }) => g.id))
  const missingIds = igdbIds.filter(id => !existingIds.has(id))

  if (missingIds.length === 0) return 0

  const BATCH_SIZE = 100
  const allFetched: Game[] = []

  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE)
    try {
      const fetched = await getGamesByIds(batch)
      allFetched.push(...fetched)
      if (i + BATCH_SIZE < missingIds.length) {
        await new Promise(resolve => setTimeout(resolve, 250))
      }
    } catch (err) {
      console.error(TAG, 'Error fetching IGDB batch:', err)
    }
  }

  if (allFetched.length === 0) return 0

  const rows = allFetched.map(game => ({
    id: game.id,
    name: game.name,
    slug: game.slug,
    summary: game.summary,
    cover_url: game.coverUrl,
    first_release_date: game.firstReleaseDate,
    genres: game.genres,
    platforms: game.platforms,
    rating: game.rating,
    screenshot_urls: game.screenshotUrls || [],
    cached_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('games_cache')
    .upsert(rows, { onConflict: 'id' })

  if (error) {
    console.error(TAG, 'Cache upsert error:', error)
    return 0
  }

  return rows.length
}

async function updateList(slug: string, gameIds: number[]): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('curated_lists')
    .update({
      game_ids: gameIds,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)

  if (error) {
    console.error(TAG, `Failed to update ${slug}:`, error)
    return false
  }
  return true
}

interface MatchResult {
  matchedIds: number[]
  diagnostics: {
    rawgReturned: number
    cacheMatched: number
    igdbMatched: number
    igdbFailed: number
    unmatchedGames: string[]
  }
}

async function discoverAndMatch(opts: {
  dateFrom: string
  dateTo: string
  ordering: string
  limit: number
  label: string
  cacheLookup: Map<string, number>
}): Promise<MatchResult> {
  const { dateFrom, dateTo, ordering, limit, label, cacheLookup } = opts

  console.log(TAG, `[${label}] RAWG: ${dateFrom} to ${dateTo}`)

  const rawgGames = await discoverGamesByDate({
    dateFrom,
    dateTo,
    ordering,
    minAdded: 0,
    limit: Math.round(limit * 2),
    maxPages: 6,
  })

  console.log(TAG, `[${label}] RAWG returned ${rawgGames.length} games`)

  const matchedIds: number[] = []
  const unmatchedGames: string[] = []
  const needIgdbSearch: RawgGameSummary[] = []
  let cacheHits = 0

  // Phase 1: Match against local cache (instant, no API calls)
  for (const game of rawgGames) {
    if (matchedIds.length >= limit) break

    const cachedId = matchFromCache(game.name, cacheLookup)
    if (cachedId) {
      matchedIds.push(cachedId)
      cacheHits++
    } else {
      needIgdbSearch.push(game)
    }
  }

  console.log(TAG, `[${label}] Cache matched ${cacheHits}, need IGDB search for ${needIgdbSearch.length}`)

  // Phase 2: Search IGDB for remaining (cap at 30 to stay within timeout)
  const igdbCap = Math.min(needIgdbSearch.length, 30)
  let igdbHits = 0

  for (let i = 0; i < igdbCap && matchedIds.length < limit; i++) {
    const game = needIgdbSearch[i]
    const igdbId = await matchToIgdb(game)
    if (igdbId) {
      matchedIds.push(igdbId)
      igdbHits++
    } else {
      unmatchedGames.push(`${game.name} (${game.released || 'TBD'}, added: ${game.added})`)
    }
    // IGDB rate limit: 4 req/s
    await new Promise(r => setTimeout(r, 260))
  }

  // Log any skipped games (beyond igdbCap)
  for (let i = igdbCap; i < needIgdbSearch.length && matchedIds.length < limit; i++) {
    unmatchedGames.push(`${needIgdbSearch[i].name} (skipped, not in cache)`)
  }

  console.log(TAG, `[${label}] Total: ${matchedIds.length} (${cacheHits} cache + ${igdbHits} IGDB), ${unmatchedGames.length} unmatched`)

  return {
    matchedIds,
    diagnostics: {
      rawgReturned: rawgGames.length,
      cacheMatched: cacheHits,
      igdbMatched: igdbHits,
      igdbFailed: unmatchedGames.length,
      unmatchedGames,
    },
  }
}

export async function POST() {
  try {
    console.log(TAG, 'Starting daily refresh...')

    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const futureEnd = '2028-12-31'

    // Build cache lookup once (single DB query)
    const cacheLookup = await buildCacheLookup()

    const nrResult = await discoverAndMatch({
      dateFrom: fmt(sixMonthsAgo),
      dateTo: fmt(now),
      ordering: '-added',
      limit: 100,
      label: 'New Releases',
      cacheLookup,
    })

    const csResult = await discoverAndMatch({
      dateFrom: fmt(now),
      dateTo: futureEnd,
      ordering: '-added',
      limit: 100,
      label: 'Coming Soon',
      cacheLookup,
    })

    // Cache any new IGDB games
    const allIds = [...new Set([...nrResult.matchedIds, ...csResult.matchedIds])]
    const cachedCount = await cacheGames(allIds)

    const [nrOk, csOk] = await Promise.all([
      updateList('new-releases', nrResult.matchedIds),
      updateList('coming-soon', csResult.matchedIds),
    ])

    const result = {
      success: nrOk && csOk,
      timestamp: new Date().toISOString(),
      newReleases: {
        slug: 'new-releases',
        gameCount: nrResult.matchedIds.length,
        updated: nrOk,
        ...nrResult.diagnostics,
      },
      comingSoon: {
        slug: 'coming-soon',
        gameCount: csResult.matchedIds.length,
        updated: csOk,
        ...csResult.diagnostics,
      },
      newGamesCached: cachedCount,
    }

    console.log(TAG, 'Done:', JSON.stringify(result))
    return NextResponse.json(result)
  } catch (error) {
    console.error(TAG, 'Error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh dynamic lists' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
