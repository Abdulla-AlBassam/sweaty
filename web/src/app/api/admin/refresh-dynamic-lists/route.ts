import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getNewReleases, getUpcomingGames, getGamesByIds, Game } from '@/lib/igdb'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache new games into games_cache (upsert so existing entries get refreshed)
async function cacheGames(games: Game[]): Promise<number> {
  if (games.length === 0) return 0

  // Check which are already cached
  const gameIds = games.map(g => g.id)
  const { data: existing } = await supabaseAdmin
    .from('games_cache')
    .select('id')
    .in('id', gameIds)

  const existingIds = new Set((existing || []).map((g: { id: number }) => g.id))
  const missingIds = gameIds.filter(id => !existingIds.has(id))

  if (missingIds.length === 0) return 0

  // Fetch full details for missing games (getNewReleases/getUpcomingGames
  // don't include screenshots, so re-fetch with full fields)
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
      console.error(`[refresh-dynamic-lists] Error fetching batch:`, err)
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
    console.error('[refresh-dynamic-lists] Cache upsert error:', error)
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
    console.error(`[refresh-dynamic-lists] Failed to update ${slug}:`, error)
    return false
  }
  return true
}

export async function POST() {
  const TAG = '[refresh-dynamic-lists]'

  try {
    console.log(TAG, 'Starting daily refresh...')

    // Fetch both lists in parallel
    const [newReleases, upcoming] = await Promise.all([
      getNewReleases(50, 4),   // Last 4 months, top 50
      getUpcomingGames(50),    // Now through 2028, top 50 by hype
    ])

    console.log(TAG, `New Releases: ${newReleases.length} games`)
    console.log(TAG, `Coming Soon: ${upcoming.length} games`)

    // Cache any new games into games_cache
    const allGames = [...newReleases, ...upcoming]
    const cachedCount = await cacheGames(allGames)
    console.log(TAG, `Cached ${cachedCount} new games into games_cache`)

    // Update curated list game_ids
    const newReleaseIds = newReleases.map(g => g.id)
    const upcomingIds = upcoming.map(g => g.id)

    const [nrOk, csOk] = await Promise.all([
      updateList('new-releases', newReleaseIds),
      updateList('coming-soon', upcomingIds),
    ])

    const result = {
      success: nrOk && csOk,
      timestamp: new Date().toISOString(),
      newReleases: {
        slug: 'new-releases',
        gameCount: newReleaseIds.length,
        updated: nrOk,
      },
      comingSoon: {
        slug: 'coming-soon',
        gameCount: upcomingIds.length,
        updated: csOk,
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
