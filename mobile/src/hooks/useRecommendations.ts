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
  explanation?: string
  cached?: boolean
  rateLimit?: {
    remaining: number
    limit: number
  }
}

interface FriendsFavoritesData {
  games: GameWithFriends[]
}

// ============================================
// BECAUSE YOU LOVED HOOK (AI-POWERED)
// ============================================

// Uses AI to generate personalized recommendations based on user's gaming history
// Falls back to IGDB-based recommendations if AI fails
export function useBecauseYouLoved(userId: string | undefined, platforms?: string[] | null, excludePcOnly: boolean = false) {
  const [basedOnGame, setBasedOnGame] = useState<Game | null>(null)
  const [recommendations, setRecommendations] = useState<Game[]>([])
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!userId)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null)

  const fetchAI = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      setIsLoading(false)
      setBasedOnGame(null)
      setRecommendations([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try the new AI endpoint first
      let url = `${API_CONFIG.baseUrl}/api/ai/personalized-recommendations?user_id=${userId}&list_type=because_you_loved`

      if (forceRefresh) {
        url += '&refresh=true'
      }

      console.log('[BecauseYouLoved] Fetching AI recommendations...')
      const response = await fetch(url)

      if (!response.ok) {
        // If rate limited, show a message but don't fall back
        if (response.status === 429) {
          const data = await response.json()
          setRateLimit({ remaining: 0, limit: data.limit || 5 })
          throw new Error('Daily AI recommendation limit reached')
        }
        throw new Error('AI recommendations failed')
      }

      const data: BecauseYouLovedData = await response.json()
      console.log('[BecauseYouLoved] AI Response:', JSON.stringify(data, null, 2))

      if (data.recommendations && data.recommendations.length > 0) {
        setBasedOnGame(data.basedOnGame)
        setRecommendations(data.recommendations)
        setExplanation(data.explanation || null)
        setIsCached(data.cached || false)
        if (data.rateLimit) {
          setRateLimit(data.rateLimit)
        }
        return // Success with AI
      }

      // If AI returned no results, fall back to IGDB-based endpoint
      console.log('[BecauseYouLoved] AI returned no results, falling back to IGDB...')
      await fetchIGDBFallback()
    } catch (err) {
      console.error('[BecauseYouLoved] AI Error:', err)

      // Try fallback to IGDB-based recommendations
      try {
        await fetchIGDBFallback()
      } catch (fallbackErr) {
        console.error('[BecauseYouLoved] Fallback also failed:', fallbackErr)
        setError(err instanceof Error ? err.message : 'Failed to load recommendations')
        setBasedOnGame(null)
        setRecommendations([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchIGDBFallback = async () => {
    if (!userId) return

    let url = `${API_CONFIG.baseUrl}/api/recommendations/because-you-loved?user_id=${userId}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch recommendations')
    }

    const data = await response.json()
    console.log('[BecauseYouLoved] IGDB Fallback Response:', JSON.stringify(data, null, 2))
    setBasedOnGame(data.basedOnGame)
    setRecommendations(data.recommendations || [])
    setExplanation(null)
    setIsCached(false)
  }

  useEffect(() => {
    fetchAI(false)
  }, [fetchAI])

  const refresh = useCallback(() => {
    return fetchAI(true)
  }, [fetchAI])

  return {
    basedOnGame,
    recommendations,
    explanation,
    isLoading,
    error,
    isCached,
    rateLimit,
    refetch: refresh
  }
}

// ============================================
// FRIENDS FAVORITES HOOK
// ============================================

export function useFriendsFavorites(userId: string | undefined) {
  const [games, setGames] = useState<GameWithFriends[]>([])
  const [isLoading, setIsLoading] = useState(!!userId) // Start loading if we have userId
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
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
      console.log('[FriendsFavorites] API Response:', JSON.stringify(data, null, 2))
      setGames(data.games || [])
    } catch (err) {
      console.error('[FriendsFavorites] Error:', err)
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
