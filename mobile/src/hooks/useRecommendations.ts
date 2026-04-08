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
// BECAUSE YOU LOVED HOOK (IGDB-first, AI fallback)
// ============================================

// Uses the 4-tier IGDB algorithm first (franchise → similar_games → developer → genre+theme).
// Falls back to AI only when IGDB returns too few results.
export function useBecauseYouLoved(userId: string | undefined, platforms?: string[] | null, excludePcOnly: boolean = false) {
  const [basedOnGame, setBasedOnGame] = useState<Game | null>(null)
  const [recommendations, setRecommendations] = useState<Game[]>([])
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!!userId)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number } | null>(null)

  const fetchRecommendations = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      setIsLoading(false)
      setBasedOnGame(null)
      setRecommendations([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // ── Primary: IGDB 4-tier algorithm ──────────────────────
      let url = `${API_CONFIG.baseUrl}/api/recommendations/because-you-loved?user_id=${userId}`
      if (platforms && platforms.length > 0) {
        url += `&platforms=${platforms.join(',')}`
      }
      if (excludePcOnly) {
        url += '&exclude_pc_only=true'
      }

      console.log('[BecauseYouLoved] Fetching IGDB recommendations...')
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('IGDB recommendations failed')
      }

      const data: BecauseYouLovedData = await response.json()
      console.log('[BecauseYouLoved] IGDB returned', data.recommendations?.length || 0, 'recs')

      if (data.recommendations && data.recommendations.length >= 3) {
        setBasedOnGame(data.basedOnGame)
        setRecommendations(data.recommendations)
        setExplanation(null)
        setIsCached(false)
        return // Success
      }

      // ── Fallback: AI endpoint if IGDB returned too few ──────
      console.log('[BecauseYouLoved] IGDB returned <3 results, trying AI fallback...')
      await fetchAIFallback(forceRefresh)
    } catch (err) {
      console.error('[BecauseYouLoved] IGDB Error:', err)

      // Try AI as fallback
      try {
        await fetchAIFallback(forceRefresh)
      } catch (fallbackErr) {
        console.error('[BecauseYouLoved] AI fallback also failed:', fallbackErr)
        setError(err instanceof Error ? err.message : 'Failed to load recommendations')
        setBasedOnGame(null)
        setRecommendations([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, platforms, excludePcOnly])

  const fetchAIFallback = async (forceRefresh: boolean = false) => {
    if (!userId) return

    let url = `${API_CONFIG.baseUrl}/api/ai/personalized-recommendations?user_id=${userId}&list_type=because_you_loved`
    if (forceRefresh) url += '&refresh=true'

    console.log('[BecauseYouLoved] Trying AI fallback...')
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 429) {
        const data = await response.json()
        setRateLimit({ remaining: 0, limit: data.limit || 5 })
      }
      throw new Error('AI recommendations failed')
    }

    const data: BecauseYouLovedData = await response.json()

    if (data.recommendations && data.recommendations.length > 0) {
      setBasedOnGame(data.basedOnGame)
      setRecommendations(data.recommendations)
      setExplanation(data.explanation || null)
      setIsCached(data.cached || false)
      if (data.rateLimit) setRateLimit(data.rateLimit)
    }
  }

  useEffect(() => {
    fetchRecommendations(false)
  }, [fetchRecommendations])

  const refresh = useCallback(() => {
    return fetchRecommendations(true)
  }, [fetchRecommendations])

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
