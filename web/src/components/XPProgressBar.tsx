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
  const icon = type === 'gamer' ? '🎮' : '💬'

  return (
    <div className="space-y-3">
      {/* Top row: icon + rank info */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--background-card)] text-lg">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{rank}</span>
            <span className="text-xs text-[var(--foreground-muted)]">Lv. {level}</span>
          </div>
          <p className="text-xs text-[var(--foreground-muted)]">{typeLabel}</p>
        </div>
        <div className="text-right">
          {isMaxLevel ? (
            <span className="text-xs font-semibold text-[var(--accent)]">MAX LEVEL</span>
          ) : (
            <span className="text-xs text-[var(--foreground-muted)]">
              {currentXP.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-card)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-[var(--accent)]"
          style={{ width: `${isMaxLevel ? 100 : progress}%` }}
        />
      </div>
    </div>
  )
}
