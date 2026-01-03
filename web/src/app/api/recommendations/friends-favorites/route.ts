import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Friend {
  id: string
  username: string
  avatar_url: string | null
}

interface GameWithFriends {
  id: number
  name: string
  coverUrl: string | null
  friends: Friend[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Get user's friends (users they follow) with their favorite_games
    const { data: following, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    if (followError) {
      console.error('[FriendsFavorites] Error fetching follows:', followError)
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 })
    }

    if (!following || following.length === 0) {
      console.log('[FriendsFavorites] User is not following anyone')
      return NextResponse.json({ games: [] })
    }

    const friendIds = following.map(f => f.following_id)
    console.log('[FriendsFavorites] User follows', friendIds.length, 'people')

    // Get friends' profiles with their favorite_games arrays
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, favorite_games')
      .in('id', friendIds)
      .not('favorite_games', 'is', null)

    if (profilesError) {
      console.error('[FriendsFavorites] Error fetching friend profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch friend profiles' }, { status: 500 })
    }

    if (!friendProfiles || friendProfiles.length === 0) {
      console.log('[FriendsFavorites] No friends have favorite games set')
      return NextResponse.json({ games: [] })
    }

    // Collect all unique game IDs from friends' favorites
    const gameToFriends = new Map<number, Friend[]>()

    for (const profile of friendProfiles) {
      const favoriteGames = profile.favorite_games as number[] | null
      if (!favoriteGames || favoriteGames.length === 0) continue

      const friend: Friend = {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url
      }

      for (const gameId of favoriteGames) {
        if (!gameToFriends.has(gameId)) {
          gameToFriends.set(gameId, [])
        }
        gameToFriends.get(gameId)!.push(friend)
      }
    }

    if (gameToFriends.size === 0) {
      console.log('[FriendsFavorites] No favorite games found from friends')
      return NextResponse.json({ games: [] })
    }

    const allGameIds = Array.from(gameToFriends.keys())
    console.log('[FriendsFavorites] Found', allGameIds.length, 'unique games from friends favorites')

    // Get current user's game IDs (to optionally exclude - keeping for now but not excluding)
    // const { data: userLogs } = await supabase
    //   .from('game_logs')
    //   .select('game_id')
    //   .eq('user_id', userId)
    // const userGameIds = new Set(userLogs?.map(log => log.game_id) || [])

    // Fetch game data from games_cache
    const { data: gamesData, error: gamesError } = await supabase
      .from('games_cache')
      .select('id, name, cover_url')
      .in('id', allGameIds)

    if (gamesError) {
      console.error('[FriendsFavorites] Error fetching games:', gamesError)
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
    }

    // Build response with friend data
    const games: GameWithFriends[] = (gamesData || [])
      .map(game => ({
        id: game.id,
        name: game.name,
        coverUrl: game.cover_url,
        friends: gameToFriends.get(game.id) || []
      }))
      // Sort by number of friends who have it as favorite (most popular first)
      .sort((a, b) => b.friends.length - a.friends.length)

    console.log('[FriendsFavorites] Returning', games.length, 'games')

    return NextResponse.json({ games })
  } catch (error) {
    console.error('[FriendsFavorites] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
