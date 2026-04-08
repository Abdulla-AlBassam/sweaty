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

const TAG = '[BecauseYouLoved]'

// API Version: 4 - Smart tiered recommendations with relative rating threshold
// GET /api/recommendations/because-you-loved?user_id=xxx&platforms=playstation,pc&exclude_pc_only=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const platformsParam = searchParams.get('platforms')

    const platforms = platformsParam
      ? platformsParam.split(',').map(p => p.trim().toLowerCase()).filter(Boolean)
      : undefined

    const excludePcOnly = searchParams.get('exclude_pc_only') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log(TAG, 'API v4 - Tiered recommendations',
      platforms ? `(platforms: ${platforms.join(',')})` : '(all platforms)',
      excludePcOnly ? '(excluding PC-only)' : '')

    // ── Step 1: Get ALL rated games to compute relative threshold ──
    const { data: allRatedGames, error: logsError } = await supabase
      .from('game_logs')
      .select('game_id, rating, updated_at')
      .eq('user_id', userId)
      .not('rating', 'is', null)
      .order('rating', { ascending: false })

    if (logsError) {
      console.error(TAG, 'Error fetching rated games:', logsError)
      return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 })
    }

    if (!allRatedGames || allRatedGames.length === 0) {
      console.log(TAG, 'No rated games found for user:', userId)
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'No rated games found',
        debug: { totalRated: 0 }
      })
    }

    // ── Step 2: Compute relative threshold ────────────────────
    // Use the user's top 20% of ratings, with a floor of 3.5
    // This handles both generous raters (who give everything 5s)
    // and harsh raters (whose top game might be 4.0)
    const ratings = allRatedGames.map(g => Number(g.rating)).sort((a, b) => b - a)
    const top20pctIndex = Math.max(0, Math.ceil(ratings.length * 0.2) - 1)
    const relativeThreshold = Math.max(3.5, ratings[top20pctIndex])

    const lovedGames = allRatedGames.filter(g => Number(g.rating) >= relativeThreshold)

    console.log(TAG, `${allRatedGames.length} rated games, threshold: ${relativeThreshold}★ (top 20%), ${lovedGames.length} candidates`)

    if (lovedGames.length === 0) {
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'No highly rated games found',
        debug: { totalRated: allRatedGames.length, threshold: relativeThreshold }
      })
    }

    // ── Step 3: Score and rank seed candidates ────────────────
    // Weight by rating AND recency so we recommend based on
    // what the user is into NOW, not just all-time favourites.
    const now = Date.now()
    const scoredCandidates = lovedGames.map(g => {
      const rating = Number(g.rating)
      const updatedAt = g.updated_at ? new Date(g.updated_at).getTime() : 0
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24)

      // Recency multiplier: 1.0 for today, decays to 0.5 over ~6 months
      const recencyMultiplier = 0.5 + 0.5 / (1 + daysSinceUpdate / 180)

      return {
        ...g,
        score: rating * recencyMultiplier,
      }
    })

    // Sort by weighted score descending, then add randomness
    // by shuffling within similar-score tiers (±0.3 score range)
    scoredCandidates.sort((a, b) => b.score - a.score)

    // Take top candidates, shuffle those within close score range for variety
    const topScore = scoredCandidates[0].score
    const closeRange = scoredCandidates.filter(g => g.score >= topScore - 0.3)
    const rest = scoredCandidates.filter(g => g.score < topScore - 0.3)

    // Shuffle the close-range group
    for (let i = closeRange.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[closeRange[i], closeRange[j]] = [closeRange[j], closeRange[i]]
    }

    const gamesToTry = [...closeRange, ...rest].slice(0, 10)

    console.log(TAG, `Trying ${gamesToTry.length} seeds (top score: ${topScore.toFixed(2)}, close-range: ${closeRange.length}):`,
      gamesToTry.map(g => `${g.game_id} (${g.rating}★, score: ${g.score.toFixed(2)})`).join(', '))

    // ── Step 4: Get user's full library for exclusion ─────────
    const { data: allLogs } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    const userGameIds = new Set(allLogs?.map(log => log.game_id) || [])
    console.log(TAG, 'User library size:', userGameIds.size, '(will exclude)')

    // ── Step 5: Try each seed until we get enough recs ────────
    for (const selectedLog of gamesToTry) {
      const gameId = selectedLog.game_id

      const gameInfo = await getGameById(gameId)
      if (!gameInfo) {
        console.log(TAG, 'Could not fetch game info for ID:', gameId)
        continue
      }

      const basedOnGame: Game = {
        id: gameInfo.id,
        name: gameInfo.name,
        coverUrl: gameInfo.coverUrl,
      }

      console.log(TAG, `Trying: ${basedOnGame.name} (${gameId}, ${selectedLog.rating}★, score: ${selectedLog.score.toFixed(2)})`)

      // getSmartSimilarGames already sorts by tier then PopScore
      const similarGames = await getSmartSimilarGames(basedOnGame.id, 150, platforms, excludePcOnly)
      console.log(TAG, 'IGDB returned', similarGames.length, 'similar games')

      // Filter out user's library
      const recommendations = similarGames
        .filter(game => !userGameIds.has(game.id))
        .slice(0, 100)
        .map(game => ({
          id: game.id,
          name: game.name,
          coverUrl: game.coverUrl,
        }))

      console.log(TAG, 'After library filter:', recommendations.length, 'recommendations')

      if (recommendations.length >= 3) {
        console.log(TAG, `SUCCESS: ${recommendations.length} recs for ${basedOnGame.name}`)
        console.log(TAG, 'Top 5:', recommendations.slice(0, 5).map(r => r.name).join(', '))
        return NextResponse.json({
          basedOnGame,
          recommendations,
          apiVersion: 4,
          debug: {
            totalRated: allRatedGames.length,
            threshold: relativeThreshold,
            seedScore: selectedLog.score,
            seedRating: selectedLog.rating,
          }
        }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        })
      }

      console.log(TAG, 'Not enough recs for', basedOnGame.name, '- trying next seed')
    }

    console.log(TAG, 'FAILED - no seed returned 3+ recommendations after trying', gamesToTry.length)
    return NextResponse.json({
      basedOnGame: null,
      recommendations: [],
      message: 'Could not find recommendations',
      debug: {
        totalRated: allRatedGames.length,
        threshold: relativeThreshold,
        triedSeeds: gamesToTry.map(g => g.game_id),
      }
    })
  } catch (error) {
    console.error(TAG, 'Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
