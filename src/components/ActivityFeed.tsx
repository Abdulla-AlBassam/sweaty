'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Gamepad2, Star, Users, Loader2 } from 'lucide-react'

interface ActivityItem {
  id: string
  status: string
  rating: number | null
  created_at: string
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  games_cache: {
    id: number
    name: string
    cover_url: string | null
  }
}

interface ActivityFeedProps {
  userId: string
}

export default function ActivityFeed({ userId }: ActivityFeedProps) {
  const supabase = createClient()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true)

      // First get who the user is following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (followingError) {
        console.error('Error fetching following:', followingError)
        setLoading(false)
        return
      }

      const followingIds = followingData?.map(f => f.following_id) || []
      setFollowingCount(followingIds.length)

      if (followingIds.length === 0) {
        setLoading(false)
        return
      }

      // Fetch recent game logs from followed users
      const { data: activityData, error: activityError } = await supabase
        .from('game_logs')
        .select(`
          id,
          status,
          rating,
          created_at,
          profiles (
            username,
            display_name,
            avatar_url
          ),
          games_cache (
            id,
            name,
            cover_url
          )
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(15)

      if (activityError) {
        console.error('Error fetching activity:', activityError)
      } else {
        setActivities((activityData || []) as ActivityItem[])
      }

      setLoading(false)
    }

    fetchActivity()
  }, [userId, supabase])

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'playing': return 'started playing'
      case 'completed': return 'completed'
      case 'played': return 'played'
      case 'want_to_play': return 'wants to play'
      case 'on_hold': return 'put on hold'
      case 'dropped': return 'dropped'
      default: return 'logged'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  // Not following anyone
  if (followingCount === 0) {
    return (
      <div className="rounded-xl bg-[var(--background-lighter)] p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-[var(--foreground-muted)]" />
        <p className="mt-4 text-[var(--foreground-muted)]">
          Follow some users to see their activity here!
        </p>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          Find users by browsing game reviews or searching for games.
        </p>
      </div>
    )
  }

  // Following people but no activity
  if (activities.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--background-lighter)] p-8 text-center">
        <Gamepad2 className="mx-auto h-12 w-12 text-[var(--foreground-muted)]" />
        <p className="mt-4 text-[var(--foreground-muted)]">
          No recent activity from people you follow
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 rounded-lg bg-[var(--background-lighter)] p-3 hover:bg-[var(--background-card)] transition-colors"
        >
          {/* User Avatar */}
          <Link
            href={`/profile/${activity.profiles.username}`}
            className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-card)]"
          >
            {activity.profiles.avatar_url ? (
              <Image
                src={activity.profiles.avatar_url}
                alt={activity.profiles.username}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-5 w-5 text-[var(--foreground-muted)]" />
              </div>
            )}
          </Link>

          {/* Activity Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <Link
                href={`/profile/${activity.profiles.username}`}
                className="font-medium hover:text-[var(--accent)] transition-colors"
              >
                {activity.profiles.display_name || activity.profiles.username}
              </Link>
              {' '}
              <span className="text-[var(--foreground-muted)]">
                {getStatusText(activity.status)}
              </span>
              {' '}
              <Link
                href={`/game/${activity.games_cache.id}`}
                className="font-medium hover:text-[var(--accent)] transition-colors"
              >
                {activity.games_cache.name}
              </Link>
              {activity.rating && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-yellow-400">
                  <Star className="h-3 w-3 fill-yellow-400" />
                  {activity.rating}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              {getRelativeTime(activity.created_at)}
            </p>
          </div>

          {/* Game Cover */}
          <Link
            href={`/game/${activity.games_cache.id}`}
            className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-[var(--background-card)]"
          >
            {activity.games_cache.cover_url ? (
              <Image
                src={activity.games_cache.cover_url}
                alt={activity.games_cache.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-4 w-4 text-[var(--foreground-muted)]" />
              </div>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}
