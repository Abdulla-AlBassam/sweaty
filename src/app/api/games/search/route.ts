import { NextRequest, NextResponse } from 'next/server'
import { searchGames } from '@/lib/igdb'

// GET /api/games/search?q=zelda&limit=10
// Searches IGDB for games matching the query
export async function GET(request: NextRequest) {
  // Get query parameters from the URL
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Validate the query
  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameter: q' },
      { status: 400 }
    )
  }

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return NextResponse.json(
      { error: 'Limit must be between 1 and 50' },
      { status: 400 }
    )
  }

  try {
    const games = await searchGames(query, limit)
    return NextResponse.json({ games })
  } catch (error) {
    console.error('IGDB search error:', error)
    return NextResponse.json(
      { error: 'Failed to search games' },
      { status: 500 }
    )
  }
}
