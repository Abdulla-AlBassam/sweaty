import { NextRequest, NextResponse } from 'next/server'
import { HowLongToBeatService } from 'howlongtobeat'
import { createClient } from '@supabase/supabase-js'

// Use service role client to bypass RLS for caching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const hltbService = new HowLongToBeatService()

// Cache duration: 30 days
const CACHE_DURATION_DAYS = 30

interface HLTBCacheEntry {
  igdb_game_id: number
  hltb_id: number | null
  main_story: number | null
  main_plus_extras: number | null
  completionist: number | null
  cached_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const gameIdNum = parseInt(gameId, 10)

    if (isNaN(gameIdNum)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 })
    }

    // Get game name from query params
    const searchParams = request.nextUrl.searchParams
    const gameName = searchParams.get('name')

    if (!gameName) {
      return NextResponse.json({ error: 'Game name required' }, { status: 400 })
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('hltb_cache')
      .select('*')
      .eq('igdb_game_id', gameIdNum)
      .single()

    if (cached) {
      // Check if cache is still valid (within 30 days)
      const cachedAt = new Date(cached.cached_at)
      const now = new Date()
      const daysSinceCached = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceCached < CACHE_DURATION_DAYS) {
        return NextResponse.json({
          gameId: gameIdNum,
          hltbId: cached.hltb_id,
          mainStory: cached.main_story,
          mainPlusExtras: cached.main_plus_extras,
          completionist: cached.completionist,
          cached: true,
        })
      }
    }

    // Search HowLongToBeat
    const results = await hltbService.search(cleanGameName(gameName))

    if (!results || results.length === 0) {
      // Cache the "not found" result to avoid repeated searches
      await supabase.from('hltb_cache').upsert({
        igdb_game_id: gameIdNum,
        hltb_id: null,
        main_story: null,
        main_plus_extras: null,
        completionist: null,
        cached_at: new Date().toISOString(),
      })

      return NextResponse.json({
        gameId: gameIdNum,
        hltbId: null,
        mainStory: null,
        mainPlusExtras: null,
        completionist: null,
        cached: false,
      })
    }

    // Find best match - prefer exact name match, then first result
    const cleanedName = cleanGameName(gameName).toLowerCase()
    let bestMatch = results[0]

    for (const result of results) {
      const resultName = result.name.toLowerCase()
      if (resultName === cleanedName) {
        bestMatch = result
        break
      }
      // Partial match - if our game name is contained in HLTB result
      if (resultName.includes(cleanedName) || cleanedName.includes(resultName)) {
        bestMatch = result
      }
    }

    // Extract times (in hours)
    const mainStory = bestMatch.gameplayMain || null
    const mainPlusExtras = bestMatch.gameplayMainExtra || null
    const completionist = bestMatch.gameplayCompletionist || null

    // Cache the result
    await supabase.from('hltb_cache').upsert({
      igdb_game_id: gameIdNum,
      hltb_id: parseInt(bestMatch.id, 10),
      main_story: mainStory,
      main_plus_extras: mainPlusExtras,
      completionist: completionist,
      cached_at: new Date().toISOString(),
    })

    return NextResponse.json({
      gameId: gameIdNum,
      hltbId: parseInt(bestMatch.id, 10),
      mainStory,
      mainPlusExtras,
      completionist,
      cached: false,
    })
  } catch (error) {
    console.error('HLTB API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch HowLongToBeat data' },
      { status: 500 }
    )
  }
}

// Clean game name for better HLTB search matching
function cleanGameName(name: string): string {
  return name
    // Remove edition suffixes
    .replace(/\s*[-:]\s*(Deluxe|Ultimate|Gold|GOTY|Game of the Year|Complete|Definitive|Enhanced|Remastered|Remake|Anniversary|Special|Collector's|Premium|Standard|Digital)\s*(Edition)?/gi, '')
    // Remove year in parentheses
    .replace(/\s*\(\d{4}\)/g, '')
    // Remove platform indicators
    .replace(/\s*\((PC|PS[45]|Xbox|Switch|Steam)\)/gi, '')
    // Remove trademark symbols
    .replace(/[™®©]/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}
