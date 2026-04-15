import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchGames, getGamesByIds, Game } from '@/lib/igdb'
import { discoverGamesByDate, RawgGameSummary } from '@/lib/rawg'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Allow up to 5 minutes for this function (matching ~200 games against IGDB)
export const maxDuration = 300

const TAG = '[refresh-dynamic-lists]'

// Format a Date as "YYYY-MM-DD"
function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Match a RAWG game to an IGDB ID by searching IGDB by name.
// Returns the IGDB game ID or null if no confident match.
async function matchToIgdb(rawgGame: RawgGameSummary): Promise<number | null> {
  try {
    const results = await searchGames(rawgGame.name, 5)
    if (results.length === 0) return null

    const normTarget = rawgGame.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const rawgYear = rawgGame.released
      ? new Date(rawgGame.released).getUTCFullYear()
      : null

    // Score candidates
    let best: { id: number; score: number } | null = null
    for (const game of results) {
      let score = 0
      const normName = game.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // Name matching
      if (normName === normTarget) score += 4
      else if (normName.startsWith(normTarget) || normTarget.startsWith(normName)) score += 2

      // Release year matching
      if (rawgYear && game.firstReleaseDate) {
        const igdbYear = new Date(game.firstReleaseDate).getUTCFullYear()
        if (igdbYear === rawgYear) score += 2
        else if (Math.abs(igdbYear - rawgYear) === 1) score += 1
      }

      if (!best || score > best.score) {
        best = { id: game.id, score }
      }
    }

    // Require a minimum confidence score (3 = name prefix + year match)
    return best && best.score >= 3 ? best.id : null
  } catch (err) {
    console.error(TAG, `IGDB search failed for "${rawgGame.name}":`, err)
    return null
  }
}

// Cache IGDB games into games_cache
async function cacheGames(igdbIds: number[]): Promise<number> {
  if (igdbIds.length === 0) return 0

  // Check which are already cached
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

// Update a curated list's game_ids
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

// Discover games from RAWG, match each to IGDB, return matched IGDB IDs.
// Processes matches sequentially to respect IGDB's 4 req/s limit.
interface DiscoverResult {
  matchedIds: number[]
  diagnostics: {
    rawgReturned: number
    igdbMatched: number
    igdbFailed: number
    unmatchedGames: string[]
  }
}

async function discoverAndMatch(opts: {
  dateFrom: string
  dateTo: string
  ordering: string
  minAdded: number
  limit: number
  label: string
}): Promise<DiscoverResult> {
  const { dateFrom, dateTo, ordering, minAdded, limit, label } = opts

  console.log(TAG, `[${label}] Discovering from RAWG: ${dateFrom} to ${dateTo}`)

  const rawgGames = await discoverGamesByDate({
    dateFrom,
    dateTo,
    ordering,
    minAdded,
    limit: Math.round(limit * 2.5), // fetch extra since some won't match IGDB
    maxPages: 8,
  })

  console.log(TAG, `[${label}] RAWG returned ${rawgGames.length} games`)

  const matchedIds: number[] = []
  const unmatchedGames: string[] = []

  for (const game of rawgGames) {
    if (matchedIds.length >= limit) break

    const igdbId = await matchToIgdb(game)
    if (igdbId) {
      matchedIds.push(igdbId)
    } else {
      unmatchedGames.push(`${game.name} (${game.released || 'TBD'}, added: ${game.added})`)
    }

    // Rate limit: IGDB allows 4 req/s
    await new Promise(r => setTimeout(r, 260))
  }

  console.log(TAG, `[${label}] Matched ${matchedIds.length}/${rawgGames.length}, ${unmatchedGames.length} unmatched`)

  return {
    matchedIds,
    diagnostics: {
      rawgReturned: rawgGames.length,
      igdbMatched: matchedIds.length,
      igdbFailed: unmatchedGames.length,
      unmatchedGames,
    },
  }
}

export async function POST() {
  try {
    console.log(TAG, 'Starting daily refresh...')

    const now = new Date()

    // New Releases: last 6 months to today, sorted by most recently released
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Coming Soon: today to end of 2028, sorted by most anticipated (most added)
    const futureEnd = '2028-12-31'

    // Run both discoveries (sequentially to avoid IGDB rate limit issues)
    const nrResult = await discoverAndMatch({
      dateFrom: fmt(sixMonthsAgo),
      dateTo: fmt(now),
      ordering: '-released',
      minAdded: 10,
      limit: 100,
      label: 'New Releases',
    })

    const csResult = await discoverAndMatch({
      dateFrom: fmt(now),
      dateTo: futureEnd,
      ordering: '-added',
      minAdded: 5,
      limit: 100,
      label: 'Coming Soon',
    })

    // Cache any new IGDB games
    const allIds = [...new Set([...nrResult.matchedIds, ...csResult.matchedIds])]
    const cachedCount = await cacheGames(allIds)
    console.log(TAG, `Cached ${cachedCount} new games into games_cache`)

    // Update curated lists
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

// GET for easy browser/cron testing
export async function GET() {
  return POST()
}
