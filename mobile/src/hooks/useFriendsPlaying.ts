import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface FriendUser {
  id: string
  username: string
  avatar_url: string | null
}

interface GameWithFriends {
  id: number
  name: string
  cover_url: string | null
  friends: FriendUser[]
}

export function useFriendsPlaying(userId: string | undefined) {
  const [games, setGames] = useState<GameWithFriends[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setGames([])
      setIsLoading(false)
      return
    }

    const fetchFriendsPlaying = async () => {
      setIsLoading(true)

      try {
        // Step 1: Get IDs of users I follow
        const { data: followsData, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)

        if (followsError) throw followsError

        const followingIds = followsData?.map(f => f.following_id) || []

        if (followingIds.length === 0) {
          setGames([])
          setIsLoading(false)
          return
        }

        // Step 2: Get game_logs where status = 'playing' for those users
        // Include user profile info and game info
        const { data: logsData, error: logsError } = await supabase
          .from('game_logs')
          .select(`
            game_id,
            profiles!game_logs_user_id_fkey (id, username, avatar_url),
            games_cache!game_logs_game_id_fkey (id, name, cover_url)
          `)
          .in('user_id', followingIds)
          .eq('status', 'playing')

        if (logsError) throw logsError

        if (!logsData || logsData.length === 0) {
          setGames([])
          setIsLoading(false)
          return
        }

        // Step 3: Group by game_id, aggregate friends into array
        const gameMap = new Map<number, GameWithFriends>()

        for (const log of logsData) {
          const gameData = log.games_cache as unknown as { id: number; name: string; cover_url: string | null }
          const profileData = log.profiles as unknown as { id: string; username: string; avatar_url: string | null }

          if (!gameData || !profileData) continue

          const gameId = gameData.id

          if (!gameMap.has(gameId)) {
            gameMap.set(gameId, {
              id: gameId,
              name: gameData.name,
              cover_url: gameData.cover_url,
              friends: [],
            })
          }

          const game = gameMap.get(gameId)!
          // Avoid duplicate friends
          if (!game.friends.find(f => f.id === profileData.id)) {
            game.friends.push({
              id: profileData.id,
              username: profileData.username,
              avatar_url: profileData.avatar_url,
            })
          }
        }

        // Convert map to array, sorted by number of friends (most friends first)
        const gamesArray = Array.from(gameMap.values()).sort(
          (a, b) => b.friends.length - a.friends.length
        )

        setGames(gamesArray)
      } catch (error) {
        console.error('Error fetching friends playing:', error)
        setGames([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFriendsPlaying()
  }, [userId])

  return { games, isLoading }
}
