'use client'

import { getGamerBadgeColor, getSocialBadgeColor } from '@/lib/xp'

type BadgeColor = 'gray' | 'green' | 'blue' | 'purple' | 'gold'

interface LevelBadgeProps {
  level: number
  rank: string
  type: 'gamer' | 'social'
  size?: 'sm' | 'md' | 'lg'
}

export default function LevelBadge({ level, rank, type, size = 'md' }: LevelBadgeProps) {
  const color = (type === 'gamer' ? getGamerBadgeColor(level) : getSocialBadgeColor(level)) as BadgeColor

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  const colorClasses = {
    gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.3)]',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color]}`}
    >
      <span className="opacity-70">Lv.{level}</span>
      <span>{rank}</span>
    </span>
  )
}
