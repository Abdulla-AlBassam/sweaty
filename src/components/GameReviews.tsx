'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Star, User, MessageSquare } from 'lucide-react'

interface Review {
  id: string
  rating: number | null
  review: string
  created_at: string
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface GameReviewsProps {
  gameId: number
}

export default function GameReviews({ gameId }: GameReviewsProps) {
  const supabase = createClient()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      const { data, error } = await supabase
        .from('game_logs')
        .select(`
          id,
          rating,
          review,
          created_at,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('game_id', gameId)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching reviews:', error)
      } else {
        setReviews((data || []) as Review[])
      }
      setLoading(false)
    }

    fetchReviews()
  }, [gameId, supabase])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg bg-[var(--background-lighter)] p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--background-card)]" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-[var(--background-card)]" />
                <div className="h-3 w-16 rounded bg-[var(--background-card)]" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded bg-[var(--background-card)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--background-card)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg bg-[var(--background-lighter)] p-8 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-[var(--foreground-muted)]" />
        <p className="mt-4 text-[var(--foreground-muted)]">
          No reviews yet. Be the first to share your thoughts!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-lg bg-[var(--background-lighter)] p-6">
          {/* Header: User info and rating */}
          <div className="flex items-start justify-between gap-4">
            <Link
              href={`/profile/${review.profiles.username}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {/* Avatar */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-card)]">
                {review.profiles.avatar_url ? (
                  <Image
                    src={review.profiles.avatar_url}
                    alt={review.profiles.username}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-5 w-5 text-[var(--foreground-muted)]" />
                  </div>
                )}
              </div>
              {/* Name and date */}
              <div>
                <p className="font-medium">
                  {review.profiles.display_name || review.profiles.username}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  @{review.profiles.username} · {new Date(review.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </Link>

            {/* Rating */}
            {review.rating && (
              <div className="flex items-center gap-1 rounded-lg bg-[var(--background-card)] px-3 py-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{review.rating}</span>
              </div>
            )}
          </div>

          {/* Review text */}
          <p className="mt-4 whitespace-pre-wrap text-[var(--foreground-muted)] leading-relaxed">
            {review.review}
          </p>
        </div>
      ))}
    </div>
  )
}
