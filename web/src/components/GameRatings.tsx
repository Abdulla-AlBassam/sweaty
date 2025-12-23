'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'

interface GameRatingsProps {
  gameId: number
}

export default function GameRatings({ gameId }: GameRatingsProps) {
  const supabase = createClient()
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRatings() {
      const { data, error } = await supabase
        .from('game_logs')
        .select('rating')
        .eq('game_id', gameId)
        .not('rating', 'is', null)

      if (error) {
        console.error('Error fetching ratings:', error)
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        const ratings = data.map(d => d.rating as number)
        const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        setAvgRating(Math.round(avg * 10) / 10)
        setRatingCount(ratings.length)
      }
      setLoading(false)
    }

    fetchRatings()
  }, [gameId, supabase])

  if (loading) {
    return (
      <div className="rounded-lg bg-[var(--background-lighter)] p-6 animate-pulse">
        <div className="h-5 w-20 rounded bg-[var(--background-card)]" />
        <div className="mt-3 h-8 w-32 rounded bg-[var(--background-card)]" />
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-[var(--background-lighter)] p-6">
      <h3 className="font-semibold">Ratings</h3>
      {avgRating !== null ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            <span className="text-2xl font-bold">{avgRating}</span>
            <span className="text-[var(--foreground-muted)]">/ 5</span>
          </div>
          <span className="text-sm text-[var(--foreground-muted)]">
            ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[var(--foreground-muted)]">
          No ratings yet. Be the first to rate this game!
        </p>
      )}
    </div>
  )
}
