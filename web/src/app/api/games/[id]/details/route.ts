import { NextRequest, NextResponse } from 'next/server'
import { getSmartSimilarGames, getPopularityForGames } from '@/lib/igdb'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  try {
    const token = await getAccessToken()

    const query = `
      fields name, slug, summary, cover.image_id, first_release_date,
             genres.name, platforms.name, total_rating,
             videos.video_id, videos.name;
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
    // This gets games from: franchise, collection, developer, IGDB similar_games, genre, theme
    console.log(`[GameDetails] Fetching smart similar games for: ${game.name}`)
    const smartSimilarGames = await getSmartSimilarGames(parseInt(gameId), 100)

    // Get PopScore for sorting (same as "Because You Loved")
    const gameIds = smartSimilarGames.map(g => g.id)
    const popularityMap = await getPopularityForGames(gameIds)

    // Sort by PopScore (most popular first)
    const sortedSimilarGames = [...smartSimilarGames].sort((a, b) => {
      const aPopularity = popularityMap.get(a.id) || 0
      const bPopularity = popularityMap.get(b.id) || 0
      return bPopularity - aPopularity
    })

    // Return all similar games - let the mobile app decide how many to display
    const similarGames = sortedSimilarGames.map(g => ({
      id: g.id,
      name: g.name,
      coverUrl: g.coverUrl
    }))

    console.log(`[GameDetails] Returning ${similarGames.length} similar games sorted by PopScore`)

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
      similarGames
    })
  } catch (error) {
    console.error('Error fetching game details:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
