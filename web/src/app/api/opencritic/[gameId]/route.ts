import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client to bypass RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface OpenCriticSearchResult {
  id: number
  name: string
  dist: number
}

interface OpenCriticGame {
  id: number
  name: string
  topCriticScore: number
  tier: string
  numReviews: number
}

// Search OpenCritic for a game by name
async function searchOpenCritic(gameName: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://opencritic-api.p.rapidapi.com/game/search?criteria=${encodeURIComponent(gameName)}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'opencritic-api.p.rapidapi.com',
        },
      }
    )

    if (!response.ok) {
      console.error('OpenCritic search failed:', response.status)
      return null
    }

    const results: OpenCriticSearchResult[] = await response.json()

    if (results.length === 0) return null

    // Find best match (lowest distance score)
    const bestMatch = results.reduce((best, current) =>
      current.dist < best.dist ? current : best
    )

    // Only accept if it's a close match (dist < 0.3)
    if (bestMatch.dist < 0.3) {
      return bestMatch.id
    }

    return null
  } catch (error) {
    console.error('OpenCritic search error:', error)
    return null
  }
}

// Get game details from OpenCritic
async function getOpenCriticGame(opencriticId: number): Promise<OpenCriticGame | null> {
  try {
    const response = await fetch(
      `https://opencritic-api.p.rapidapi.com/game/${opencriticId}`,
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'opencritic-api.p.rapidapi.com',
        },
      }
    )

    if (!response.ok) {
      console.error('OpenCritic game fetch failed:', response.status)
      return null
    }

    return response.json()
  } catch (error) {
    console.error('OpenCritic game error:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const igdbGameId = parseInt(gameId)
  const gameName = request.nextUrl.searchParams.get('name')

  if (!gameName) {
    return NextResponse.json({ error: 'Game name required' }, { status: 400 })
  }

  try {
    // Check cache first (valid for 7 days)
    const { data: cached } = await supabaseAdmin
      .from('opencritic_cache')
      .select('*')
      .eq('igdb_game_id', igdbGameId)
      .single()

    if (cached) {
      const cachedAt = new Date(cached.cached_at)
      const now = new Date()
      const daysSinceCached = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceCached < 7) {
        // Return cached data
        return NextResponse.json({
          score: cached.score,
          tier: cached.tier,
          numReviews: cached.num_reviews,
          cached: true,
        })
      }
    }

    // Search for the game on OpenCritic
    const opencriticId = await searchOpenCritic(gameName)

    if (!opencriticId) {
      // Cache the "not found" result to avoid repeated searches
      await supabaseAdmin
        .from('opencritic_cache')
        .upsert({
          igdb_game_id: igdbGameId,
          opencritic_id: null,
          score: null,
          tier: null,
          num_reviews: null,
          cached_at: new Date().toISOString(),
        })

      return NextResponse.json({ score: null, tier: null, numReviews: null })
    }

    // Get game details
    const gameData = await getOpenCriticGame(opencriticId)

    if (!gameData) {
      return NextResponse.json({ score: null, tier: null, numReviews: null })
    }

    // OpenCritic returns -1 for unreviewed/unreleased games
    const hasScore = gameData.topCriticScore >= 0
    const score = hasScore ? Math.round(gameData.topCriticScore) : null
    const tier = hasScore ? gameData.tier : null

    // Cache the result
    await supabaseAdmin
      .from('opencritic_cache')
      .upsert({
        igdb_game_id: igdbGameId,
        opencritic_id: opencriticId,
        score,
        tier,
        num_reviews: gameData.numReviews,
        cached_at: new Date().toISOString(),
      })

    return NextResponse.json({
      score,
      tier,
      numReviews: gameData.numReviews,
      cached: false,
    })
  } catch (error) {
    console.error('OpenCritic API error:', error)
    return NextResponse.json({ error: 'Failed to fetch OpenCritic data' }, { status: 500 })
  }
}
