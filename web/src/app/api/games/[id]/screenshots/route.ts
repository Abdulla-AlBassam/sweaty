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

// GET /api/games/[id]/screenshots
// Returns screenshots for a game from IGDB
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params

  try {
    const token = await getAccessToken()

    // Fetch game with screenshots from IGDB
    const query = `
      fields name, screenshots.image_id, screenshots.width, screenshots.height;
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

    // Transform screenshots to full URLs
    // Using t_screenshot_big (889x500) which is great for banners
    const screenshots = (game.screenshots || []).map((s: { image_id: string; width: number; height: number }) => ({
      url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`,
      width: s.width,
      height: s.height,
    }))

    return NextResponse.json({
      gameId: parseInt(gameId),
      gameName: game.name,
      screenshots,
    })
  } catch (error) {
    console.error('Error fetching screenshots:', error)
    return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 })
  }
}
