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

// API Version: 2 - Uses franchises for series recommendations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log('[BecauseYouLoved] API v2 - Franchise-based recommendations')

    // Get user's highly rated games (4+ stars) - just get game_id and rating
    const { data: lovedGames, error: logsError } = await supabase
      .from('game_logs')
      .select('game_id, rating')
      .eq('user_id', userId)
      .gte('rating', 4)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })

    if (logsError) {
      console.error('[BecauseYouLoved] Error fetching loved games:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 })
    }

    if (!lovedGames || lovedGames.length === 0) {
      console.log('[BecauseYouLoved] No games rated 4+ stars found for user:', userId)
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'No highly rated games found',
        debug: { gamesRated4Plus: 0 }
      })
    }

    // Log ALL game IDs found so we can debug
    console.log('[BecauseYouLoved] Found', lovedGames.length, 'games rated 4+ stars')
    console.log('[BecauseYouLoved] Game IDs:', lovedGames.map(g => `${g.game_id} (${g.rating}★)`).join(', '))

    // Get all game IDs in user's library (to exclude from recommendations)
    const { data: allLogs } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    const userGameIds = new Set(allLogs?.map(log => log.game_id) || [])
    console.log('[BecauseYouLoved] User has', userGameIds.size, 'total games in library (will exclude from recs)')

    // Shuffle all loved games randomly for variety on each refresh
    const shuffled = [...lovedGames].sort(() => Math.random() - 0.5)
    const gamesToTry = shuffled.slice(0, Math.min(shuffled.length, 15))

    console.log('[BecauseYouLoved] Will try', gamesToTry.length, 'games in this order:', gamesToTry.map(g => g.game_id).join(', '))

    for (const selectedLog of gamesToTry) {
      const gameId = selectedLog.game_id

      // Fetch game info from IGDB directly
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

      console.log('[BecauseYouLoved] Trying:', basedOnGame.name, '(ID:', gameId, ', rating:', selectedLog.rating, '★)')

      // Get smart similar games from IGDB - request 50 to get good variety
      const similarGames = await getSmartSimilarGames(basedOnGame.id, 50)
      console.log('[BecauseYouLoved] IGDB returned', similarGames.length, 'similar games for', basedOnGame.name)

      // Don't filter out user's library - they might want to see games they have
      // Just return all recommendations
      const recommendations = similarGames
        .slice(0, 30)
        .map(game => ({
          id: game.id,
          name: game.name,
          coverUrl: game.coverUrl
        }))

      console.log('[BecauseYouLoved] Returning', recommendations.length, 'recommendations')

      // If we found at least 3 recommendations, return them
      if (recommendations.length >= 3) {
        console.log('[BecauseYouLoved] SUCCESS! Returning', recommendations.length, 'recs for', basedOnGame.name)
        return NextResponse.json({
          basedOnGame,
          recommendations,
          apiVersion: 2,
          debug: {
            gamesRated4Plus: lovedGames.length,
            gamesTried: gamesToTry.map(g => g.game_id).indexOf(selectedLog) + 1
          }
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        })
      }

      console.log('[BecauseYouLoved] Not enough recs for', basedOnGame.name, '- trying next game')
    }

    // If no game returned enough recommendations, return empty
    console.log('[BecauseYouLoved] FAILED - no games returned sufficient recommendations after trying all', gamesToTry.length)
    return NextResponse.json({
      basedOnGame: null,
      recommendations: [],
      message: 'Could not find recommendations',
      debug: {
        gamesRated4Plus: lovedGames.length,
        allTriedGameIds: gamesToTry.map(g => g.game_id)
      }
    })
  } catch (error) {
    console.error('[BecauseYouLoved] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
