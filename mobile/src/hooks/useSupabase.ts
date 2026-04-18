import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Game, GameLog, Profile, ActivityItem, CuratedList, CuratedListWithGames } from '../types'
import { API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { checkIsPremium } from './usePremium'

export interface OpenCriticData {
  score: number | null
  tier: string | null
  numReviews: number | null
}

export interface CommunityStats {
  averageRating: number | null
  totalLogs: number
}

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

      const { data: logs, error: logsError } = await supabase
        .from('game_logs')
        .select(`
          id,
          status,
          rating,
          review,
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
        review: log.review,
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

export function useOwnActivityFeed(userId: string | undefined) {
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
      const { data: logs, error: logsError } = await supabase
        .from('game_logs')
        .select(`
          id,
          status,
          rating,
          review,
          created_at,
          user_id,
          game_id,
          profiles!game_logs_user_id_fkey (id, username, display_name, avatar_url),
          games_cache!game_logs_game_id_fkey (id, name, cover_url)
        `)
        .eq('user_id', userId)
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
        review: log.review,
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

/**
 * Debounced game search against the web API.
 * platforms: optional array of platform slugs like ['playstation', 'pc'].
 */
export function useGameSearch(query: string, platforms?: string[] | null) {
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
        let url = apiUrl + '/api/games/search?q=' + encodedQuery

        if (platforms && platforms.length > 0) {
          url += '&platforms=' + encodeURIComponent(platforms.join(','))
        }

        const response = await fetch(url)

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
  }, [query, platforms?.join(',')])

  return { games, isLoading, error }
}

// Fisher-Yates shuffle.
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// IGDB platform names normalised to lowercase that we treat as "PC" for PC-only filtering.
const PC_PLATFORM_NAMES = [
  'pc',
  'windows',
  'mac',
  'linux',
  'pc (microsoft windows)',
  'macos',
  'classic mac os',
  'steam',
  'dos',
]

function isPcOnlyGame(platforms: string[] | null | undefined): boolean {
  if (!platforms || platforms.length === 0) return false
  const normalizedPlatforms = platforms.map(p => p.toLowerCase().trim())
  return normalizedPlatforms.every(platform =>
    PC_PLATFORM_NAMES.some(pcName => platform.includes(pcName))
  )
}

export function useCuratedLists(excludePcOnly: boolean = false) {
  const [lists, setLists] = useState<CuratedListWithGames[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: listsData, error: listsError } = await supabase
        .from('curated_lists')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (listsError) throw listsError

      const allGameIds = new Set<number>()
      ;(listsData as CuratedList[]).forEach((list) => {
        list.game_ids.forEach((id) => allGameIds.add(id))
      })

      // Batch-fetch every game referenced across every list in one query.
      const { data: gamesData, error: gamesError } = await supabase
        .from('games_cache')
        .select('id, name, cover_url, screenshot_urls, platforms, first_release_date')
        .in('id', Array.from(allGameIds))

      if (gamesError) throw gamesError

      const gamesMap = new Map<number, { id: number; name: string; cover_url: string | null; screenshot_urls: string[] | null; platforms: string[] | null; first_release_date: string | null }>()
      ;(gamesData || []).forEach((game: any) => {
        gamesMap.set(game.id, game)
      })

      const listsWithGames: CuratedListWithGames[] = (listsData as CuratedList[]).map((list) => {
        let games = list.game_ids
          .map((id) => gamesMap.get(id))
          .filter((game): game is { id: number; name: string; cover_url: string | null; screenshot_urls: string[] | null; platforms: string[] | null; first_release_date: string | null } => game !== undefined)

        if (excludePcOnly) {
          games = games.filter(game => !isPcOnlyGame(game.platforms))
        }

        games.sort((a, b) => {
          if (!a.first_release_date && !b.first_release_date) return 0
          if (!a.first_release_date) return 1
          if (!b.first_release_date) return -1
          return new Date(b.first_release_date).getTime() - new Date(a.first_release_date).getTime()
        })

        return {
          ...list,
          games,
        }
      })

      setLists(listsWithGames)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch curated lists')
    } finally {
      setIsLoading(false)
    }
  }, [excludePcOnly])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  return { lists, isLoading, error, refetch: fetchLists }
}

export function useOpenCritic(gameId: number, gameName: string) {
  const [data, setData] = useState<OpenCriticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!gameId || !gameName) {
      setData(null)
      setIsLoading(false)
      return
    }

    const fetchOpenCritic = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `${API_CONFIG.baseUrl}/api/opencritic/${gameId}?name=${encodeURIComponent(gameName)}`
        )

        if (response.ok) {
          const result = await response.json()
          setData({
            score: result.score,
            tier: result.tier,
            numReviews: result.numReviews,
          })
        } else {
          setData(null)
        }
      } catch (error) {
        console.log('OpenCritic fetch error:', error)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOpenCritic()
  }, [gameId, gameName])

  return { data, isLoading }
}

export interface FriendWhoPlayed {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  rating: number | null
  status: string
}

export function useFriendsWhoPlayed(gameId: number, userId: string | undefined) {
  const [friends, setFriends] = useState<FriendWhoPlayed[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!gameId || !userId) {
      setFriends([])
      setIsLoading(false)
      return
    }

    const fetchFriendsWhoPlayed = async () => {
      setIsLoading(true)
      try {
        const { data: following, error: followError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)

        if (followError) throw followError

        if (!following || following.length === 0) {
          setFriends([])
          setIsLoading(false)
          return
        }

        const followingIds = following.map((f) => f.following_id)

        const { data: logs, error: logsError } = await supabase
          .from('game_logs')
          .select(`
            status,
            rating,
            user_id,
            profiles!game_logs_user_id_fkey (id, username, display_name, avatar_url)
          `)
          .eq('game_id', gameId)
          .in('user_id', followingIds)

        if (logsError) throw logsError

        const friendsList: FriendWhoPlayed[] = (logs || []).map((log: any) => ({
          id: log.profiles.id,
          username: log.profiles.username,
          display_name: log.profiles.display_name,
          avatar_url: log.profiles.avatar_url,
          rating: log.rating,
          status: log.status,
        }))

        setFriends(friendsList)
      } catch (error) {
        console.log('Friends who played error:', error)
        setFriends([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFriendsWhoPlayed()
  }, [gameId, userId])

  return { friends, isLoading }
}

// Type for community activity item (recent reviews)
// viewerStatus reflects whether the currently signed-in user already has this
// game in their library. Pre-computed in the hook so every card doesn't need
// its own Supabase round-trip to render the Save button correctly.
export type ViewerLibraryStatus = 'want_to_play' | 'other' | null

export interface CommunityReview {
  id: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    isPremium: boolean
  }
  game: {
    id: number
    name: string
    cover_url: string | null
    screenshot_urls: string[] | null
  }
  rating: number | null
  review: string
  created_at: string
  likeCount: number
  commentCount: number
  isLiked: boolean
  viewerStatus: ViewerLibraryStatus
}

export function useCommunityReviews() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<CommunityReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Pool > output so guards below never starve the feed. 200 reviewed logs
      // is plenty of headroom for de-dup and per-user caps while still giving a
      // "latest" feel.
      const POOL_SIZE = 200
      // Drops "cool" / "nice" / single-emoji spam. Tune up if you want a
      // stricter quality floor.
      const MIN_REVIEW_LENGTH = 25
      // Cap per user to prevent one enthusiastic reviewer from flooding the
      // horizontal scroll with 20 entries in a single burst.
      const MAX_PER_USER = 2
      const OUTPUT_LIMIT = 20

      // TODO (moderation / hygiene — not implemented yet):
      //   - Admin-hide flag on game_logs for all-caps, slurs, or otherwise
      //     problematic text. Check it in the guards loop below.
      //   - Filter out reviews from users the viewer has blocked, once a
      //     blocks/mutes relationship exists.
      //   - Filter NSFW games via IGDB age_ratings when a content policy lands.
      //   - Skip games where cover_url AND screenshot_urls are both null —
      //     the card renders with a blank hero otherwise.
      //   - Reject rows where created_at > now() (bad-clock protection).
      //   - Decide whether to keep reviews of unreleased games
      //     (games_cache.first_release_date > now). Currently shown.
      const { data: logs, error: logsError } = await supabase
        .from('game_logs')
        .select(`
          id,
          rating,
          review,
          created_at,
          user_id,
          game_id,
          profiles!game_logs_user_id_fkey (id, username, display_name, avatar_url, subscription_tier, subscription_expires_at),
          games_cache!game_logs_game_id_fkey (id, name, cover_url, screenshot_urls)
        `)
        .not('review', 'is', null)
        .neq('review', '')
        .order('created_at', { ascending: false })
        .limit(POOL_SIZE)

      if (logsError) throw logsError

      // Single pass so we preserve the recency order the query returned.
      const seenGames = new Set<number>()
      const perUserCount = new Map<string, number>()
      const picked: any[] = []

      for (const log of logs || []) {
        if (!log.profiles || !log.games_cache) continue
        if (!log.review || log.review.trim().length < MIN_REVIEW_LENGTH) continue
        // Hide the viewer's own reviews — they already know what they wrote.
        if (user && log.user_id === user.id) continue
        // One review per game, most recent wins (first seen at this sort order).
        if (seenGames.has(log.game_id)) continue
        const userCount = perUserCount.get(log.user_id) || 0
        if (userCount >= MAX_PER_USER) continue

        picked.push(log)
        seenGames.add(log.game_id)
        perUserCount.set(log.user_id, userCount + 1)

        if (picked.length >= OUTPUT_LIMIT) break
      }

      const formattedReviews: CommunityReview[] = picked.map((log: any) => ({
        id: log.id,
        user: {
          id: log.profiles.id,
          username: log.profiles.username,
          display_name: log.profiles.display_name,
          avatar_url: log.profiles.avatar_url,
          isPremium: checkIsPremium(log.profiles.subscription_tier, log.profiles.subscription_expires_at),
        },
        game: {
          id: log.games_cache.id,
          name: log.games_cache.name,
          cover_url: log.games_cache.cover_url,
          screenshot_urls: log.games_cache.screenshot_urls || null,
        },
        rating: log.rating,
        review: log.review,
        created_at: log.created_at,
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        viewerStatus: null,
      }))

      // Backfill social counts so cards render correct initial state without
      // each card hitting the database on mount. Wrapped in try/catch in case
      // the social tables don't exist yet (matches GameReviews.tsx pattern).
      const reviewIds = formattedReviews.map(r => r.id)
      if (reviewIds.length > 0) {
        try {
          const { data: likeRows, error: likesError } = await supabase
            .from('review_likes')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          let likedByMe = new Set<string>()
          if (user && !likesError) {
            const { data: myLikes } = await supabase
              .from('review_likes')
              .select('game_log_id')
              .eq('user_id', user.id)
              .in('game_log_id', reviewIds)
            likedByMe = new Set((myLikes || []).map((l: any) => l.game_log_id))
          }

          const { data: commentRows, error: commentsError } = await supabase
            .from('review_comments')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          const likeCounts: Record<string, number> = {}
          const commentCounts: Record<string, number> = {}
          if (!likesError && likeRows) {
            likeRows.forEach((row: any) => {
              likeCounts[row.game_log_id] = (likeCounts[row.game_log_id] || 0) + 1
            })
          }
          if (!commentsError && commentRows) {
            commentRows.forEach((row: any) => {
              commentCounts[row.game_log_id] = (commentCounts[row.game_log_id] || 0) + 1
            })
          }

          formattedReviews.forEach(r => {
            r.likeCount = likeCounts[r.id] || 0
            r.commentCount = commentCounts[r.id] || 0
            r.isLiked = likedByMe.has(r.id)
          })
        } catch (socialError) {
          console.log('Community review social counts unavailable:', socialError)
        }

        // Batched viewer-library lookup — avoids each card making its own round
        // trip to decide whether to show Save / "already in library". Only needed
        // when a viewer is signed in; own-reviews are filtered out client-side.
        if (user) {
          try {
            const gameIds = Array.from(new Set(
              formattedReviews
                .filter(r => r.user.id !== user.id)
                .map(r => r.game.id)
            ))
            if (gameIds.length > 0) {
              const { data: viewerLogs } = await supabase
                .from('game_logs')
                .select('game_id, status')
                .eq('user_id', user.id)
                .in('game_id', gameIds)

              const statusByGame = new Map<number, ViewerLibraryStatus>()
              ;(viewerLogs || []).forEach((row: any) => {
                statusByGame.set(
                  row.game_id,
                  row.status === 'want_to_play' ? 'want_to_play' : 'other'
                )
              })
              formattedReviews.forEach(r => {
                if (r.user.id === user.id) return
                r.viewerStatus = statusByGame.get(r.game.id) ?? null
              })
            }
          } catch (statusError) {
            console.log('Viewer library status lookup failed:', statusError)
          }
        }
      }

      setReviews(formattedReviews)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch community reviews')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return { reviews, isLoading, error, refetch: fetchReviews }
}

export function useCommunityStats(gameId: number) {
  const [stats, setStats] = useState<CommunityStats>({ averageRating: null, totalLogs: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!gameId) {
      setStats({ averageRating: null, totalLogs: 0 })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('game_logs')
        .select('rating')
        .eq('game_id', gameId)
        .not('rating', 'is', null)

      if (error) throw error

      const ratings = (data || []).map((d: { rating: number }) => d.rating).filter((r): r is number => r !== null)
      const totalLogs = ratings.length

      if (totalLogs === 0) {
        setStats({ averageRating: null, totalLogs: 0 })
      } else {
        const sum = ratings.reduce((a, b) => a + b, 0)
        const average = Math.round((sum / totalLogs) * 10) / 10 // Round to 1 decimal
        setStats({ averageRating: average, totalLogs })
      }
    } catch (error) {
      console.log('Community stats error:', error)
      setStats({ averageRating: null, totalLogs: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, refetch: fetchStats }
}
