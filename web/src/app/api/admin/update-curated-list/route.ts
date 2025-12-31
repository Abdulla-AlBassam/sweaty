import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGamesByIds, Game } from '@/lib/igdb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, gameIds } = body

    if (!slug || !Array.isArray(gameIds)) {
      return NextResponse.json(
        { error: 'slug and gameIds array are required' },
        { status: 400 }
      )
    }

    // Validate all game IDs are numbers
    if (!gameIds.every(id => typeof id === 'number')) {
      return NextResponse.json(
        { error: 'All gameIds must be numbers' },
        { status: 400 }
      )
    }

    // Update the curated list
    const { data, error } = await supabase
      .from('curated_lists')
      .update({ game_ids: gameIds, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select('slug, title, game_ids')
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
    }

    // Auto-cache any new games that aren't in games_cache
    let cachedCount = 0
    let alreadyCached = 0

    if (gameIds.length > 0) {
      // Check which games are already cached
      const { data: existingGames } = await supabase
        .from('games_cache')
        .select('id')
        .in('id', gameIds)

      const existingIds = new Set((existingGames || []).map((g: { id: number }) => g.id))
      const missingIds = gameIds.filter(id => !existingIds.has(id))
      alreadyCached = existingIds.size

      console.log(`[update-curated-list] ${slug}: ${missingIds.length} new games to cache, ${alreadyCached} already cached`)

      if (missingIds.length > 0) {
        // Fetch missing games from IGDB in batches
        const BATCH_SIZE = 100
        const allFetchedGames: Game[] = []

        for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
          const batch = missingIds.slice(i, i + BATCH_SIZE)
          try {
            const games = await getGamesByIds(batch)
            allFetchedGames.push(...games)

            // Small delay between batches
            if (i + BATCH_SIZE < missingIds.length) {
              await new Promise(resolve => setTimeout(resolve, 250))
            }
          } catch (err) {
            console.error(`[update-curated-list] Error fetching batch:`, err)
          }
        }

        // Insert games into games_cache
        if (allFetchedGames.length > 0) {
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

          const { error: insertError } = await supabase
            .from('games_cache')
            .upsert(gamesToInsert, { onConflict: 'id' })

          if (insertError) {
            console.error('[update-curated-list] Error caching games:', insertError)
          } else {
            cachedCount = gamesToInsert.length
            console.log(`[update-curated-list] Cached ${cachedCount} new games`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      list: {
        slug: data.slug,
        title: data.title,
        gameCount: data.game_ids?.length || 0
      },
      cache: {
        newGamesCached: cachedCount,
        alreadyCached: alreadyCached
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
