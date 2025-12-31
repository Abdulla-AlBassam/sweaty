import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGamesByCompany, getGameWithCompany } from '@/lib/igdb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's game library
    const { data: userLogs, error: logsError } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    if (logsError) {
      console.error('[MoreFromStudio] Error fetching user logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 })
    }

    if (!userLogs || userLogs.length === 0) {
      console.log('[MoreFromStudio] No games in user library')
      return NextResponse.json({
        studio: null,
        games: [],
        message: 'No games in library'
      })
    }

    console.log('[MoreFromStudio] User ID:', userId)

    console.log('[MoreFromStudio] User has', userLogs.length, 'games in library')
    const userGameIds = new Set(userLogs.map(log => log.game_id))

    // Get company info for user's games (sample up to 20 for performance)
    const sampleGameIds = userLogs.slice(0, 20).map(log => log.game_id)
    console.log('[MoreFromStudio] Sampling', sampleGameIds.length, 'game IDs:', sampleGameIds.slice(0, 5))

    // Track developers separately (they make better recommendations than publishers)
    const developerCount = new Map<string, number>()

    // Fetch company info for each game - do them sequentially to avoid rate limits
    let successCount = 0
    let failCount = 0

    for (const gameId of sampleGameIds) {
      try {
        const result = await getGameWithCompany(gameId)
        if (result?.developers && result.developers.length > 0) {
          successCount++
          console.log('[MoreFromStudio] Game:', result.game.name, '| Devs:', result.developers.slice(0, 2).join(', '))
          for (const dev of result.developers) {
            developerCount.set(dev, (developerCount.get(dev) || 0) + 1)
          }
        } else if (result) {
          console.log('[MoreFromStudio] Game:', result.game.name, '| No developer info')
        } else {
          failCount++
          console.log('[MoreFromStudio] Game ID', gameId, '| IGDB returned null')
        }
      } catch (err) {
        failCount++
        console.error('[MoreFromStudio] Error fetching game', gameId, ':', err)
      }
    }

    console.log('[MoreFromStudio] Results: success=', successCount, 'fail=', failCount, 'unique devs=', developerCount.size)

    if (developerCount.size === 0) {
      console.log('[MoreFromStudio] No developers found in user library')
      return NextResponse.json({
        studio: null,
        games: [],
        message: 'Could not determine favorite studio'
      })
    }

    // Find the most common developers (sorted by frequency)
    const sortedDevelopers = Array.from(developerCount.entries())
      .sort((a, b) => b[1] - a[1])

    console.log('[MoreFromStudio] Top developers:', sortedDevelopers.slice(0, 10).map(s => `${s[0]} (${s[1]} games)`))

    // Try each developer until we find one with recommendable games
    let selectedStudio: string | null = null
    let recommendations: { id: number; name: string; coverUrl: string | null }[] = []

    for (const [studio] of sortedDevelopers.slice(0, 10)) {
      console.log('[MoreFromStudio] Trying studio:', studio)
      const studioGames = await getGamesByCompany(studio, 50)
      console.log('[MoreFromStudio] Got', studioGames.length, 'total games from', studio)

      // Filter out games already in user's library
      const filtered = studioGames
        .filter(game => !userGameIds.has(game.id))
        .slice(0, 20)
        .map(game => ({
          id: game.id,
          name: game.name,
          coverUrl: game.coverUrl
        }))

      console.log('[MoreFromStudio] After filtering user\'s games:', filtered.length, 'remaining')

      if (filtered.length > 0) {
        selectedStudio = studio
        recommendations = filtered
        console.log('[MoreFromStudio] SUCCESS! Found', filtered.length, 'recommendations from', studio)
        break
      } else {
        console.log('[MoreFromStudio] Studio', studio, 'has no new games to recommend, trying next...')
      }
    }

    if (!selectedStudio) {
      console.log('[MoreFromStudio] Could not find any studio with new games to recommend')
    }

    return NextResponse.json({
      studio: selectedStudio,
      games: recommendations
    })
  } catch (error) {
    console.error('[MoreFromStudio] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
