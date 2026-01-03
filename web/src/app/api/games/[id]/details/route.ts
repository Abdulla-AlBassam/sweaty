import { NextRequest, NextResponse } from 'next/server'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!

// Major platforms only (no mobile, no old consoles)
const MAJOR_PLATFORMS = [6, 48, 167, 49, 169, 130] // PC, PS4, PS5, Xbox One, Xbox Series, Switch

// Current timestamp for filtering unreleased games
const NOW_UNIX = Math.floor(Date.now() / 1000)

async function getAccessToken(): Promise<string> {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const data = await response.json()
  return data.access_token
}

// Fetch popular games by genre as fallback when similar_games has too few results
// Only returns RELEASED games with good ratings to avoid unreleased hype games
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
      & first_release_date < ${NOW_UNIX}
      & total_rating_count > 100
      & total_rating > 70;
    sort total_rating_count desc;
    limit ${limit};
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

    return games.map((g: any) => ({
      id: g.id,
      name: g.name,
      coverUrl: g.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null
    }))
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

    // Process similar games - trust IGDB's order, just filter games with covers
    let similarGames: Array<{ id: number; name: string; coverUrl: string | null }> = []

    if (game.similar_games && game.similar_games.length > 0) {
      // Keep IGDB's original order - they've already curated these as similar
      // Only filter out games without covers
      similarGames = game.similar_games
        .filter((g: any) => g.cover?.image_id) // Must have cover art
        .slice(0, 10)
        .map((g: any) => ({
          id: g.id,
          name: g.name,
          coverUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        }))

      console.log(`[SimilarGames] Using ${similarGames.length} of ${game.similar_games.length} IGDB similar games`)
    }

    // Only fall back to genre if IGDB has NO similar games at all
    if (similarGames.length === 0 && game.genres && game.genres.length > 0) {
      console.log(`[SimilarGames] No IGDB similar games, using genre fallback`)
      const genreIds = game.genres.map((g: any) => g.id)
      similarGames = await getPopularGamesByGenre(token, genreIds, parseInt(gameId), 10)
      console.log(`[SimilarGames] Genre fallback returned ${similarGames.length} games`)
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
