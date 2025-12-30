import { useState, useEffect, useCallback } from 'react'
import { API_CONFIG } from '../constants'

// ============================================
// TYPES
// ============================================

export interface TwitchStream {
  streamer_name: string
  streamer_login: string
  title: string
  viewer_count: number
  thumbnail_url: string
  twitch_url: string
}

interface StreamsResponse {
  success: true
  game_name: string
  total_live: number
  streams: TwitchStream[]
}

interface CacheEntry {
  data: StreamsResponse
  timestamp: number
}

// ============================================
// CACHE
// ============================================

// In-memory cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const streamsCache: Map<string, CacheEntry> = new Map()

function getCachedData(gameName: string): StreamsResponse | null {
  const cacheKey = gameName.toLowerCase()
  const entry = streamsCache.get(cacheKey)

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }

  // Remove expired entry
  if (entry) {
    streamsCache.delete(cacheKey)
  }

  return null
}

function setCachedData(gameName: string, data: StreamsResponse): void {
  const cacheKey = gameName.toLowerCase()
  streamsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  })
}

// ============================================
// HOOK
// ============================================

interface UseTwitchStreamsResult {
  streams: TwitchStream[]
  totalLive: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useTwitchStreams(gameName: string | null): UseTwitchStreamsResult {
  const [streams, setStreams] = useState<TwitchStream[]>([])
  const [totalLive, setTotalLive] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStreams = useCallback(async () => {
    if (!gameName) {
      setStreams([])
      setTotalLive(0)
      return
    }

    // Check cache first
    const cachedData = getCachedData(gameName)
    if (cachedData) {
      setStreams(cachedData.streams)
      setTotalLive(cachedData.total_live)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/twitch/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_name: gameName }),
      })

      const data = await response.json()

      if (data.success) {
        setStreams(data.streams)
        setTotalLive(data.total_live)
        setCachedData(gameName, data)
      } else {
        // Game not found on Twitch or other error - just hide section
        setStreams([])
        setTotalLive(0)
        if (data.error !== 'game_not_found') {
          console.log('Twitch streams error:', data.error)
        }
      }
    } catch (err) {
      console.error('Error fetching Twitch streams:', err)
      setError('Failed to fetch streams')
      setStreams([])
      setTotalLive(0)
    } finally {
      setIsLoading(false)
    }
  }, [gameName])

  useEffect(() => {
    fetchStreams()
  }, [fetchStreams])

  return {
    streams,
    totalLive,
    isLoading,
    error,
    refetch: fetchStreams,
  }
}

// ============================================
// UTILITY
// ============================================

// Format viewer count (e.g., 12453 -> "12.4K")
export function formatViewerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return String(count)
}
