import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSession } from '@/lib/auth/require-session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/import/playstation/status
// Returns PSN import status for the authenticated user.
// Auth: Authorization: Bearer <session.access_token>.
export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if ('error' in session) return session.error
  const userId = session.user.id

  try {
    // Check for platform connection (tracks if they've ever imported)
    const { data: connection } = await supabaseAdmin
      .from('platform_connections')
      .select('last_synced_at, created_at')
      .eq('user_id', userId)
      .eq('platform', 'playstation')
      .single()

    if (!connection) {
      return NextResponse.json({
        has_imported: false,
        platform: 'playstation',
      })
    }

    // Get count of imported games
    const { count: gameCount } = await supabaseAdmin
      .from('platform_games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', 'playstation')

    // Get count of matched games
    const { count: matchedCount } = await supabaseAdmin
      .from('platform_games')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('platform', 'playstation')
      .not('igdb_game_id', 'is', null)

    return NextResponse.json({
      has_imported: true,
      platform: 'playstation',
      last_import: connection.last_synced_at,
      first_import: connection.created_at,
      game_count: gameCount || 0,
      matched_count: matchedCount || 0,
    })

  } catch (error) {
    console.error('Error checking PlayStation status:', error)
    return NextResponse.json(
      { error: 'Failed to check PlayStation import status' },
      { status: 500 }
    )
  }
}
