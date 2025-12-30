import { NextRequest, NextResponse } from 'next/server'

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

// Convert seconds to hours (rounded to 1 decimal)
function secondsToHours(seconds?: number): number | null {
  if (!seconds) return null
  return Math.round(seconds / 3600 * 10) / 10
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  try {
    const token = await getAccessToken()

    // Base query without time_to_beat (it's often not available)
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

    // Check if IGDB returned an error
    if (!response.ok) {
      console.error('IGDB API error:', response.status, await response.text())
      return NextResponse.json({ error: 'IGDB API error' }, { status: 502 })
    }

    const games = await response.json()

    if (!games || games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const game = games[0]

    // Try to fetch time_to_beat separately (it's often missing)
    let howLongToBeat = null
    try {
      const hltbQuery = `
        fields time_to_beat.hastily, time_to_beat.normally, time_to_beat.completely;
        where id = ${gameId};
      `
      const hltbResponse = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: hltbQuery,
      })

      if (hltbResponse.ok) {
        const hltbData = await hltbResponse.json()
        if (hltbData?.[0]?.time_to_beat) {
          const ttb = hltbData[0].time_to_beat
          const main = secondsToHours(ttb.normally)
          const mainExtra = secondsToHours(ttb.hastily)
          const completionist = secondsToHours(ttb.completely)
          if (main || mainExtra || completionist) {
            howLongToBeat = { main, mainExtra, completionist }
          }
        }
      }
    } catch (hltbError) {
      // HLTB fetch failed - just continue without it
      console.log('HLTB fetch failed (non-critical):', hltbError)
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
      howLongToBeat
    })
  } catch (error) {
    console.error('Error fetching game details:', error)
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 })
  }
}
