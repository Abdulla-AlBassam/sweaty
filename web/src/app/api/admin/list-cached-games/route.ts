import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/admin-guard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin-only — exposes the curated content surface and full games_cache count.
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const listSlug = searchParams.get('list')

    // If list slug provided, get games for that curated list
    if (listSlug) {
      const { data: list, error: listError } = await supabase
        .from('curated_lists')
        .select('title, slug, game_ids')
        .eq('slug', listSlug)
        .single()

      if (listError || !list) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }

      // Get game details for the IDs in this list
      const { data: games } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .in('id', list.game_ids || [])

      // Preserve order from game_ids
      const gamesMap = new Map(games?.map(g => [g.id, g]) || [])
      const orderedGames = (list.game_ids || []).map((id: number) => {
        const game = gamesMap.get(id)
        return game || { id, name: `MISSING (ID: ${id})`, cover_url: null }
      })

      return NextResponse.json({
        list: {
          title: list.title,
          slug: list.slug,
          gameCount: list.game_ids?.length || 0
        },
        games: orderedGames
      })
    }

    // Search games_cache by name
    if (search) {
      const { data: games, error } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .ilike('name', `%${search}%`)
        .limit(50)

      if (error) throw error

      return NextResponse.json({ games: games || [] })
    }

    // List all curated lists
    const { data: lists, error: listsError } = await supabase
      .from('curated_lists')
      .select('id, slug, title, game_ids, display_order, is_active')
      .order('display_order')

    if (listsError) throw listsError

    // Get count of games in cache
    const { count } = await supabase
      .from('games_cache')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      totalCachedGames: count,
      curatedLists: lists?.map(l => ({
        slug: l.slug,
        title: l.title,
        gameCount: l.game_ids?.length || 0,
        isActive: l.is_active,
        displayOrder: l.display_order
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
