// XP and Level System for Sweaty

// === GAMER XP ===
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
  'Rookie',
  'Beginner',
  'Casual',
  'Gamer',
  'Dedicated',
  'Hardcore',
  'Veteran',
  'Elite',
  'Master',
  'Legend',
  'Mythic',
]

// === SOCIAL XP ===
const SOCIAL_XP_VALUES = {
  review: 30, // non-empty review field
  rating: 5, // rating given without review
  follower: 10, // per follower
}

const SOCIAL_LEVEL_THRESHOLDS = [0, 50, 200, 500, 1000, 2000, 3500, 5500, 8000, 12000, 15000]

const SOCIAL_RANK_NAMES = [
  'Lurker',
  'Newcomer',
  'Contributor',
  'Reviewer',
  'Critic',
  'Voice',
  'Influencer',
  'Tastemaker',
  'Authority',
  'Icon',
  'Legend',
]

// === TYPES ===
interface GameLog {
  status?: string
  rating?: number | null
  review?: string | null
}

interface LevelInfo {
  level: number
  rank: string
  currentXP: number
  xpForNextLevel: number
  progress: number
}

// === GAMER XP FUNCTIONS ===
export function calculateGamerXP(logs: GameLog[]): number {
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

  return {
    level,
    rank: GAMER_RANK_NAMES[level],
    currentXP: xp,
    xpForNextLevel: nextThreshold,
    progress,
  }
}

// === SOCIAL XP FUNCTIONS ===
export function calculateSocialXP(logs: GameLog[], followerCount: number): number {
  let xp = 0

  // XP from reviews and ratings
  logs.forEach((log) => {
    if (log.review && log.review.trim().length > 0) {
      xp += SOCIAL_XP_VALUES.review
    } else if (log.rating !== null && log.rating !== undefined) {
      xp += SOCIAL_XP_VALUES.rating
    }
  })

  // XP from followers
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

  return {
    level,
    rank: SOCIAL_RANK_NAMES[level],
    currentXP: xp,
    xpForNextLevel: nextThreshold,
    progress,
  }
}

// === BADGE COLOR HELPERS ===
export function getGamerBadgeColor(level: number): string {
  if (level >= 9) return 'gold'
  if (level >= 6) return 'purple'
  if (level >= 3) return 'green'
  return 'gray'
}

export function getSocialBadgeColor(level: number): string {
  if (level >= 9) return 'gold'
  if (level >= 6) return 'purple'
  if (level >= 3) return 'blue'
  return 'gray'
}
