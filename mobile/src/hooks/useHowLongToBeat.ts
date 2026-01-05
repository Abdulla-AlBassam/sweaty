import { useState, useEffect, useCallback } from 'react'
import { API_CONFIG } from '../constants'

// ============================================
// TYPES
// ============================================

export interface HLTBData {
  gameId: number
  hltbId: number | null
  mainStory: number | null
  mainPlusExtras: number | null
  completionist: number | null
}

interface CacheEntry {
  data: HLTBData
  timestamp: number
}

// ============================================
// CACHE
// ============================================

// In-memory cache with 1-hour TTL (data rarely changes)
const CACHE_TTL = 60 * 60 * 1000 // 1 hour
const hltbCache: Map<number, CacheEntry> = new Map()

function getCachedData(gameId: number): HLTBData | null {
  const entry = hltbCache.get(gameId)

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }

  // Remove expired entry
  if (entry) {
    hltbCache.delete(gameId)
  }

  return null
}

function setCachedData(gameId: number, data: HLTBData): void {
  hltbCache.set(gameId, {
    data,
    timestamp: Date.now(),
  })
}

// ============================================
// HOOK
// ============================================

export function useHowLongToBeat(gameId: number | undefined, gameName: string | undefined) {
  const [data, setData] = useState<HLTBData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHLTB = useCallback(async () => {
    if (!gameId || !gameName) {
      setData(null)
      return
    }

    // Check cache first
    const cached = getCachedData(gameId)
    if (cached) {
      setData(cached)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const encodedName = encodeURIComponent(gameName)
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/hltb/${gameId}?name=${encodedName}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch HLTB data')
      }

      const result = await response.json()

      const hltbData: HLTBData = {
        gameId: result.gameId,
        hltbId: result.hltbId,
        mainStory: result.mainStory,
        mainPlusExtras: result.mainPlusExtras,
        completionist: result.completionist,
      }

      // Cache the result
      setCachedData(gameId, hltbData)
      setData(hltbData)
    } catch (err) {
      console.error('HLTB fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [gameId, gameName])

  useEffect(() => {
    fetchHLTB()
  }, [fetchHLTB])

  return {
    data,
    isLoading,
    error,
    refetch: fetchHLTB,
    // Convenience getters
    hasData: data !== null && (data.mainStory !== null || data.mainPlusExtras !== null || data.completionist !== null),
    mainStory: data?.mainStory ?? null,
    mainPlusExtras: data?.mainPlusExtras ?? null,
    completionist: data?.completionist ?? null,
  }
}

// ============================================
// HELPERS
// ============================================

// Format hours for display (e.g., 12.5 -> "12.5h", 100 -> "100h")
export function formatHLTBTime(hours: number | null): string | null {
  if (hours === null || hours === 0) return null

  // Round to 1 decimal place, but show whole number if it's a whole number
  const rounded = Math.round(hours * 10) / 10
  const display = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)

  return `${display}h`
}
