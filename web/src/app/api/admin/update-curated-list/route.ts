import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, gameIds } = body

    if (!slug || !Array.isArray(gameIds)) {
      return NextResponse.json(
        { error: 'slug and gameIds array are required' },
        { status: 400 }
      )
    }

    // Validate all game IDs are numbers
    if (!gameIds.every(id => typeof id === 'number')) {
      return NextResponse.json(
        { error: 'All gameIds must be numbers' },
        { status: 400 }
      )
    }

    // Update the curated list
    const { data, error } = await supabase
      .from('curated_lists')
      .update({ game_ids: gameIds, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select('slug, title, game_ids')
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      list: {
        slug: data.slug,
        title: data.title,
        gameCount: data.game_ids?.length || 0
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
