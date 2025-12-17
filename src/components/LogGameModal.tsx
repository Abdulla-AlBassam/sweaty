'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Star, X } from 'lucide-react'
import type { Game } from '@/lib/igdb'

// Game log status options
const STATUS_OPTIONS = [
  { value: 'playing', label: 'Playing', icon: '🎮' },
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'want_to_play', label: 'Want to Play', icon: '📋' },
  { value: 'on_hold', label: 'On Hold', icon: '⏸️' },
  { value: 'dropped', label: 'Dropped', icon: '❌' },
] as const

// Platform options
const PLATFORM_OPTIONS = [
  'PC',
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X|S',
  'Xbox One',
  'Nintendo Switch',
  'Steam Deck',
  'Mobile',
  'Other',
]

type Status = typeof STATUS_OPTIONS[number]['value']

interface GameLog {
  id?: string
  status: Status
  rating: number | null
  platform: string | null
  completed_at: string | null
  review: string | null
}

interface LogGameModalProps {
  game: Game
  isOpen: boolean
  onClose: () => void
  existingLog?: GameLog | null
  onSave: (log: GameLog) => void
  onDelete?: () => void
}

export default function LogGameModal({
  game,
  isOpen,
  onClose,
  existingLog,
  onSave,
  onDelete,
}: LogGameModalProps) {
  const supabase = createClient()

  const [status, setStatus] = useState<Status>('playing')
  const [rating, setRating] = useState<number | null>(null)
  const [platform, setPlatform] = useState<string>('')
  const [completedAt, setCompletedAt] = useState<string>('')
  const [review, setReview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing log data when modal opens
  useEffect(() => {
    if (existingLog) {
      setStatus(existingLog.status)
      setRating(existingLog.rating)
      setPlatform(existingLog.platform || '')
      setCompletedAt(existingLog.completed_at || '')
      setReview(existingLog.review || '')
    } else {
      // Reset form for new log
      setStatus('playing')
      setRating(null)
      setPlatform('')
      setCompletedAt('')
      setReview('')
    }
    setError(null)
  }, [existingLog, isOpen])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to log games')
        return
      }

      // First, ensure game is cached in games_cache
      // Convert firstReleaseDate to ISO string if it exists
      const releaseDate = game.firstReleaseDate
        ? new Date(game.firstReleaseDate).toISOString()
        : null

      const cacheData = {
        id: game.id,
        name: game.name,
        slug: game.slug,
        summary: game.summary || null,
        cover_url: game.coverUrl || null,
        first_release_date: releaseDate,
        genres: game.genres || [],
        platforms: game.platforms || [],
        rating: game.rating || null,
        cached_at: new Date().toISOString(),
      }

      const { error: cacheError } = await supabase
        .from('games_cache')
        .upsert(cacheData, {
          onConflict: 'id',
        })

      if (cacheError) {
        console.error('Cache error details:', {
          message: cacheError.message,
          details: cacheError.details,
          hint: cacheError.hint,
          code: cacheError.code,
        })
        console.error('Cache data being sent:', cacheData)
        // RLS policy might be blocking insert - this is likely a permissions issue
        // Check if RLS policy for games_cache allows authenticated users to insert
        console.warn('Cache insert failed - this may be an RLS policy issue. Continuing anyway...')
      }

      // Prepare log data
      const logData = {
        user_id: user.id,
        game_id: game.id,
        status,
        rating,
        platform: platform || null,
        completed_at: status === 'completed' && completedAt ? completedAt : null,
        review: review.trim() || null,
      }

      // Upsert game log
      const { data, error: logError } = await supabase
        .from('game_logs')
        .upsert(logData, {
          onConflict: 'user_id,game_id',
        })
        .select()
        .single()

      if (logError) {
        console.error('Log error:', logError)
        setError(logError.message)
        return
      }

      onSave({
        id: data.id,
        status: data.status,
        rating: data.rating,
        platform: data.platform,
        completed_at: data.completed_at,
        review: data.review,
      })
      toast.success(existingLog ? 'Game log updated!' : 'Game added to library!')
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save. Please try again.')
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingLog?.id || !confirm('Remove this game from your library?')) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('game_logs')
        .delete()
        .eq('id', existingLog.id)

      if (error) {
        toast.error(error.message)
        setError(error.message)
        return
      }

      onDelete?.()
      toast.success('Game removed from library')
      onClose()
    } catch (err) {
      toast.error('Failed to remove. Please try again.')
      setError('Failed to remove. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Hover state for star rating
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  // Star rating component with proper hover feedback
  const StarRating = () => {
    const displayRating = hoverRating ?? rating ?? 0

    return (
      <div className="flex items-center gap-1">
        <div
          className="flex"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const leftHalfValue = starIndex - 0.5
            const rightHalfValue = starIndex
            const leftFilled = displayRating >= leftHalfValue
            const rightFilled = displayRating >= rightHalfValue

            return (
              <div key={starIndex} className="relative w-10 h-10 sm:w-8 sm:h-8 cursor-pointer">
                {/* Left half (for half-star) */}
                <div
                  className="absolute inset-0 w-1/2 overflow-hidden z-10"
                  onMouseEnter={() => setHoverRating(leftHalfValue)}
                  onClick={() => setRating(rating === leftHalfValue ? null : leftHalfValue)}
                >
                  <Star
                    className={`w-10 h-10 sm:w-8 sm:h-8 transition-all duration-150 ${
                      leftFilled
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-transparent text-[var(--border)]'
                    }`}
                  />
                </div>
                {/* Right half (for full star) */}
                <div
                  className="absolute inset-0 left-1/2 w-1/2 overflow-hidden z-10"
                  onMouseEnter={() => setHoverRating(rightHalfValue)}
                  onClick={() => setRating(rating === rightHalfValue ? null : rightHalfValue)}
                >
                  <Star
                    className={`w-10 h-10 sm:w-8 sm:h-8 -ml-5 sm:-ml-4 transition-all duration-150 ${
                      rightFilled
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-transparent text-[var(--border)]'
                    }`}
                  />
                </div>
                {/* Visual star (non-interactive) */}
                <Star
                  className={`w-10 h-10 sm:w-8 sm:h-8 transition-all duration-150 pointer-events-none ${
                    rightFilled
                      ? 'fill-yellow-400 text-yellow-400'
                      : leftFilled
                      ? 'text-yellow-400'
                      : 'fill-transparent text-[var(--border)]'
                  }`}
                  style={
                    leftFilled && !rightFilled
                      ? {
                          background: 'linear-gradient(90deg, #facc15 50%, transparent 50%)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                        }
                      : undefined
                  }
                  fill={
                    rightFilled
                      ? '#facc15'
                      : leftFilled
                      ? 'url(#half-star-gradient)'
                      : 'transparent'
                  }
                />
              </div>
            )
          })}
        </div>
        {/* Rating number display */}
        <span className="ml-3 text-sm text-[var(--foreground-muted)] min-w-[50px]">
          {rating ? `${rating} / 5` : hoverRating ? `${hoverRating} / 5` : ''}
        </span>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - slides up from bottom on mobile, centered on desktop */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-[var(--background-lighter)] shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-xl font-bold">
            {existingLog ? 'Edit Log' : 'Log Game'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--background-card)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Game Info */}
        <div className="border-b border-[var(--border)] px-6 py-4">
          <p className="font-medium">{game.name}</p>
          {game.firstReleaseDate && (
            <p className="text-sm text-[var(--foreground-muted)]">
              {new Date(game.firstReleaseDate).getFullYear()}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="space-y-6 px-6 py-6">
          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-3">Status *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    status === option.value
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--background-card)] hover:bg-[var(--border)]'
                  }`}
                >
                  <span>{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Rating <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <StarRating />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Platform <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg bg-[var(--background-card)] px-4 py-3 border border-[var(--border)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Select platform...</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Completed Date - Only show for "completed" status */}
          {status === 'completed' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Date Completed <span className="text-[var(--foreground-muted)]">(optional)</span>
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="w-full rounded-lg bg-[var(--background-card)] px-4 py-3 border border-[var(--border)]
                         focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
          )}

          {/* Review */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Review <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 2000))}
              placeholder="Share your thoughts on this game..."
              rows={4}
              className="w-full rounded-lg bg-[var(--background-card)] px-4 py-3 border border-[var(--border)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)] text-right">
              {review.length}/2000
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <div>
            {existingLog && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Remove from library
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm hover:bg-[var(--background-card)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-black
                       hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
