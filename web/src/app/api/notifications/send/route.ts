import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type NotificationType = 'new_follower' | 'friend_activity' | 'streak_reminder'

interface SendRequest {
  recipient_id: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
}

// POST /api/notifications/send
// Sends a push notification to a user if they have it enabled
export async function POST(request: NextRequest) {
  try {
    // Verify the request comes from a trusted source (Supabase webhook or internal)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!authHeader || !expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipient_id, type, title, body, data }: SendRequest = await request.json()

    if (!recipient_id || !type || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check user's notification preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('notification_preferences')
      .eq('id', recipient_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const prefs = profile.notification_preferences || {}
    const prefKey = type === 'new_follower' ? 'new_followers' :
                    type === 'friend_activity' ? 'friend_activity' :
                    'streak_reminders'

    if (prefs[prefKey] === false) {
      return NextResponse.json({ skipped: true, reason: 'User has this notification type disabled' })
    }

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipient_id)

    if (tokensError || !tokens?.length) {
      return NextResponse.json({ skipped: true, reason: 'No push tokens registered' })
    }

    // Send via Expo Push API
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: { type, ...data },
    }))

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const pushResult = await pushResponse.json()

    return NextResponse.json({ sent: true, tickets: pushResult.data })
  } catch (error: unknown) {
    console.error('Notification send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
