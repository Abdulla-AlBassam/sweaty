import { NextRequest, NextResponse } from 'next/server'
import { getPopularGames } from '@/lib/igdb'

// GET /api/popular-games?limit=15
// Returns trending/popular games from IGDB
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '15')

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Limit must be between 1 and 50' },
      { status: 400 }
    )
  }

  try {
    const games = await getPopularGames(limit)
    return NextResponse.json({ games })
  } catch (error) {
    console.error('IGDB popular games error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch popular games' },
      { status: 500 }
    )
  }
}
