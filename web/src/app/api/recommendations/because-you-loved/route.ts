import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSmartSimilarGames, getGameById } from '@/lib/igdb'

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

    // Get user's highly rated games (4+ stars) - just get game_id and rating
    const { data: lovedGames, error: logsError } = await supabase
      .from('game_logs')
      .select('game_id, rating')
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

    console.log('[BecauseYouLoved] Found', lovedGames.length, 'games rated 4+ stars')

    // Get all game IDs in user's library (to exclude from recommendations)
    const { data: allLogs } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    const userGameIds = new Set(allLogs?.map(log => log.game_id) || [])

    // Shuffle all loved games randomly for variety on each refresh
    const shuffled = [...lovedGames].sort(() => Math.random() - 0.5)
    const gamesToTry = shuffled.slice(0, Math.min(shuffled.length, 15)) // Try up to 15 games

    console.log('[BecauseYouLoved] Will try up to', gamesToTry.length, 'games to find recommendations')

    for (const selectedLog of gamesToTry) {
      const gameId = selectedLog.game_id

      // Fetch game info from IGDB directly (not from cache)
      const gameInfo = await getGameById(gameId)

      if (!gameInfo) {
        console.log('[BecauseYouLoved] Could not fetch game info for ID:', gameId)
        continue
      }

      const basedOnGame: Game = {
        id: gameInfo.id,
        name: gameInfo.name,
        coverUrl: gameInfo.coverUrl
      }

      console.log('[BecauseYouLoved] Trying game:', basedOnGame.name, '(rating:', selectedLog.rating, ')')

      // Get smart similar games from IGDB
      const similarGames = await getSmartSimilarGames(basedOnGame.id, 50)

      // Filter out games already in user's library
      const recommendations = similarGames
        .filter(game => !userGameIds.has(game.id))
        .slice(0, 15)
        .map(game => ({
          id: game.id,
          name: game.name,
          coverUrl: game.coverUrl
        }))

      // If we found at least 3 recommendations, return them
      if (recommendations.length >= 3) {
        console.log('[BecauseYouLoved] Found', recommendations.length, 'recommendations for', basedOnGame.name)
        return NextResponse.json({
          basedOnGame,
          recommendations
        })
      }

      console.log('[BecauseYouLoved] Only', recommendations.length, 'recommendations for', basedOnGame.name, '- trying next game')
    }

    // If no game returned enough recommendations, return empty
    console.log('[BecauseYouLoved] No games returned sufficient recommendations after trying all')
    return NextResponse.json({
      basedOnGame: null,
      recommendations: [],
      message: 'Could not find recommendations'
    })
  } catch (error) {
    console.error('Error in because-you-loved:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
