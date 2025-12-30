import { useState, useEffect, useCallback } from 'react'
import { API_CONFIG } from '../constants'

// ============================================
// TYPES
// ============================================

interface Game {
  id: number
  name: string
  coverUrl: string | null
}

interface Friend {
  id: string
  username: string
  avatar_url: string | null
}

interface GameWithFriends extends Game {
  friendCount: number
  friends: Friend[]
}

interface BecauseYouLovedData {
  basedOnGame: Game | null
  recommendations: Game[]
}

interface FriendsFavoritesData {
  games: GameWithFriends[]
}

interface MoreFromStudioData {
  studio: string | null
  games: Game[]
}

// ============================================
// BECAUSE YOU LOVED HOOK
// ============================================

export function useBecauseYouLoved(userId: string | undefined) {
  const [basedOnGame, setBasedOnGame] = useState<Game | null>(null)
  const [recommendations, setRecommendations] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!userId) {
      setBasedOnGame(null)
      setRecommendations([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/recommendations/because-you-loved?user_id=${userId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data: BecauseYouLovedData = await response.json()
      setBasedOnGame(data.basedOnGame)
      setRecommendations(data.recommendations || [])
    } catch (err) {
      console.error('Error fetching because-you-loved:', err)
      setError('Failed to load recommendations')
      setBasedOnGame(null)
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return {
    basedOnGame,
    recommendations,
    isLoading,
    error,
    refetch: fetch_
  }
}

// ============================================
// FRIENDS FAVORITES HOOK
// ============================================

export function useFriendsFavorites(userId: string | undefined) {
  const [games, setGames] = useState<GameWithFriends[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!userId) {
      setGames([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/recommendations/friends-favorites?user_id=${userId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch friends favorites')
      }

      const data: FriendsFavoritesData = await response.json()
      setGames(data.games || [])
    } catch (err) {
      console.error('Error fetching friends-favorites:', err)
      setError('Failed to load friend favorites')
      setGames([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return {
    games,
    isLoading,
    error,
    refetch: fetch_
  }
}

// ============================================
// MORE FROM STUDIO HOOK
// ============================================

export function useMoreFromStudio(userId: string | undefined) {
  const [studio, setStudio] = useState<string | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!userId) {
      setStudio(null)
      setGames([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/recommendations/more-from-studio?user_id=${userId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch studio games')
      }

      const data: MoreFromStudioData = await response.json()
      setStudio(data.studio)
      setGames(data.games || [])
    } catch (err) {
      console.error('Error fetching more-from-studio:', err)
      setError('Failed to load studio games')
      setStudio(null)
      setGames([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return {
    studio,
    games,
    isLoading,
    error,
    refetch: fetch_
  }
}
