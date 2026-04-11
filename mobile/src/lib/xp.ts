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

// 16 levels (0-15)
const LEVEL_THRESHOLDS = [0, 50, 150, 400, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000, 25000, 35000, 50000, 60000]

const RANK_NAMES = [
  'Newcomer',      // Level 0
  'Apprentice',    // Level 1
  'Player',        // Level 2
  'Regular',       // Level 3
  'Dedicated',     // Level 4
  'Skilled',       // Level 5
  'Veteran',       // Level 6
  'Expert',        // Level 7
  'Elite',         // Level 8
  'Champion',      // Level 9
  'Master',        // Level 10
  'Grandmaster',   // Level 11
  'Legend',         // Level 12
  'Icon',          // Level 13
  'Mythic',        // Level 14
  'Sweat',         // Level 15
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
  const progress = level === 15 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return {
    level,
    rank: RANK_NAMES[level],
    currentXP: xp,
    xpForNextLevel: nextThreshold,
    progress,
  }
}

// Get badge/ring color based on level
export function getBadgeColor(level: number): string {
  if (level >= 15) return '#C0C8D0' // Silver for Sweat (brand colour)
  if (level >= 13) return '#C0C8D0' // Silver for Icon/Mythic
  if (level >= 10) return '#A0A8B0' // Muted silver for Master+
  if (level >= 7) return '#8A9098'  // Darker silver for Expert+
  if (level >= 4) return '#6B7280'  // Warm gray for Dedicated+
  return '#4B5563'                   // Dark gray for lower levels
}

// Legacy exports for backwards compatibility
export const calculateGamerXP = (logs: GameLogForXP[]) => calculateXP(logs, 0)
export const getGamerLevel = (xp: number) => getLevel(xp)
export const calculateSocialXP = (logs: GameLogForXP[], followers: number) => calculateXP(logs, followers)
export const getSocialLevel = (xp: number) => getLevel(xp)
export const getGamerBadgeColor = getBadgeColor
export const getSocialBadgeColor = getBadgeColor
