'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogGameModal from './LogGameModal'
import type { Game } from '@/lib/igdb'
import type { User } from '@supabase/supabase-js'

interface GameLog {
  id: string
  status: 'playing' | 'completed' | 'want_to_play' | 'on_hold' | 'dropped'
  rating: number | null
  platform: string | null
  completed_at: string | null
  review: string | null
}

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  playing: { label: 'Playing', icon: '🎮' },
  completed: { label: 'Completed', icon: '✅' },
  want_to_play: { label: 'Want to Play', icon: '📋' },
  on_hold: { label: 'On Hold', icon: '⏸️' },
  dropped: { label: 'Dropped', icon: '❌' },
}

interface GameLogButtonProps {
  game: Game
}

export default function GameLogButton({ game }: GameLogButtonProps) {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [existingLog, setExistingLog] = useState<GameLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check auth and fetch existing log
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Check if user has already logged this game
        const { data } = await supabase
          .from('game_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('game_id', game.id)
          .single()

        if (data) {
          setExistingLog(data as GameLog)
        }
      }

      setLoading(false)
    }

    init()
  }, [supabase, game.id])

  const handleClick = () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/game/${game.id}`)
      return
    }
    setIsModalOpen(true)
  }

  const handleSave = (log: GameLog) => {
    setExistingLog(log)
  }

  const handleDelete = () => {
    setExistingLog(null)
  }

  if (loading) {
    return (
      <div className="h-12 w-32 animate-pulse rounded-lg bg-[var(--background-card)]" />
    )
  }

  // User has logged this game - show their status
  if (existingLog) {
    const statusInfo = STATUS_LABELS[existingLog.status]

    return (
      <>
        <button
          onClick={handleClick}
          className="group flex items-center gap-3 rounded-lg bg-[var(--background-card)] px-6 py-3
                   border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
        >
          <span className="text-xl">{statusInfo.icon}</span>
          <div className="text-left">
            <p className="font-medium">{statusInfo.label}</p>
            {existingLog.rating && (
              <p className="text-sm text-[var(--foreground-muted)]">
                {'★'.repeat(Math.floor(existingLog.rating))}
                {existingLog.rating % 1 !== 0 && '½'} {existingLog.rating}/5
              </p>
            )}
          </div>
          <svg
            className="ml-2 h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--accent)] transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <LogGameModal
          game={game}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          existingLog={existingLog}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </>
    )
  }

  // User hasn't logged this game - show Log Game button
  return (
    <>
      <button
        onClick={handleClick}
        className="rounded-lg bg-[var(--accent)] px-8 py-3 font-semibold text-black
                 hover:bg-[var(--accent-hover)] transition-colors"
      >
        Log Game
      </button>

      {user && (
        <LogGameModal
          game={game}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          existingLog={null}
          onSave={handleSave}
        />
      )}
    </>
  )
}
