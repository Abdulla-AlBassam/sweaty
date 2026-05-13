import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGamesByIds } from '@/lib/igdb'
import { requireAdmin } from '@/lib/auth/admin-guard'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/backfill-screenshots
// Fetches screenshots from IGDB for games that don't have them yet.
// Admin-only — burns IGDB quota.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  try {
    // Get games missing screenshot_urls
    const { data: games, error } = await supabaseAdmin
      .from('games_cache')
      .select('id')
      .or('screenshot_urls.is.null,screenshot_urls.eq.{}')
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ids = (games || []).map((g: { id: number }) => g.id)
    if (ids.length === 0) {
      return NextResponse.json({ message: 'All games already have screenshots', updated: 0 })
    }

    console.log(`Backfilling screenshots for ${ids.length} games`)

    // Fetch in batches
    const BATCH_SIZE = 50
    let updated = 0

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      try {
        const fetched = await getGamesByIds(batch)

        for (const game of fetched) {
          if (game.screenshotUrls && game.screenshotUrls.length > 0) {
            const { error: updateError } = await supabaseAdmin
              .from('games_cache')
              .update({ screenshot_urls: game.screenshotUrls })
              .eq('id', game.id)

            if (!updateError) updated++
          }
        }

        if (i + BATCH_SIZE < ids.length) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (err) {
        console.error(`Error in batch starting at ${i}:`, err)
      }
    }

    return NextResponse.json({
      message: 'Backfill complete',
      total: ids.length,
      updated,
    })
  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

