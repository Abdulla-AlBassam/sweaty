import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPopularityForGames } from '@/lib/igdb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GameLogCount {
  game_id: number
  count: number
}

// GET /api/community/popular?limit=15
// Returns the most logged games by Sweaty users, sorted by IGDB PopScore
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '15')

  try {
    // Step 1: Get the most logged games from game_logs (grouped by game_id with count)
    const { data: logCounts, error: logsError } = await supabase
      .rpc('get_most_logged_games', { limit_count: 50 })

    if (logsError) {
      console.error('[CommunityPopular] RPC error, falling back to direct query:', logsError)

      // Fallback: Get games from game_logs with their log counts
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('game_logs')
        .select('game_id')

      if (fallbackError) {
        throw fallbackError
      }

      // Count occurrences of each game_id
      const countMap = new Map<number, number>()
      for (const log of fallbackData || []) {
        countMap.set(log.game_id, (countMap.get(log.game_id) || 0) + 1)
      }

      // Sort by count and get top games
      const sortedGameIds = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([gameId]) => gameId)

      if (sortedGameIds.length === 0) {
        return NextResponse.json({ games: [] })
      }

      // Step 2: Fetch game details from games_cache
      const { data: games, error: gamesError } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .in('id', sortedGameIds)

      if (gamesError) {
        throw gamesError
      }

      // Step 3: Fetch PopScore for these games
      const gameIds = games?.map(g => g.id) || []
      const popularityMap = await getPopularityForGames(gameIds)

      // Step 4: Sort by PopScore (most popular first)
      const sortedGames = [...(games || [])].sort((a, b) => {
        const aPopularity = popularityMap.get(a.id) || 0
        const bPopularity = popularityMap.get(b.id) || 0
        return bPopularity - aPopularity
      })

      // Format and return
      const result = sortedGames.slice(0, limit).map(game => ({
        id: game.id,
        name: game.name,
        coverUrl: game.cover_url,
      }))

      return NextResponse.json({ games: result })
    }

    // Use RPC result if available
    const gameIds = (logCounts as GameLogCount[])?.map(lc => lc.game_id) || []

    if (gameIds.length === 0) {
      return NextResponse.json({ games: [] })
    }

    // Step 2: Fetch game details from games_cache
    const { data: games, error: gamesError } = await supabase
      .from('games_cache')
      .select('id, name, cover_url')
      .in('id', gameIds)

    if (gamesError) {
      throw gamesError
    }

    // Step 3: Fetch PopScore for these games
    const cachedGameIds = games?.map(g => g.id) || []
    const popularityMap = await getPopularityForGames(cachedGameIds)

    // Step 4: Sort by PopScore (most popular first)
    const sortedGames = [...(games || [])].sort((a, b) => {
      const aPopularity = popularityMap.get(a.id) || 0
      const bPopularity = popularityMap.get(b.id) || 0
      return bPopularity - aPopularity
    })

    // Format and return
    const result = sortedGames.slice(0, limit).map(game => ({
      id: game.id,
      name: game.name,
      coverUrl: game.cover_url,
    }))

    console.log('[CommunityPopular] Returning', result.length, 'games sorted by PopScore')
    console.log('[CommunityPopular] Top 5:', result.slice(0, 5).map(g => g.name))

    return NextResponse.json({ games: result })
  } catch (error) {
    console.error('[CommunityPopular] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch popular games' }, { status: 500 })
  }
}
