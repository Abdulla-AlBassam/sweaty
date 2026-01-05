import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role client to bypass RLS for caching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cache duration: 30 days
const CACHE_DURATION_DAYS = 30

// HLTB API endpoint
const HLTB_API_URL = 'https://howlongtobeat.com/api/search'

interface HLTBSearchResult {
  game_id: number
  game_name: string
  game_name_date: number
  game_alias: string
  game_type: string
  game_image: string
  comp_lvl_combine: number
  comp_lvl_sp: number
  comp_lvl_co: number
  comp_lvl_mp: number
  comp_lvl_spd: number
  comp_main: number
  comp_plus: number
  comp_100: number
  comp_all: number
  comp_main_count: number
  comp_plus_count: number
  comp_100_count: number
  comp_all_count: number
  invested_co: number
  invested_mp: number
  invested_co_count: number
  invested_mp_count: number
  count_comp: number
  count_speedrun: number
  count_backlog: number
  count_review: number
  review_score: number
  count_playing: number
  count_retired: number
  profile_dev: string
  profile_popular: number
  profile_steam: number
  profile_platform: string
  release_world: number
}

interface HLTBResponse {
  color: string
  title: string
  category: string
  count: number
  pageCurrent: number
  pageTotal: number
  pageSize: number
  data: HLTBSearchResult[]
}

async function searchHLTB(gameName: string): Promise<HLTBSearchResult[]> {
  const payload = {
    searchType: 'games',
    searchTerms: gameName.split(' '),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: { perspective: '', flow: '', genre: '' },
        rangeYear: { min: '', max: '' },
        modifier: '',
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '',
      sort: 0,
      randomizer: 0,
    },
  }

  const response = await fetch(HLTB_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://howlongtobeat.com',
      'Referer': 'https://howlongtobeat.com/',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`HLTB request failed with status ${response.status}`)
  }

  const data: HLTBResponse = await response.json()
  return data.data || []
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
    const cleanedName = cleanGameName(gameName)
    const results = await searchHLTB(cleanedName)

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
    const cleanedNameLower = cleanedName.toLowerCase()
    let bestMatch = results[0]

    for (const result of results) {
      const resultName = result.game_name.toLowerCase()
      if (resultName === cleanedNameLower) {
        bestMatch = result
        break
      }
      // Partial match - if our game name is contained in HLTB result
      if (resultName.includes(cleanedNameLower) || cleanedNameLower.includes(resultName)) {
        bestMatch = result
      }
    }

    // Extract times (in hours) - HLTB returns times in seconds, convert to hours
    const mainStory = bestMatch.comp_main ? Math.round(bestMatch.comp_main / 3600 * 10) / 10 : null
    const mainPlusExtras = bestMatch.comp_plus ? Math.round(bestMatch.comp_plus / 3600 * 10) / 10 : null
    const completionist = bestMatch.comp_100 ? Math.round(bestMatch.comp_100 / 3600 * 10) / 10 : null

    // Cache the result
    await supabase.from('hltb_cache').upsert({
      igdb_game_id: gameIdNum,
      hltb_id: bestMatch.game_id,
      main_story: mainStory,
      main_plus_extras: mainPlusExtras,
      completionist: completionist,
      cached_at: new Date().toISOString(),
    })

    return NextResponse.json({
      gameId: gameIdNum,
      hltbId: bestMatch.game_id,
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
