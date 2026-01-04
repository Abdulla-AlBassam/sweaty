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

    // First get the game name
    const gameResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: `fields name; where id = ${gameId};`,
    })

    if (!gameResponse.ok) {
      console.error('IGDB games API error:', gameResponse.status, await gameResponse.text())
      return NextResponse.json({ error: 'IGDB API error' }, { status: 502 })
    }

    const games = await gameResponse.json()
    if (!games || games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const gameName = games[0].name

    // Fetch screenshots from the dedicated screenshots endpoint
    const screenshotsQuery = `
      fields image_id, width, height;
      where game = ${gameId};
      limit 20;
    `

    const screenshotsResponse = await fetch('https://api.igdb.com/v4/screenshots', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: screenshotsQuery,
    })

    if (!screenshotsResponse.ok) {
      console.error('IGDB screenshots API error:', screenshotsResponse.status, await screenshotsResponse.text())
      return NextResponse.json({ error: 'IGDB API error' }, { status: 502 })
    }

    const screenshotsData = await screenshotsResponse.json()

    // Transform screenshots to full URLs
    // Using t_screenshot_big (889x500) which is great for banners
    const screenshots = (screenshotsData || []).map((s: { image_id: string; width: number; height: number }) => ({
      url: `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`,
      width: s.width,
      height: s.height,
    }))

    return NextResponse.json({
      gameId: parseInt(gameId),
      gameName,
      screenshots,
    })
  } catch (error) {
    console.error('Error fetching screenshots:', error)
    return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 })
  }
}
