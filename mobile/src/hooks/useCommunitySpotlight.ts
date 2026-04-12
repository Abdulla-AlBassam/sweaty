import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface SpotlightUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface CommunitySpotlightData {
  supporters: SpotlightUser[]
  streakLeaders: SpotlightUser[]
  rankLeaders: SpotlightUser[]
}

const SELECT_COLUMNS = 'id, username, display_name, avatar_url'
const LEADERBOARD_LIMIT = 100

export function useCommunitySpotlight() {
  const [data, setData] = useState<CommunitySpotlightData>({
    supporters: [],
    streakLeaders: [],
    rankLeaders: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const nowIso = new Date().toISOString()

    const [supportersRes, streakRes, rankRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(SELECT_COLUMNS)
        .neq('subscription_tier', 'free')
        .or(`subscription_tier.eq.lifetime,subscription_expires_at.gt.${nowIso}`)
        .order('created_at', { ascending: true })
        .limit(LEADERBOARD_LIMIT),

      supabase
        .from('profiles')
        .select(SELECT_COLUMNS)
        .gt('longest_streak', 0)
        .order('longest_streak', { ascending: false })
        .limit(LEADERBOARD_LIMIT),

      supabase
        .from('profiles')
        .select(SELECT_COLUMNS)
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(LEADERBOARD_LIMIT),
    ])

    setData({
      supporters: (supportersRes.data || []) as SpotlightUser[],
      streakLeaders: (streakRes.data || []) as SpotlightUser[],
      rankLeaders: (rankRes.data || []) as SpotlightUser[],
    })

    const queryErrors = [
      supportersRes.error,
      streakRes.error,
      rankRes.error,
    ].filter(Boolean)

    if (queryErrors.length > 0) {
      // Surface an error only if every query failed - otherwise the screen
      // still renders whatever data loaded successfully (e.g. the rank tab
      // may error if the total_xp column has not been migrated yet, while
      // supporters and streak still populate normally).
      console.warn('[useCommunitySpotlight] partial errors:', queryErrors)
      if (queryErrors.length === 3) {
        setError(queryErrors[0]?.message || 'Failed to load community spotlight')
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchAll,
  }
}
