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
      console.error('Error fetching user logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 })
    }

    if (!userLogs || userLogs.length === 0) {
      return NextResponse.json({
        studio: null,
        games: [],
        message: 'No games in library'
      })
    }

    const userGameIds = new Set(userLogs.map(log => log.game_id))

    // Get company info for user's games (sample up to 20 for performance)
    const sampleGameIds = userLogs.slice(0, 20).map(log => log.game_id)
    const companyCount = new Map<string, number>()

    // Fetch company info for each game
    const companyPromises = sampleGameIds.map(id => getGameWithCompany(id))
    const companyResults = await Promise.all(companyPromises)

    for (const result of companyResults) {
      if (result?.companies) {
        for (const company of result.companies) {
          // Skip generic publishers
          if (company.toLowerCase().includes('sony') ||
              company.toLowerCase().includes('microsoft') ||
              company.toLowerCase().includes('nintendo') ||
              company.toLowerCase().includes('xbox')) {
            continue
          }
          companyCount.set(company, (companyCount.get(company) || 0) + 1)
        }
      }
    }

    if (companyCount.size === 0) {
      return NextResponse.json({
        studio: null,
        games: [],
        message: 'Could not determine favorite studio'
      })
    }

    // Find the most common studio
    const sortedStudios = Array.from(companyCount.entries())
      .sort((a, b) => b[1] - a[1])

    const topStudio = sortedStudios[0][0]

    // Get games from that studio
    const studioGames = await getGamesByCompany(topStudio, 20)

    // Filter out games already in user's library
    const recommendations = studioGames
      .filter(game => !userGameIds.has(game.id))
      .slice(0, 15)
      .map(game => ({
        id: game.id,
        name: game.name,
        coverUrl: game.coverUrl
      }))

    return NextResponse.json({
      studio: topStudio,
      games: recommendations
    })
  } catch (error) {
    console.error('Error in more-from-studio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
