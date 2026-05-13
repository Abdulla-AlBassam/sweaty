import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/auth/lookup-email
//
// Despite the legacy name, this endpoint performs the full sign-in server-side
// when the user types a username instead of an email. The email is never
// returned to the client — preventing username -> email enumeration.
//
// Body: { username: string, password: string }
// 200:  { session: { access_token, refresh_token, expires_in, ... } }
// 400:  missing fields / malformed body
// 401:  invalid credentials (generic, no enumeration signal)
// 500:  server misconfiguration
//
// The mobile client calls `supabase.auth.setSession(session)` with the
// returned session to hydrate its local session storage.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('[lookup-email] Supabase env vars missing')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Step 1: resolve username -> email using the service role.
    // The service-role client is server-only and never reaches the user.
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: email, error: rpcError } = await adminClient
      .rpc('get_email_by_username', { p_username: username })

    if (rpcError || !email || typeof email !== 'string') {
      // Generic failure: do not distinguish "no such user" from "wrong password".
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Step 2: sign in with the resolved email + supplied password using the
    // anon-key client so we get back a normal user session (not a service-role
    // session). The session is what the mobile client will hydrate.
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data?.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ session: data.session })
  } catch (error) {
    console.error('[lookup-email] error:', error)
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
}
