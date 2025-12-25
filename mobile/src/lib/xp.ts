// Unified XP and Level System for Sweaty
import { LevelInfo } from '../types'

// XP VALUES - All actions that grant XP
const XP_VALUES = {
  // Game status XP
  completed: 100,
  played: 50,
  playing: 25,
  on_hold: 25,
  dropped: 10,
  want_to_play: 0,
  // Engagement XP
  review: 30,
  rating: 5,
  follower: 10,
}

// 12 levels (0-11)
const LEVEL_THRESHOLDS = [0, 150, 500, 1200, 2500, 4500, 7000, 10000, 15000, 22000, 30000, 40000]

const RANK_NAMES = [
  'Newcomer',     // Level 0
  'Apprentice',   // Level 1
  'Player',       // Level 2
  'Skilled',      // Level 3
  'Veteran',      // Level 4
  'Expert',       // Level 5
  'Elite',        // Level 6
  'Champion',     // Level 7
  'Master',       // Level 8
  'Grandmaster',  // Level 9
  'Legend',       // Level 10
  'Sweat',        // Level 11
]

interface GameLogForXP {
  status?: string
  rating?: number | null
  review?: string | null
}

// Calculate total XP from game logs and follower count
export function calculateXP(logs: GameLogForXP[], followerCount: number = 0): number {
  let xp = 0

  logs.forEach((log) => {
    // Add XP for game status
    const status = log.status || 'want_to_play'
    xp += XP_VALUES[status as keyof typeof XP_VALUES] || 0

    // Add XP for review or rating (review takes priority)
    if (log.review && log.review.trim().length > 0) {
      xp += XP_VALUES.review
    } else if (log.rating !== null && log.rating !== undefined) {
      xp += XP_VALUES.rating
    }
  })

  // Add XP for followers
  xp += followerCount * XP_VALUES.follower

  return xp
}

// Get level info from XP
export function getLevel(xp: number): LevelInfo {
  let level = 0
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i
      break
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level]
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level]
  const xpInLevel = xp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const progress = level === 11 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return {
    level,
    rank: RANK_NAMES[level],
    currentXP: xp,
    xpForNextLevel: nextThreshold,
    progress,
  }
}

// Get badge color based on level (for future use)
export function getBadgeColor(level: number): string {
  if (level >= 10) return '#FFD700' // Gold for Legend/Sweat
  if (level >= 7) return '#8B5CF6'  // Purple for Champion+
  if (level >= 4) return '#22c55e'  // Green for Veteran+
  return '#6B7280'                   // Gray for lower levels
}

// Legacy exports for backwards compatibility during transition
export const calculateGamerXP = (logs: GameLogForXP[]) => calculateXP(logs, 0)
export const getGamerLevel = (xp: number) => getLevel(xp)
export const calculateSocialXP = (logs: GameLogForXP[], followers: number) => calculateXP(logs, followers)
export const getSocialLevel = (xp: number) => getLevel(xp)
export const getGamerBadgeColor = getBadgeColor
export const getSocialBadgeColor = getBadgeColor
