'use client'

import { getGamerBadgeColor, getSocialBadgeColor } from '@/lib/xp'

type BadgeColor = 'gray' | 'green' | 'blue' | 'purple' | 'gold'

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
  const color = (type === 'gamer' ? getGamerBadgeColor(level) : getSocialBadgeColor(level)) as BadgeColor
  const isMaxLevel = level === 10

  const barColors = {
    gray: 'bg-gray-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    gold: 'bg-gradient-to-r from-yellow-500 to-amber-400',
  }

  const textColors = {
    gray: 'text-gray-400',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    gold: 'text-yellow-400',
  }

  const typeLabel = type === 'gamer' ? '🎮 Gamer' : '💬 Social'

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--foreground-muted)]">{typeLabel}</span>
          <span className={`text-sm font-semibold ${textColors[color]}`}>
            Level {level} • {rank}
          </span>
        </div>
        <span className="text-xs text-[var(--foreground-muted)]">
          {isMaxLevel ? (
            <span className={textColors[color]}>MAX</span>
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
          className={`h-full rounded-full transition-all duration-500 ${barColors[color]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
