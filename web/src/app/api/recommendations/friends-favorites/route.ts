import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GameWithFriendCount {
  id: number
  name: string
  coverUrl: string | null
  friendCount: number
  friends: Array<{
    id: string
    username: string
    avatar_url: string | null
  }>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's friends (users they follow)
    const { data: following, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (followError) {
      console.error('Error fetching follows:', followError)
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    if (!following || following.length === 0) {
      return NextResponse.json({
        games: [],
        message: 'Not following anyone yet'
      })
    }

    const friendIds = following.map(f => f.following_id)

    // Get current user's game IDs (to exclude)
    const { data: userLogs } = await supabase
      .from('game_logs')
      .select('game_id')
      .eq('user_id', userId)

    const userGameIds = new Set(userLogs?.map(log => log.game_id) || [])

    // Get friends' highly rated games (4+ stars)
    const { data: friendLogs, error: logsError } = await supabase
      .from('game_logs')
      .select(`
        game_id,
        rating,
        user_id,
        games_cache(id, name, cover_url),
        profiles(id, username, avatar_url)
      `)
      .in('user_id', friendIds)
      .gte('rating', 4)
      .not('rating', 'is', null)

    if (logsError) {
      console.error('Error fetching friend logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch friend games' }, { status: 500 })
    }

    if (!friendLogs || friendLogs.length === 0) {
      return NextResponse.json({
        games: [],
        message: 'No friend favorites found'
      })
    }

    // Group by game and count friends
    const gameMap = new Map<number, GameWithFriendCount>()

    for (const log of friendLogs) {
      const gameCache = log.games_cache as unknown as { id: number; name: string; cover_url: string | null } | null
      const profile = log.profiles as unknown as { id: string; username: string; avatar_url: string | null } | null

      if (!gameCache || userGameIds.has(log.game_id)) {
        continue // Skip games in user's library or without cache
      }

      const existing = gameMap.get(log.game_id)
      if (existing) {
        existing.friendCount++
        if (profile && !existing.friends.find(f => f.id === profile.id)) {
          existing.friends.push({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url
          })
        }
      } else {
        gameMap.set(log.game_id, {
          id: gameCache.id,
          name: gameCache.name,
          coverUrl: gameCache.cover_url,
          friendCount: 1,
          friends: profile ? [{
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url
          }] : []
        })
      }
    }

    // Sort by friend count and get top 15
    const games = Array.from(gameMap.values())
      .sort((a, b) => b.friendCount - a.friendCount)
      .slice(0, 15)

    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error in friends-favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
