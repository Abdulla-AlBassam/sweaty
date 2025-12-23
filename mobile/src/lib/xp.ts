// XP and Level System for Sweaty
import { LevelInfo } from '../types'

// GAMER XP
const GAMER_XP_VALUES: Record<string, number> = {
  completed: 100,
  played: 50,
  playing: 25,
  on_hold: 25,
  dropped: 10,
  want_to_play: 0,
}

const GAMER_LEVEL_THRESHOLDS = [0, 100, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000]

const GAMER_RANK_NAMES = [
  'Rookie', 'Beginner', 'Casual', 'Gamer', 'Dedicated',
  'Hardcore', 'Veteran', 'Elite', 'Master', 'Legend', 'Mythic',
]

// SOCIAL XP
const SOCIAL_XP_VALUES = {
  review: 30,
  rating: 5,
  follower: 10,
}

const SOCIAL_LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000, 2000, 3500, 5500, 8000, 12000, 15000]

const SOCIAL_RANK_NAMES = [
  'Lurker', 'Newcomer', 'Contributor', 'Reviewer', 'Critic',
  'Voice', 'Influencer', 'Tastemaker', 'Authority', 'Icon', 'Legend',
]

interface GameLogForXP {
  status?: string
  rating?: number | null
  review?: string | null
}

export function calculateGamerXP(logs: GameLogForXP[]): number {
  return logs.reduce((total, log) => {
    const status = log.status || 'want_to_play'
    return total + (GAMER_XP_VALUES[status] || 0)
  }, 0)
}

export function getGamerLevel(xp: number): LevelInfo {
  let level = 0
  for (let i = GAMER_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= GAMER_LEVEL_THRESHOLDS[i]) {
      level = i
      break
    }
  }
  const currentThreshold = GAMER_LEVEL_THRESHOLDS[level]
  const nextThreshold = GAMER_LEVEL_THRESHOLDS[level + 1] || GAMER_LEVEL_THRESHOLDS[level]
  const xpInLevel = xp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const progress = level === 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return { level, rank: GAMER_RANK_NAMES[level], currentXP: xp, xpForNextLevel: nextThreshold, progress }
}

export function calculateSocialXP(logs: GameLogForXP[], followerCount: number): number {
  let xp = 0
  logs.forEach((log) => {
    if (log.review && log.review.trim().length > 0) {
      xp += SOCIAL_XP_VALUES.review
    } else if (log.rating !== null && log.rating !== undefined) {
      xp += SOCIAL_XP_VALUES.rating
    }
  })
  xp += followerCount * SOCIAL_XP_VALUES.follower
  return xp
}

export function getSocialLevel(xp: number): LevelInfo {
  let level = 0
  for (let i = SOCIAL_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= SOCIAL_LEVEL_THRESHOLDS[i]) {
      level = i
      break
    }
  }
  const currentThreshold = SOCIAL_LEVEL_THRESHOLDS[level]
  const nextThreshold = SOCIAL_LEVEL_THRESHOLDS[level + 1] || SOCIAL_LEVEL_THRESHOLDS[level]
  const xpInLevel = xp - currentThreshold
  const xpNeeded = nextThreshold - currentThreshold
  const progress = level === 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100)

  return { level, rank: SOCIAL_RANK_NAMES[level], currentXP: xp, xpForNextLevel: nextThreshold, progress }
}

export function getGamerBadgeColor(level: number): string {
  if (level >= 9) return '#FFD700'
  if (level >= 6) return '#8B5CF6'
  if (level >= 3) return '#00E054'
  return '#6B7280'
}

export function getSocialBadgeColor(level: number): string {
  if (level >= 9) return '#FFD700'
  if (level >= 6) return '#8B5CF6'
  if (level >= 3) return '#3B82F6'
  return '#6B7280'
}
