import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Game, GameLog, Profile } from '../types'

export function useGameLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<GameLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLogs([])
      setIsLoading(false)
      return
    }

    const fetchLogs = async () => {
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

    fetchLogs()
  }, [userId])

  return { logs, isLoading, error }
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
