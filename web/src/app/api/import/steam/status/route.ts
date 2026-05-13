import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSession } from '@/lib/auth/require-session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/import/steam/status
// Returns Steam connection details for the authenticated user.
// Auth: Authorization: Bearer <session.access_token>.
export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if ('error' in session) return session.error
  const userId = session.user.id

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
