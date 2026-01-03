import { NextRequest, NextResponse } from 'next/server'
import { getPopularityForGames } from '@/lib/igdb'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!

// Minimum PopScore threshold to filter out obscure games
// Games below this are considered too niche/unknown to recommend
const MIN_POPSCORE_THRESHOLD = 5

// Major platforms only (no mobile, no old consoles)
const MAJOR_PLATFORMS = [6, 48, 167, 49, 169, 130] // PC, PS4, PS5, Xbox One, Xbox Series, Switch

async function getAccessToken(): Promise<string> {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const data = await response.json()
  return data.access_token
}

// Fetch popular games by genre as fallback when similar_games has too few quality results
async function getPopularGamesByGenre(
  token: string,
  genreIds: number[],
  excludeId: number,
  limit: number = 10
): Promise<Array<{ id: number; name: string; coverUrl: string | null }>> {
  if (genreIds.length === 0) return []

  const query = `
    fields id, name, cover.image_id;
    where genres = (${genreIds.join(',')})
      & id != ${excludeId}
      & cover != null
      & category = (0, 8, 9, 10, 11)
      & platforms = (${MAJOR_PLATFORMS.join(',')})
      & total_rating_count > 50;
    sort total_rating_count desc;
    limit ${limit * 2};
  `

  try {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    if (!response.ok) return []

    const games = await response.json()

    // Get PopScore and filter
    const gameIds = games.map((g: any) => g.id)
    const popularityMap = await getPopularityForGames(gameIds)

    return games
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        coverUrl: g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null,
        popScore: popularityMap.get(g.id) || 0
      }))
      .filter((g: any) => g.popScore >= MIN_POPSCORE_THRESHOLD)
      .sort((a: any, b: any) => b.popScore - a.popScore)
      .slice(0, limit)
      .map(({ id, name, coverUrl }: any) => ({ id, name, coverUrl }))
  } catch (error) {
    console.error('Genre fallback error:', error)
    return []
  }
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
             genres.id, genres.name, platforms.name, total_rating,
             videos.video_id, videos.name,
             similar_games.id, similar_games.name, similar_games.cover.image_id;
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

    // Process similar games with PopScore filtering and sorting
    let similarGames: Array<{ id: number; name: string; coverUrl: string | null }> = []

    if (game.similar_games && game.similar_games.length > 0) {
      // Get similar game IDs and fetch PopScore
      const similarGameIds = game.similar_games.map((g: any) => g.id)
      const popularityMap = await getPopularityForGames(similarGameIds)

      // Transform, filter obscure games, and sort by PopScore
      similarGames = game.similar_games
        .map((g: any) => ({
          id: g.id,
          name: g.name,
          coverUrl: g.cover?.image_id
            ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
            : null,
          popScore: popularityMap.get(g.id) || 0
        }))
        .filter((g: any) => g.popScore >= MIN_POPSCORE_THRESHOLD) // Filter out obscure games
        .sort((a: any, b: any) => b.popScore - a.popScore)
        .slice(0, 10)
        .map(({ id, name, coverUrl }: any) => ({ id, name, coverUrl }))

      console.log(`[SimilarGames] Filtered from ${game.similar_games.length} to ${similarGames.length} games (threshold: ${MIN_POPSCORE_THRESHOLD})`)
    }

    // If we have too few quality similar games, fall back to genre-based recommendations
    if (similarGames.length < 5 && game.genres && game.genres.length > 0) {
      console.log(`[SimilarGames] Only ${similarGames.length} quality results, fetching genre fallback`)
      const genreIds = game.genres.map((g: any) => g.id)
      const existingIds = new Set(similarGames.map(g => g.id))

      const genreFallback = await getPopularGamesByGenre(token, genreIds, parseInt(gameId), 10 - similarGames.length)

      // Add fallback games that aren't already in the list
      for (const fallbackGame of genreFallback) {
        if (!existingIds.has(fallbackGame.id) && similarGames.length < 10) {
          similarGames.push(fallbackGame)
          existingIds.add(fallbackGame.id)
        }
      }

      console.log(`[SimilarGames] After genre fallback: ${similarGames.length} games`)
    }

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
