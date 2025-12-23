import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/lookup-email
// Looks up the email for a given username using a database function
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call the database function to get email from username
    const { data, error } = await supabase
      .rpc('get_email_by_username', { p_username: username.trim().toLowerCase() })

    if (error) {
      console.error('RPC error:', error)
      // If the function doesn't exist yet, fall back to checking if username exists
      if (error.code === '42883') { // function does not exist
        return NextResponse.json(
          { error: 'Database function not configured. Please run the migration SQL.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to lookup username' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Username not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ email: data })
  } catch (error) {
    console.error('Lookup email error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup username' },
      { status: 500 }
    )
  }
}
