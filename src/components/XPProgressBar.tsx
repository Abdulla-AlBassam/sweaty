'use client'

interface XPProgressBarProps {
  currentXP: number
  xpForNextLevel: number
  progress: number
  level: number
  rank: string
  type: 'gamer' | 'social'
}

export default function XPProgressBar({
  currentXP,
  xpForNextLevel,
  progress,
  level,
  rank,
  type,
}: XPProgressBarProps) {
  const isMaxLevel = level === 10
  const typeLabel = type === 'gamer' ? 'Gamer' : 'Social'

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-400">
          {typeLabel} Level {level} • {rank}
        </span>
        <span className="text-xs text-[var(--foreground-muted)]">
          {isMaxLevel ? (
            <span className="text-[var(--accent)]">MAX</span>
          ) : (
            <>
              {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
            </>
          )}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background-card)]">
        <div
          className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
