import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchGames, getRecentGames, Game } from '@/lib/igdb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Rate limits by user type
const RATE_LIMITS = {
  free: 5,
  premium: 20,
  developer: Infinity, // username 'abdulla'
}

// Cache TTL in hours
const CACHE_TTL_HOURS = 24

interface CachedRecommendation {
  id: number
  name: string
  coverUrl: string | null
  reason?: string
}

// ============================================
// RATE LIMITING
// ============================================

async function checkAndIncrementRateLimit(userId: string, username: string, subscriptionTier: string | null): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  // Developer gets unlimited
  if (username === 'abdulla') {
    return { allowed: true, remaining: Infinity, limit: Infinity }
  }

  // Determine limit based on subscription
  const isPremium = subscriptionTier && ['trial', 'monthly', 'yearly', 'lifetime'].includes(subscriptionTier)
  const limit = isPremium ? RATE_LIMITS.premium : RATE_LIMITS.free

  // Get current usage
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_requests_today, ai_requests_reset_at')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { allowed: false, remaining: 0, limit }
  }

  const now = new Date()
  const resetAt = profile.ai_requests_reset_at ? new Date(profile.ai_requests_reset_at) : now

  // Check if we need to reset (new day)
  let currentRequests = profile.ai_requests_today || 0
  if (now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
    // Reset counter
    currentRequests = 0
  }

  // Check if under limit
  if (currentRequests >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  // Increment counter
  await supabase
    .from('profiles')
    .update({
      ai_requests_today: currentRequests + 1,
      ai_requests_reset_at: currentRequests === 0 ? now.toISOString() : profile.ai_requests_reset_at,
    })
    .eq('id', userId)

  return { allowed: true, remaining: limit - currentRequests - 1, limit }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

async function getCachedRecommendations(userId: string, listType: string): Promise<{
  cached: boolean
  data?: {
    seedGameId: number | null
    seedGameName: string | null
    games: CachedRecommendation[]
    explanation: string | null
  }
}> {
  const { data: cache } = await supabase
    .from('ai_recommendations_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('list_type', listType)
    .single()

  if (!cache) {
    return { cached: false }
  }

  // Check if cache is still fresh
  const generatedAt = new Date(cache.generated_at)
  const now = new Date()
  const hoursSinceGeneration = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceGeneration > CACHE_TTL_HOURS) {
    return { cached: false }
  }

  return {
    cached: true,
    data: {
      seedGameId: cache.seed_game_id,
      seedGameName: cache.seed_game_name,
      games: cache.games as CachedRecommendation[],
      explanation: cache.ai_explanation,
    },
  }
}

async function cacheRecommendations(
  userId: string,
  listType: string,
  seedGameId: number | null,
  seedGameName: string | null,
  games: CachedRecommendation[],
  explanation: string | null
): Promise<void> {
  await supabase
    .from('ai_recommendations_cache')
    .upsert({
      user_id: userId,
      list_type: listType,
      seed_game_id: seedGameId,
      seed_game_name: seedGameName,
      games: games,
      ai_explanation: explanation,
      generated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,list_type',
    })
}

// ============================================
// USER CONTEXT
// ============================================

interface UserContext {
  topRatedGames: { id: number; name: string; rating: number; genres: string[] }[]
  recentlyPlayed: { id: number; name: string; status: string }[]
  backlog: { id: number; name: string }[]
  favoriteGenres: string[]
  totalGamesLogged: number
  averageRating: number
}

async function getUserContext(userId: string): Promise<UserContext> {
  // Get user's game logs with game details
  const { data: logs } = await supabase
    .from('game_logs')
    .select(`
      game_id,
      status,
      rating,
      updated_at,
      game:games_cache(id, name, genres)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (!logs || logs.length === 0) {
    return {
      topRatedGames: [],
      recentlyPlayed: [],
      backlog: [],
      favoriteGenres: [],
      totalGamesLogged: 0,
      averageRating: 0,
    }
  }

  // Process logs
  const processedLogs = logs.map((log: any) => ({
    ...log,
    game: Array.isArray(log.game) ? log.game[0] : log.game,
  })).filter((log: any) => log.game)

  // Top rated games (4+ stars)
  const topRatedGames = processedLogs
    .filter((log: any) => log.rating && log.rating >= 4)
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10)
    .map((log: any) => ({
      id: log.game.id,
      name: log.game.name,
      rating: log.rating,
      genres: log.game.genres || [],
    }))

  // Recently played (playing/played/completed in last update order)
  const recentlyPlayed = processedLogs
    .filter((log: any) => ['playing', 'played', 'completed'].includes(log.status))
    .slice(0, 5)
    .map((log: any) => ({
      id: log.game.id,
      name: log.game.name,
      status: log.status,
    }))

  // Backlog
  const backlog = processedLogs
    .filter((log: any) => ['want_to_play', 'on_hold'].includes(log.status))
    .slice(0, 20)
    .map((log: any) => ({
      id: log.game.id,
      name: log.game.name,
    }))

  // Count genres from top rated games
  const genreCounts: Record<string, number> = {}
  topRatedGames.forEach((game) => {
    game.genres.forEach((genre: string) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })
  })
  const favoriteGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  // Calculate average rating
  const ratings = processedLogs
    .filter((log: any) => log.rating)
    .map((log: any) => log.rating as number)
  const averageRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0

  return {
    topRatedGames,
    recentlyPlayed,
    backlog,
    favoriteGenres,
    totalGamesLogged: processedLogs.length,
    averageRating: Math.round(averageRating * 10) / 10,
  }
}

// ============================================
// AI RECOMMENDATION GENERATION
// ============================================

const SYSTEM_PROMPT = `You are a video game recommendation expert. Your job is to recommend games that are GENUINELY SIMILAR to a specific game.

CRITICAL RULES:
1. Always respond with EXACTLY this JSON format:
{
  "seedGame": "Name of the game these recommendations are based on",
  "explanation": "Brief explanation of why you chose these (1-2 sentences)",
  "games": ["Game Name 1", "Game Name 2", ...]
}

2. Recommend exactly 12 games
3. Use EXACT official game names (e.g., "The Legend of Zelda: Breath of the Wild" not "BOTW")
4. DO NOT recommend games the user has already played
5. ONLY recommend FULL STANDALONE GAMES - never recommend:
   - DLCs or expansion packs (e.g., "Ant-Man Pack", "Blood and Wine")
   - Season passes
   - Add-on content
   - Demos or betas
6. ONLY recommend games that share SIMILAR GAMEPLAY, GENRE, or THEME with the seed game
   - If seed is an action-adventure game, recommend action-adventure games
   - If seed is a story-driven RPG, recommend story-driven RPGs
   - DO NOT recommend sports games for action games, or racing games for RPGs, etc.
7. Prioritize games from the last 5 years
8. Include a mix of popular titles and hidden gems from the SAME genre

Your entire response must be valid JSON with no markdown.`

async function generateAIRecommendations(
  context: UserContext,
  listType: string
): Promise<{
  seedGameName: string | null
  seedGameId: number | null
  explanation: string
  gameNames: string[]
}> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Build the user prompt based on context
  let userPrompt = ''
  let selectedSeedGame = context.topRatedGames[0]

  if (listType === 'because_you_loved') {
    if (context.topRatedGames.length === 0) {
      throw new Error('No rated games to base recommendations on')
    }

    // RANDOMIZE: Pick a random game from their top rated games (not always the #1)
    const randomIndex = Math.floor(Math.random() * Math.min(context.topRatedGames.length, 5))
    selectedSeedGame = context.topRatedGames[randomIndex]

    // Get genres for the seed game to help AI stay on track
    const seedGenres = selectedSeedGame.genres.length > 0
      ? selectedSeedGame.genres.join(', ')
      : 'Unknown'

    userPrompt = `Find games similar to "${selectedSeedGame.name}" (${selectedSeedGame.rating} stars).

SEED GAME GENRES: ${seedGenres}
You MUST recommend games that match these genres or have very similar gameplay.

The user's other highly rated games (for context on their taste):
${context.topRatedGames.filter(g => g.id !== selectedSeedGame.id).slice(0, 5).map(g => `- ${g.name} (${g.rating}★) [${g.genres.slice(0, 2).join(', ')}]`).join('\n')}

Games they have already played (DO NOT recommend these):
${[...context.topRatedGames, ...context.recentlyPlayed].map(g => g.name).join(', ')}

Recommend 12 games that someone who loved "${selectedSeedGame.name}" would also enjoy.
Stay within the same genre/style - do not recommend unrelated games like sports games for action-adventure, etc.`
  } else if (listType === 'from_backlog') {
    if (context.backlog.length === 0) {
      throw new Error('User has no games in backlog')
    }

    userPrompt = `The user has these games in their backlog:
${context.backlog.map(g => `- ${g.name}`).join('\n')}

Their favorite genres are: ${context.favoriteGenres.join(', ')}
Their average rating is ${context.averageRating} stars.

Pick the 12 best games from their backlog and similar games they might want to add. Prioritize based on their genre preferences.`
  } else {
    // Default: general recommendations
    userPrompt = `User's gaming profile:
- Favorite genres: ${context.favoriteGenres.join(', ')}
- Average rating: ${context.averageRating} stars
- Total games logged: ${context.totalGamesLogged}

Top rated games:
${context.topRatedGames.slice(0, 5).map(g => `- ${g.name} (${g.rating}★)`).join('\n')}

Games they have already played (DO NOT recommend these):
${context.topRatedGames.map(g => g.name).join(', ')}

Recommend 12 games they would love based on this profile.`
  }

  // Fetch recent games to help ground the AI in current releases
  let recentGamesContext = ''
  try {
    const recentGames = await getRecentGames(30, 24) // Last 2 years
    if (recentGames.length > 0) {
      recentGamesContext = `\n\nFor reference, here are some highly-rated recent releases you can include if relevant:\n${recentGames.slice(0, 20).map(g => `- ${g.name} (${g.genres.slice(0, 2).join(', ')})`).join('\n')}`
    }
  } catch (err) {
    console.error('[AI Recommendations] Failed to fetch recent games:', err)
  }

  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt + recentGamesContext },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[AI Recommendations] OpenAI error:', error)
    throw new Error('Failed to generate recommendations')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No response from AI')
  }

  // Parse the response
  let parsed: { seedGame?: string; explanation: string; games: string[] }
  try {
    let cleanContent = content.trim()
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7)
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3)
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3)
    parsed = JSON.parse(cleanContent.trim())
  } catch (err) {
    console.error('[AI Recommendations] Failed to parse AI response:', content)
    throw new Error('Failed to parse AI response')
  }

  // Use the selected seed game name (which was randomized for 'because_you_loved')
  return {
    seedGameName: selectedSeedGame?.name || parsed.seedGame || null,
    seedGameId: selectedSeedGame?.id || null,
    explanation: parsed.explanation || 'Based on your gaming history',
    gameNames: parsed.games || [],
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const listType = searchParams.get('list_type') || 'because_you_loved'
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    console.log(`[AI Recommendations] Request for user ${userId}, type: ${listType}, refresh: ${forceRefresh}`)

    // Get user profile for rate limiting
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, subscription_tier')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedRecommendations(userId, listType)
      if (cached.cached && cached.data) {
        console.log(`[AI Recommendations] Returning cached recommendations for user ${userId}`)
        return NextResponse.json({
          basedOnGame: cached.data.seedGameName ? {
            id: cached.data.seedGameId,
            name: cached.data.seedGameName,
          } : null,
          recommendations: cached.data.games,
          explanation: cached.data.explanation,
          cached: true,
        })
      }
    }

    // Check rate limit
    const rateLimit = await checkAndIncrementRateLimit(userId, profile.username, profile.subscription_tier)
    if (!rateLimit.allowed) {
      console.log(`[AI Recommendations] Rate limit exceeded for user ${userId}`)
      return NextResponse.json({
        error: 'Rate limit exceeded',
        limit: rateLimit.limit,
        remaining: 0,
      }, { status: 429 })
    }

    // Get user context
    const context = await getUserContext(userId)

    if (context.topRatedGames.length === 0) {
      return NextResponse.json({
        basedOnGame: null,
        recommendations: [],
        message: 'Rate some games first to get personalized recommendations',
      })
    }

    // Generate AI recommendations
    console.log(`[AI Recommendations] Generating new recommendations for user ${userId}`)
    const aiResult = await generateAIRecommendations(context, listType)

    // Fetch games from IGDB
    const games: CachedRecommendation[] = []
    for (const gameName of aiResult.gameNames.slice(0, 12)) {
      try {
        const results = await searchGames(gameName, 1)
        if (results[0]) {
          games.push({
            id: results[0].id,
            name: results[0].name,
            coverUrl: results[0].coverUrl,
          })
        }
      } catch (err) {
        console.error(`[AI Recommendations] Failed to find game: ${gameName}`)
      }
    }

    // Cache the results (seedGameId comes from the randomly selected game)
    await cacheRecommendations(
      userId,
      listType,
      aiResult.seedGameId,
      aiResult.seedGameName,
      games,
      aiResult.explanation
    )

    console.log(`[AI Recommendations] Generated ${games.length} recommendations for user ${userId}`)

    return NextResponse.json({
      basedOnGame: aiResult.seedGameName ? {
        id: aiResult.seedGameId,
        name: aiResult.seedGameName,
      } : null,
      recommendations: games,
      explanation: aiResult.explanation,
      cached: false,
      rateLimit: {
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
      },
    })
  } catch (error) {
    console.error('[AI Recommendations] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
