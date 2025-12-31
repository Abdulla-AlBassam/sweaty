import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSmartSimilarGames } from '@/lib/igdb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Game {
  id: number
  name: string
  coverUrl: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's highly rated games (4+ stars)
    const { data: lovedGames, error: logsError } = await supabase
      .from('game_logs')
      .select('game_id, rating, games_cache(id, name, cover_url)')
      .eq('user_id', userId)
      .gte('rating', 4)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })

    if (logsError) {
      console.error('Error fetching loved games:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 })
    }

    if (!lovedGames || lovedGames.length === 0) {
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'No highly rated games found'
      })
    }

    // Get all game IDs in user's library (to exclude from recommendations)
    const { data: allLogs } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    const userGameIds = new Set(allLogs?.map(log => log.game_id) || [])

    // Filter to only games that have cache data
    const gamesWithCache = lovedGames.filter(log => {
      const cache = log.games_cache as unknown as { id: number } | null
      return cache !== null
    })

    if (gamesWithCache.length === 0) {
      console.log('[BecauseYouLoved] No cached games found for user')
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'No cached game data found'
      })
    }

    // Pick a random highly rated game from those with cache
    const randomIndex = Math.floor(Math.random() * Math.min(gamesWithCache.length, 5))
    const selectedLog = gamesWithCache[randomIndex]
    const gameCache = selectedLog.games_cache as unknown as { id: number; name: string; cover_url: string | null }

    const basedOnGame: Game = {
      id: gameCache.id,
      name: gameCache.name,
      coverUrl: gameCache.cover_url
    }

    console.log('[BecauseYouLoved] Selected game:', basedOnGame.name, '(from', gamesWithCache.length, 'cached games)')

    // Get smart similar games from IGDB (uses themes, keywords, franchises)
    console.log('[BecauseYouLoved] Finding smart recommendations for:', basedOnGame.name)
    const similarGames = await getSmartSimilarGames(basedOnGame.id, 25)

    // Filter out games already in user's library
    const recommendations = similarGames
      .filter(game => !userGameIds.has(game.id))
      .slice(0, 10)
      .map(game => ({
        id: game.id,
        name: game.name,
        coverUrl: game.coverUrl
      }))

    return NextResponse.json({
      basedOnGame,
      recommendations
    })
  } catch (error) {
    console.error('Error in because-you-loved:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
