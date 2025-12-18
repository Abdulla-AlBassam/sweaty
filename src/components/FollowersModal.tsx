'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { X, User, UserPlus, UserMinus, Loader2, Users } from 'lucide-react'

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  profileId: string
  profileUsername: string
  type: 'followers' | 'following'
  currentUserId: string | null
}

export default function FollowersModal({
  isOpen,
  onClose,
  profileId,
  profileUsername,
  type,
  currentUserId,
}: FollowersModalProps) {
  const supabase = createClient()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function fetchUsers() {
      setLoading(true)

      if (type === 'followers') {
        // Get users who follow this profile
        const { data, error } = await supabase
          .from('follows')
          .select(`
            follower_id,
            profiles!follows_follower_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('following_id', profileId)

        if (!error && data) {
          const userList = data
            .map((row) => row.profiles as unknown as UserProfile)
            .filter((p): p is UserProfile => p !== null)
          setUsers(userList)
        }
      } else {
        // Get users this profile follows
        const { data, error } = await supabase
          .from('follows')
          .select(`
            following_id,
            profiles!follows_following_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('follower_id', profileId)

        if (!error && data) {
          const userList = data
            .map((row) => row.profiles as unknown as UserProfile)
            .filter((p): p is UserProfile => p !== null)
          setUsers(userList)
        }
      }

      // Get who the current user is following (to show correct button state)
      if (currentUserId) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)

        if (followingData) {
          setFollowingIds(new Set(followingData.map((f) => f.following_id)))
        }
      }

      setLoading(false)
    }

    fetchUsers()
  }, [isOpen, profileId, type, currentUserId, supabase])

  const handleFollow = async (userId: string) => {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/profile/${profileUsername}`
      return
    }

    setLoadingFollow(userId)

    if (followingIds.has(userId)) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId)

      if (!error) {
        setFollowingIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUserId,
          following_id: userId,
        })

      if (!error) {
        setFollowingIds((prev) => new Set(prev).add(userId))
      }
    }

    setLoadingFollow(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[80vh] mx-4 rounded-xl bg-[var(--background-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-semibold">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--background-lighter)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-[var(--foreground-muted)]" />
              <p className="mt-4 text-[var(--foreground-muted)]">
                {type === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--background-lighter)] transition-colors"
                >
                  {/* Avatar */}
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={onClose}
                    className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-lighter)]"
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-6 w-6 text-[var(--foreground-muted)]" />
                      </div>
                    )}
                  </Link>

                  {/* Name */}
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={onClose}
                    className="flex-1 min-w-0"
                  >
                    <p className="font-medium truncate">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-sm text-[var(--foreground-muted)] truncate">
                      @{user.username}
                    </p>
                  </Link>

                  {/* Follow button (don't show for self) */}
                  {currentUserId && user.id !== currentUserId && (
                    <button
                      onClick={() => handleFollow(user.id)}
                      disabled={loadingFollow === user.id}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        followingIds.has(user.id)
                          ? 'bg-[var(--background-lighter)] text-white hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]'
                      }`}
                    >
                      {loadingFollow === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : followingIds.has(user.id) ? (
                        <>
                          <UserMinus className="h-4 w-4" />
                          <span className="hidden sm:inline">Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
