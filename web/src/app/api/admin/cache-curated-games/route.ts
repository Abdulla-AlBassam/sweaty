import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGamesByIds, Game } from '@/lib/igdb'

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/admin/cache-curated-games
// Fetches all games from curated lists and caches them to games_cache
export async function POST() {
  try {
    console.log('Starting curated games cache...')

    // 1. Get all curated lists and collect unique game IDs
    const { data: lists, error: listsError } = await supabaseAdmin
      .from('curated_lists')
      .select('game_ids')
      .eq('is_active', true)

    if (listsError) {
      console.error('Error fetching curated lists:', listsError)
      return NextResponse.json({ error: 'Failed to fetch curated lists' }, { status: 500 })
    }

    // Collect all unique game IDs
    const allGameIds = new Set<number>()
    lists?.forEach((list: { game_ids: number[] }) => {
      list.game_ids?.forEach((id: number) => allGameIds.add(id))
    })

    const gameIds = Array.from(allGameIds)
    console.log(`Found ${gameIds.length} unique game IDs across all curated lists`)

    if (gameIds.length === 0) {
      return NextResponse.json({ message: 'No games to cache', cached: 0 })
    }

    // 2. Check which games are already cached
    const { data: existingGames } = await supabaseAdmin
      .from('games_cache')
      .select('id')
      .in('id', gameIds)

    const existingIds = new Set((existingGames || []).map((g: { id: number }) => g.id))
    const missingIds = gameIds.filter(id => !existingIds.has(id))

    console.log(`Already cached: ${existingIds.size}, Missing: ${missingIds.length}`)

    if (missingIds.length === 0) {
      return NextResponse.json({
        message: 'All games already cached',
        total: gameIds.length,
        cached: 0,
        alreadyCached: existingIds.size
      })
    }

    // 3. Fetch missing games from IGDB in batches (IGDB limit is 500 per request)
    const BATCH_SIZE = 100
    const allFetchedGames: Game[] = []

    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batch = missingIds.slice(i, i + BATCH_SIZE)
      console.log(`Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} games`)

      try {
        const games = await getGamesByIds(batch)
        allFetchedGames.push(...games)

        // Small delay between batches to be nice to IGDB
        if (i + BATCH_SIZE < missingIds.length) {
          await new Promise(resolve => setTimeout(resolve, 250))
        }
      } catch (error) {
        console.error(`Error fetching batch starting at ${i}:`, error)
      }
    }

    console.log(`Fetched ${allFetchedGames.length} games from IGDB`)

    // 4. Insert games into games_cache
    const gamesToInsert = allFetchedGames.map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      summary: game.summary,
      cover_url: game.coverUrl,
      first_release_date: game.firstReleaseDate,
      genres: game.genres,
      platforms: game.platforms,
      rating: game.rating,
      cached_at: new Date().toISOString()
    }))

    if (gamesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('games_cache')
        .upsert(gamesToInsert, { onConflict: 'id' })

      if (insertError) {
        console.error('Error inserting games:', insertError)
        return NextResponse.json({ error: 'Failed to cache games' }, { status: 500 })
      }
    }

    console.log(`Successfully cached ${gamesToInsert.length} games`)

    return NextResponse.json({
      message: 'Games cached successfully',
      total: gameIds.length,
      cached: gamesToInsert.length,
      alreadyCached: existingIds.size,
      notFound: missingIds.length - allFetchedGames.length
    })

  } catch (error) {
    console.error('Cache curated games error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for easy browser testing
export async function GET() {
  return POST()
}
