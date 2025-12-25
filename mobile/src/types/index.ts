// Shared types for Sweaty Mobile

// Game types
export interface Game {
  id: number
  name: string
  slug: string | null
  summary: string | null
  coverUrl: string | null
  firstReleaseDate: string | null
  genres: string[]
  platforms: string[]
  rating: number | null
  artworkUrls?: string[]
}

// User types
export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  favorite_games: number[] | null
  created_at: string
  updated_at: string
}

// Game log types
export type GameStatus =
  | 'playing'
  | 'completed'
  | 'played'
  | 'want_to_play'
  | 'on_hold'
  | 'dropped'

export interface GameLog {
  id?: string
  user_id: string
  game_id: number
  status: GameStatus
  rating: number | null
  platform: string | null
  review: string | null
  hours_played: number | null
  started_at: string | null
  completed_at: string | null
  cover_variant?: number | null
  created_at: string
  updated_at: string
}

export interface GameLogWithGame extends GameLog {
  game: {
    id: number
    name: string
    cover_url: string | null
    slug: string | null
  }
}

// Social types
export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface ActivityItem {
  id: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  game: {
    id: number
    name: string
    cover_url: string | null
  }
  status: GameStatus
  rating: number | null
  created_at: string
}

// XP / Level types
export interface LevelInfo {
  level: number
  rank: string
  currentXP: number
  xpForNextLevel: number
  progress: number
}

// Curated list types
export interface CuratedList {
  id: string
  slug: string
  title: string
  description: string | null
  game_ids: number[]
  display_order: number
  is_active: boolean
}

export interface CuratedListWithGames extends CuratedList {
  games: Array<{
    id: number
    name: string
    cover_url: string | null
  }>
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface SearchResult {
  games: Game[]
  users: Profile[]
}
