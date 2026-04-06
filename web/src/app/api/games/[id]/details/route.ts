import { NextRequest, NextResponse } from 'next/server'
import { getSmartSimilarGames } from '@/lib/igdb'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!

async function getAccessToken(): Promise<string> {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const data = await response.json()
  return data.access_token
}

// GET /api/games/[id]/details?platforms=playstation,pc&exclude_pc_only=true
// Optional platforms param filters similar games (e.g., 'playstation,pc,xbox,nintendo')
// Optional exclude_pc_only param removes games that are ONLY available on PC
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  // Parse platforms param for filtering similar games
  const searchParams = request.nextUrl.searchParams
  const platformsParam = searchParams.get('platforms')
  const platforms = platformsParam
    ? platformsParam.split(',').map(p => p.trim().toLowerCase()).filter(Boolean)
    : undefined

  // Parse exclude_pc_only param
  const excludePcOnly = searchParams.get('exclude_pc_only') === 'true'

  try {
    const token = await getAccessToken()

    const query = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating,
             videos.video_id, videos.name,
             screenshots.image_id, artworks.image_id;
      where id = ${gameId};
    `

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    if (!response.ok) {
      console.error('IGDB API error:', response.status, await response.text())
      return NextResponse.json({ error: 'IGDB API error' }, { status: 502 })
    }

    const games = await response.json()

    if (!games || games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const game = games[0]

    // Use the same smart similar games logic as "Because You Loved" recommendations
    // This gets games from (in priority order):
    //   Tier 0: Franchise/Collection (same series - e.g., Uncharted games)
    //   Tier 1: Same developer (e.g., It Takes Two -> Split Fiction)
    //   Tier 2: IGDB similar_games
    //   Tier 3: Same genres (75+ rating)
    //   Tier 4: Same themes (80+ rating)
    // Within each tier, sorted by release date (newer first)
    console.log(`[GameDetails] Fetching smart similar games for: ${game.name}`, platforms ? `(platforms: ${platforms.join(',')})` : '(all platforms)', excludePcOnly ? '(excluding PC-only)' : '')
    const smartSimilarGames = await getSmartSimilarGames(parseInt(gameId), 100, platforms, excludePcOnly)

    // Keep the tier-based ordering (series first, then developer, then similar, etc.)
    // Don't re-sort by PopScore as it would put popular unrelated games above series/developer games
    const similarGames = smartSimilarGames.map(g => ({
      id: g.id,
      name: g.name,
      coverUrl: g.coverUrl
    }))

    console.log(`[GameDetails] Returning ${similarGames.length} similar games (tier-ordered)`)

    return NextResponse.json({
      id: game.id,
      name: game.name,
      slug: game.slug,
      summary: game.summary,
      coverUrl: game.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null,
      firstReleaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString()
        : null,
      genres: game.genres?.map((g: any) => g.name) || [],
      platforms: game.platforms?.map((p: any) => p.name) || [],
      rating: game.total_rating,
      videos: game.videos?.map((v: any) => ({
        videoId: v.video_id,
        name: v.name || 'Trailer'
      })) || [],
      screenshotUrl: (() => {
        const imageId = game.artworks?.[0]?.image_id || game.screenshots?.[0]?.image_id
        return imageId
          ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`
          : null
      })(),
      similarGames
    })
  } catch (error) {
    console.error('Error fetching game details:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
