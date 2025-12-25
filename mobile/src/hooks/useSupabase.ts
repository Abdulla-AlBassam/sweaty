import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Game, GameLog, Profile, ActivityItem, CuratedListWithGames } from '../types'

export function useGameLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<GameLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    if (!userId) {
      setLogs([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase
      .from('game_logs')
      .select('*, games_cache (id, name, cover_url, slug)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) setError(error.message)
    else setLogs(data as GameLog[])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [userId])

  return { logs, isLoading, error, refetch: fetchLogs }
}

export function useProfile(username: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) setError(error.message)
      else setProfile(data as Profile)
      setIsLoading(false)
    }

    fetchProfile()
  }, [username])

  return { profile, isLoading, error }
}

export function useFollowCounts(userId: string | undefined) {
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setFollowers(0)
      setFollowing(0)
      setIsLoading(false)
      return
    }

    const fetchCounts = async () => {
      setIsLoading(true)
      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      setFollowers(followersResult.count || 0)
      setFollowing(followingResult.count || 0)
      setIsLoading(false)
    }

    fetchCounts()
  }, [userId])

  return { followers, following, isLoading }
}

export function useActivityFeed(userId: string | undefined) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    if (!userId) {
      setActivities([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get users the current user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (!following || following.length === 0) {
        setActivities([])
        setIsLoading(false)
        return
      }

      const followingIds = following.map((f) => f.following_id)

      // Get recent game logs from followed users
      const { data: logs, error: logsError } = await supabase
        .from('game_logs')
        .select(`
          id,
          status,
          rating,
          created_at,
          user_id,
          game_id,
          profiles!game_logs_user_id_fkey (id, username, display_name, avatar_url),
          games_cache!game_logs_game_id_fkey (id, name, cover_url)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(20)

      if (logsError) throw logsError

      const formattedActivities: ActivityItem[] = (logs || []).map((log: any) => ({
        id: log.id,
        user: {
          id: log.profiles.id,
          username: log.profiles.username,
          display_name: log.profiles.display_name,
          avatar_url: log.profiles.avatar_url,
        },
        game: {
          id: log.games_cache.id,
          name: log.games_cache.name,
          cover_url: log.games_cache.cover_url,
        },
        status: log.status,
        rating: log.rating,
        created_at: log.created_at,
      }))

      setActivities(formattedActivities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [userId])

  return { activities, isLoading, error, refetch: fetchActivities }
}

export function useGameSearch(query: string) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setGames([])
      return
    }

    const searchGames = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
        const encodedQuery = encodeURIComponent(query)
        const response = await fetch(apiUrl + '/api/games/search?q=' + encodedQuery)

        if (!response.ok) throw new Error('Failed to search games')

        const data = await response.json()
        setGames(data.games || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(searchGames, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  return { games, isLoading, error }
}

export function useCuratedLists() {
  const [lists, setLists] = useState<CuratedListWithGames[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLists = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch active curated lists ordered by display_order
        const { data: curatedLists, error: listsError } = await supabase
          .from('curated_lists')
          .select('id, slug, title, description, game_ids, display_order, is_active')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (listsError) throw listsError

        if (!curatedLists || curatedLists.length === 0) {
          setLists([])
          setIsLoading(false)
          return
        }

        // Collect all unique game IDs from all lists
        const allGameIds = new Set<number>()
        curatedLists.forEach((list: any) => {
          (list.game_ids || []).forEach((id: number) => allGameIds.add(id))
        })

        // Fetch all games in one query
        let gamesMap = new Map<number, { id: number; name: string; cover_url: string | null }>()

        if (allGameIds.size > 0) {
          const { data: games, error: gamesError } = await supabase
            .from('games_cache')
            .select('id, name, cover_url')
            .in('id', Array.from(allGameIds))

          if (gamesError) throw gamesError

          games?.forEach((game: any) => {
            gamesMap.set(game.id, game)
          })
        }

        // Map games to each list, preserving order from game_ids array
        const listsWithGames: CuratedListWithGames[] = curatedLists.map((list: any) => ({
          ...list,
          games: (list.game_ids || [])
            .map((id: number) => gamesMap.get(id))
            .filter(Boolean) as Array<{ id: number; name: string; cover_url: string | null }>
        }))

        setLists(listsWithGames)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch curated lists')
        console.error('Curated lists fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLists()
  }, [])

  return { lists, isLoading, error }
}
