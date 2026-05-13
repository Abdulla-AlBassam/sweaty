import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/**
 * Resolve the authenticated user from a request's `Authorization: Bearer <jwt>`
 * header by validating the JWT against Supabase Auth.
 *
 * Use this in any route that previously trusted a client-supplied `user_id`
 * field. The mobile client must include the user's Supabase session
 * `access_token` as a bearer header on every authenticated call.
 *
 * On failure returns a `NextResponse` to be returned directly from the route.
 * On success returns `{ user }` so the route can use `user.id` as the trusted
 * caller identity.
 */
export async function requireSession(
  request: Request
): Promise<{ user: User } | { error: NextResponse }> {
  const auth = request.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = auth.slice(7).trim()
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[require-session] Supabase env vars missing')
    return {
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    }
  }

  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user: data.user }
}
