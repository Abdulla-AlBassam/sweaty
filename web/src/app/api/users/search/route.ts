import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/users/search?q=john
// Searches profiles by username and display_name (case-insensitive, partial match)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rawQuery = searchParams.get('q')

  if (!rawQuery || rawQuery.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing required parameter: q' },
      { status: 400 }
    )
  }

  // Sanitise: PostgREST's `.or()` filter parser treats commas, parens, and
  // dots as control characters. Interpolating raw user input lets an
  // attacker reshape the OR clause and probe filters against any column.
  // Restrict to alphanumerics, underscore, hyphen and space, capped at 32
  // characters — covers every real username/display-name search.
  const safeQuery = rawQuery.trim().slice(0, 32).replace(/[^A-Za-z0-9_ -]/g, '')

  if (!safeQuery) {
    return NextResponse.json({ users: [] })
  }

  try {
    const supabase = await createClient()

    // Get current user to exclude from results
    const { data: { user } } = await supabase.auth.getUser()

    // Search profiles by username or display_name (case-insensitive partial match)
    let queryBuilder = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
      .limit(10)

    // Exclude current user if logged in
    if (user) {
      queryBuilder = queryBuilder.neq('id', user.id)
    }

    const { data: users, error } = await queryBuilder

    if (error) {
      console.error('User search error:', error)
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
