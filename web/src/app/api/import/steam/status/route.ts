import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/import/steam/status?user_id=xxx
// Check if user has Steam linked and return connection details
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing required parameter: user_id' },
      { status: 400 }
    )
  }

  try {
    // Get user's Steam connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('platform_connections')
      .select('id, platform_user_id, platform_username, last_synced_at, created_at')
      .eq('user_id', userId)
      .eq('platform', 'steam')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({
        connected: false,
        platform: 'steam',
      })
    }

    // Get count of imported games
    const { count: gameCount } = await supabaseAdmin
      .from('platform_games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', 'steam')

    // Get count of matched games (have IGDB ID)
    const { count: matchedCount } = await supabaseAdmin
      .from('platform_games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', 'steam')
      .not('igdb_game_id', 'is', null)

    return NextResponse.json({
      connected: true,
      platform: 'steam',
      steam_id: connection.platform_user_id,
      username: connection.platform_username,
      last_synced_at: connection.last_synced_at,
      connected_at: connection.created_at,
      game_count: gameCount || 0,
      matched_count: matchedCount || 0,
    })

  } catch (error) {
    console.error('Error checking Steam status:', error)
    return NextResponse.json(
      { error: 'Failed to check Steam connection status' },
      { status: 500 }
    )
  }
}
