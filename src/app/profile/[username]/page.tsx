'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Calendar, Gamepad2, Star, Pencil, MessageSquare, Heart, UserPlus, UserMinus, Loader2, ImageIcon } from 'lucide-react'
import LogGameModal from '@/components/LogGameModal'
import EditFavoritesModal from '@/components/EditFavoritesModal'
import FollowersModal from '@/components/FollowersModal'
import PosterSelectModal from '@/components/PosterSelectModal'
import { ProfileHeaderSkeleton, GameCardSkeleton } from '@/components/Skeleton'
import XPProgressBar from '@/components/XPProgressBar'
import { calculateGamerXP, calculateSocialXP, getGamerLevel, getSocialLevel } from '@/lib/xp'
import type { Game } from '@/lib/igdb'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  favorite_games: number[] | null
  created_at: string
  is_premium: boolean
}

interface FavoriteGameData {
  id: number
  name: string
  cover_url: string | null
}

interface GameLog {
  id: string
  game_id: number
  status: string
  rating: number | null
  platform: string | null
  completed_at: string | null
  review: string | null
  cover_variant: number | null
  created_at: string
  games_cache: {
    id: number
    name: string
    cover_url: string | null
    slug: string | null
    summary?: string | null
    first_release_date?: string | null
    genres?: string[]
    platforms?: string[]
    artwork_urls?: string[]
  } | null
}

interface Stats {
  total: number
  playing: number
  completed: number
  played: number
  want_to_play: number
  on_hold: number
  dropped: number
  avgRating: number | null
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'played', label: 'Played' },
  { value: 'want_to_play', label: 'Want to Play' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
] as const

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [gameLogs, setGameLogs] = useState<GameLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingLog, setEditingLog] = useState<GameLog | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [favoriteGames, setFavoriteGames] = useState<FavoriteGameData[]>([])
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers')
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [posterSelectLog, setPosterSelectLog] = useState<GameLog | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      setError(null)

      // Get current user to check if viewing own profile
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      // Fetch profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError || !profileData) {
        setError('User not found')
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Fetch game logs with cached game data
      const { data: logsData, error: logsError } = await supabase
        .from('game_logs')
        .select(`
          id,
          game_id,
          status,
          rating,
          platform,
          completed_at,
          review,
          cover_variant,
          created_at,
          games_cache (
            id,
            name,
            cover_url,
            slug,
            summary,
            first_release_date,
            genres,
            platforms,
            artwork_urls
          )
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (logsError) {
        console.error('Error fetching game logs:', logsError)
      }

      const logs = (logsData || []) as unknown as GameLog[]
      setGameLogs(logs)

      // Calculate stats
      const statsCalc: Stats = {
        total: logs.length,
        playing: logs.filter(l => l.status === 'playing').length,
        completed: logs.filter(l => l.status === 'completed').length,
        played: logs.filter(l => l.status === 'played').length,
        want_to_play: logs.filter(l => l.status === 'want_to_play').length,
        on_hold: logs.filter(l => l.status === 'on_hold').length,
        dropped: logs.filter(l => l.status === 'dropped').length,
        avgRating: null,
      }

      const ratedGames = logs.filter(l => l.rating !== null)
      if (ratedGames.length > 0) {
        const sum = ratedGames.reduce((acc, l) => acc + (l.rating || 0), 0)
        statsCalc.avgRating = Math.round((sum / ratedGames.length) * 10) / 10
      }

      setStats(statsCalc)

      // Build favorites - always fetch directly from games_cache for reliability
      if (profileData.favorite_games && profileData.favorite_games.length > 0) {
        const { data: favoriteGamesData, error: favError } = await supabase
          .from('games_cache')
          .select('id, name, cover_url')
          .in('id', profileData.favorite_games)

        if (favError) {
          console.error('Error fetching favorite games:', favError)
        }

        console.log('Favorite games from DB:', favoriteGamesData)

        if (favoriteGamesData && favoriteGamesData.length > 0) {
          // Sort to match the order of favorite_games array
          const orderedFavs = profileData.favorite_games
            .map((favId: number) => {
              const game = favoriteGamesData.find(g => String(g.id) === String(favId))
              return game ? {
                id: Number(game.id),
                name: game.name,
                cover_url: game.cover_url,
              } : null
            })
            .filter((g: FavoriteGameData | null): g is FavoriteGameData => g !== null)

          setFavoriteGames(orderedFavs)
        } else {
          setFavoriteGames([])
        }
      } else {
        setFavoriteGames([])
      }

      // Fetch follower and following counts, and check if current user follows this profile
      const [{ count: followers }, { count: following }, followCheck] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),
        user ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single() : Promise.resolve({ data: null }),
      ])

      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
      setIsFollowing(!!followCheck.data)

      setLoading(false)
    }

    fetchProfile()
  }, [username, supabase])

  // Filter games based on active filter
  const filteredLogs = activeFilter === 'all'
    ? gameLogs
    : gameLogs.filter(log => log.status === activeFilter)

  // Check if viewing own profile
  const isOwnProfile = currentUserId && profile?.id === currentUserId

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUserId) {
      // Redirect to login if not logged in
      window.location.href = `/login?redirect=/profile/${username}`
      return
    }

    if (!profile) return

    setFollowLoading(true)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)

      if (!error) {
        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: profile.id,
        })

      if (!error) {
        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    }

    setFollowLoading(false)
  }

  // Handle clicking on a game card
  const handleGameClick = (log: GameLog, e: React.MouseEvent) => {
    if (isOwnProfile) {
      e.preventDefault()
      setEditingLog(log)
      setShowEditModal(true)
    }
  }

  // Convert GameLog to Game format for the modal
  const getGameFromLog = (log: GameLog): Game | null => {
    if (!log.games_cache) return null
    return {
      id: log.games_cache.id,
      name: log.games_cache.name,
      slug: log.games_cache.slug || null,
      coverUrl: log.games_cache.cover_url || null,
      summary: log.games_cache.summary || null,
      firstReleaseDate: log.games_cache.first_release_date || null,
      genres: log.games_cache.genres || [],
      platforms: log.games_cache.platforms || [],
      rating: null,
    }
  }

  // Handle save from edit modal
  const handleSaveLog = (updatedLog: { id?: string; status: string; rating: number | null; platform: string | null; completed_at: string | null; review: string | null }) => {
    if (editingLog) {
      setGameLogs(prev => prev.map(log =>
        log.id === editingLog.id
          ? { ...log, status: updatedLog.status, rating: updatedLog.rating, platform: updatedLog.platform, completed_at: updatedLog.completed_at, review: updatedLog.review }
          : log
      ))
      // Recalculate stats
      const updatedLogs = gameLogs.map(log =>
        log.id === editingLog.id
          ? { ...log, status: updatedLog.status, rating: updatedLog.rating }
          : log
      )
      recalculateStats(updatedLogs)
    }
    setShowEditModal(false)
    setEditingLog(null)
  }

  // Handle delete from edit modal
  const handleDeleteLog = () => {
    if (editingLog) {
      const updatedLogs = gameLogs.filter(log => log.id !== editingLog.id)
      setGameLogs(updatedLogs)
      recalculateStats(updatedLogs)
    }
    setShowEditModal(false)
    setEditingLog(null)
  }

  // Handle favorites save
  const handleFavoritesSave = async (newFavorites: number[]) => {
    // Update local profile state
    if (profile) {
      setProfile({ ...profile, favorite_games: newFavorites })
    }

    // Refresh game logs in case a new game was logged
    const { data: logsData } = await supabase
      .from('game_logs')
      .select(`
        id,
        game_id,
        status,
        rating,
        platform,
        completed_at,
        review,
        cover_variant,
        created_at,
        games_cache (
          id,
          name,
          cover_url,
          slug,
          summary,
          first_release_date,
          genres,
          platforms,
          artwork_urls
        )
      `)
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })

    if (logsData) {
      const logs = logsData as unknown as GameLog[]
      setGameLogs(logs)
      recalculateStats(logs)

      // Build favorites - fetch directly from games_cache
      if (newFavorites.length > 0) {
        const { data: favoriteGamesData } = await supabase
          .from('games_cache')
          .select('id, name, cover_url')
          .in('id', newFavorites)

        if (favoriteGamesData && favoriteGamesData.length > 0) {
          const orderedFavs = newFavorites
            .map(favId => {
              const game = favoriteGamesData.find(g => String(g.id) === String(favId))
              return game ? {
                id: Number(game.id),
                name: game.name,
                cover_url: game.cover_url,
              } : null
            })
            .filter((g): g is FavoriteGameData => g !== null)

          setFavoriteGames(orderedFavs)
        } else {
          setFavoriteGames([])
        }
      } else {
        setFavoriteGames([])
      }
    }
  }

  // Recalculate stats helper
  const recalculateStats = (logs: GameLog[]) => {
    const newStats: Stats = {
      total: logs.length,
      playing: logs.filter(l => l.status === 'playing').length,
      completed: logs.filter(l => l.status === 'completed').length,
      played: logs.filter(l => l.status === 'played').length,
      want_to_play: logs.filter(l => l.status === 'want_to_play').length,
      on_hold: logs.filter(l => l.status === 'on_hold').length,
      dropped: logs.filter(l => l.status === 'dropped').length,
      avgRating: null,
    }
    const ratedGames = logs.filter(l => l.rating !== null)
    if (ratedGames.length > 0) {
      const sum = ratedGames.reduce((acc, l) => acc + (l.rating || 0), 0)
      newStats.avgRating = Math.round((sum / ratedGames.length) * 10) / 10
    }
    setStats(newStats)
  }

  // Get display cover URL based on cover_variant
  const getDisplayCoverUrl = (log: GameLog): string | null => {
    if (log.cover_variant !== null && log.games_cache?.artwork_urls && log.games_cache.artwork_urls[log.cover_variant]) {
      return log.games_cache.artwork_urls[log.cover_variant]
    }
    return log.games_cache?.cover_url || null
  }

  // Handle poster selection
  const handlePosterSelect = (log: GameLog, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPosterSelectLog(log)
    setShowPosterModal(true)
  }

  // Handle poster save
  const handlePosterSave = (variant: number | null) => {
    if (posterSelectLog) {
      setGameLogs(prev => prev.map(log =>
        log.id === posterSelectLog.id
          ? { ...log, cover_variant: variant }
          : log
      ))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProfileHeaderSkeleton />
        {/* Filter tabs skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-[var(--background-lighter)]" />
          ))}
        </div>
        {/* Game grid skeleton */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {[...Array(14)].map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-xl text-[var(--foreground-muted)]">{error || 'User not found'}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-lighter)]">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-16 w-16 text-[var(--foreground-muted)]" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-[var(--foreground-muted)]">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-3 max-w-xl text-[var(--foreground-muted)]">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--foreground-muted)] sm:justify-start">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                setFollowersModalType('followers')
                setShowFollowersModal(true)
              }}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span className="font-semibold text-white">{followerCount}</span> Followers
            </button>
            <button
              onClick={() => {
                setFollowersModalType('following')
                setShowFollowersModal(true)
              }}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span className="font-semibold text-white">{followingCount}</span> Following
            </button>
          </div>

          {/* Follow/Unfollow Button - only show on other users' profiles */}
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isFollowing
                  ? 'bg-[var(--background-lighter)] text-white hover:bg-red-500/20 hover:text-red-400 group'
                  : 'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]'
              }`}
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 hidden group-hover:block" />
                  <UserPlus className="h-4 w-4 group-hover:hidden" />
                  <span className="group-hover:hidden">Following</span>
                  <span className="hidden group-hover:inline">Unfollow</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 rounded-xl bg-[var(--background-lighter)] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--accent)]">{stats.total}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Games</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.playing}</p>
              <p className="text-xs text-[var(--foreground-muted)]">Playing</p>
            </div>
            {stats.avgRating && (
              <div className="col-span-3 text-center sm:col-span-2 lg:col-span-3">
                <p className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-400">
                  <Star className="h-5 w-5 fill-yellow-400" />
                  {stats.avgRating}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Avg Rating</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* XP & Ranks Section */}
      {gameLogs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-[var(--accent)]" />
            Ranks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--background-lighter)]">
            {/* Gamer XP */}
            {(() => {
              const gamerXP = calculateGamerXP(gameLogs)
              const gamerLevel = getGamerLevel(gamerXP)
              return (
                <XPProgressBar
                  currentXP={gamerLevel.currentXP}
                  xpForNextLevel={gamerLevel.xpForNextLevel}
                  progress={gamerLevel.progress}
                  level={gamerLevel.level}
                  rank={gamerLevel.rank}
                  type="gamer"
                />
              )
            })()}
            {/* Social XP */}
            {(() => {
              const socialXP = calculateSocialXP(gameLogs, followerCount)
              const socialLevel = getSocialLevel(socialXP)
              return (
                <XPProgressBar
                  currentXP={socialLevel.currentXP}
                  xpForNextLevel={socialLevel.xpForNextLevel}
                  progress={socialLevel.progress}
                  level={socialLevel.level}
                  rank={socialLevel.rank}
                  type="social"
                />
              )
            })()}
          </div>
        </div>
      )}

      {/* Favorite Games Section */}
      {(favoriteGames.length > 0 || isOwnProfile) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-[var(--accent)]" />
              Favorite Games
            </h2>
            {isOwnProfile && (
              <button
                onClick={() => setShowFavoritesModal(true)}
                className="flex items-center gap-1 text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[0, 1, 2].map((index) => {
              const game = favoriteGames[index]
              return (
                <div key={index} className="relative aspect-[3/4]">
                  {game ? (
                    <Link
                      href={`/game/${game.id}`}
                      className="group relative block h-full w-full overflow-hidden rounded-lg ring-2 ring-[var(--accent)]/50 hover:ring-[var(--accent)] transition-all bg-[var(--background-lighter)]"
                    >
                      {game.cover_url ? (
                        <Image
                          src={game.cover_url}
                          alt={game.name}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Gamepad2 className="h-8 w-8 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                      {/* Game name on hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium truncate">{game.name}</p>
                      </div>
                    </Link>
                  ) : isOwnProfile ? (
                    <button
                      onClick={() => setShowFavoritesModal(true)}
                      className="h-full w-full rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--background-lighter)] flex items-center justify-center hover:border-[var(--accent)]/50 transition-colors"
                    >
                      <Gamepad2 className="h-8 w-8 text-[var(--foreground-muted)]" />
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const count = filter.value === 'all'
            ? stats?.total || 0
            : stats?.[filter.value as keyof Stats] || 0

          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === filter.value
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-[var(--background-lighter)] text-[var(--foreground-muted)] hover:bg-[var(--background-card)]'
              }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Game Library Grid */}
      {filteredLogs.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {filteredLogs.map((log) => (
            <Link
              key={log.id}
              href={`/game/${log.game_id}`}
              onClick={(e) => handleGameClick(log, e)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--background-lighter)] transition-transform hover:scale-105 ${
                isOwnProfile ? 'cursor-pointer' : ''
              }`}
            >
              {getDisplayCoverUrl(log) ? (
                <Image
                  src={getDisplayCoverUrl(log)!}
                  alt={log.games_cache?.name || 'Game cover'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 14vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-8 w-8 text-[var(--foreground-muted)]" />
                </div>
              )}

              {/* Poster selection button - only on own profile with artworks */}
              {isOwnProfile && log.games_cache?.artwork_urls && log.games_cache.artwork_urls.length > 0 && (
                <button
                  onClick={(e) => handlePosterSelect(log, e)}
                  className="absolute top-1 left-1 rounded bg-black/70 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 z-10"
                  title={profile?.is_premium ? 'Change poster' : 'Premium feature'}
                >
                  <ImageIcon className="h-3 w-3 text-white" />
                </button>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium">
                    {log.games_cache?.name || 'Unknown Game'}
                  </p>
                  {log.rating && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-yellow-400">
                      <Star className="h-3 w-3 fill-yellow-400" />
                      {log.rating}
                    </p>
                  )}
                  {/* Edit hint for own profile */}
                  {isOwnProfile && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--accent)]">
                      <Pencil className="h-3 w-3" />
                      Click to edit
                    </p>
                  )}
                </div>
              </div>

              {/* Badges (Rating and Review) */}
              <div className="absolute right-1 top-1 flex flex-col gap-1">
                {log.rating && (
                  <div className="flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-yellow-400">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {log.rating}
                  </div>
                )}
                {log.review && (
                  <div className="flex items-center justify-center rounded bg-black/70 p-1" title="Has review">
                    <MessageSquare className="h-3 w-3 text-[var(--accent)]" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-[var(--background-lighter)] py-16">
          <Gamepad2 className="h-12 w-12 text-[var(--foreground-muted)]" />
          <p className="mt-4 text-[var(--foreground-muted)]">
            {activeFilter === 'all'
              ? 'No games logged yet'
              : `No ${STATUS_FILTERS.find(f => f.value === activeFilter)?.label.toLowerCase()} games`}
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingLog && getGameFromLog(editingLog) && (
        <LogGameModal
          game={getGameFromLog(editingLog)!}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingLog(null)
          }}
          existingLog={{
            id: editingLog.id,
            status: editingLog.status as 'playing' | 'completed' | 'played' | 'want_to_play' | 'on_hold' | 'dropped',
            rating: editingLog.rating,
            platform: editingLog.platform,
            completed_at: editingLog.completed_at,
            review: editingLog.review,
          }}
          onSave={handleSaveLog}
          onDelete={handleDeleteLog}
        />
      )}

      {/* Edit Favorites Modal */}
      {isOwnProfile && (
        <EditFavoritesModal
          isOpen={showFavoritesModal}
          onClose={() => setShowFavoritesModal(false)}
          currentFavorites={profile?.favorite_games || []}
          userGameLogs={gameLogs}
          onSave={handleFavoritesSave}
        />
      )}

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        profileId={profile?.id || ''}
        profileUsername={username}
        type={followersModalType}
        currentUserId={currentUserId}
      />

      {/* Poster Selection Modal */}
      {posterSelectLog && (
        <PosterSelectModal
          isOpen={showPosterModal}
          onClose={() => {
            setShowPosterModal(false)
            setPosterSelectLog(null)
          }}
          gameLogId={posterSelectLog.id}
          gameName={posterSelectLog.games_cache?.name || 'Game'}
          defaultCoverUrl={posterSelectLog.games_cache?.cover_url || null}
          artworkUrls={posterSelectLog.games_cache?.artwork_urls || []}
          currentVariant={posterSelectLog.cover_variant}
          onSelect={handlePosterSave}
          isPremium={profile?.is_premium || false}
        />
      )}
    </div>
  )
}
