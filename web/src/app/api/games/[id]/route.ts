import { NextRequest, NextResponse } from 'next/server'
import { getGameById } from '@/lib/igdb'

// GET /api/games/123
// Returns details for a specific game by IGDB ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const gameId = parseInt(id)

  // Validate the ID
  if (isNaN(gameId) || gameId < 1) {
    return NextResponse.json(
      { error: 'Invalid game ID' },
      { status: 400 }
    )
  }

  try {
    const game = await getGameById(gameId)

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ game })
  } catch (error) {
    console.error('IGDB fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    )
  }
}
