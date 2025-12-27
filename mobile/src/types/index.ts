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
export type SubscriptionTier = 'free' | 'trial' | 'monthly' | 'yearly' | 'lifetime'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  favorite_games: number[] | null
  subscription_tier: SubscriptionTier
  subscription_expires_at: string | null
  trial_started_at: string | null
  current_streak: number
  longest_streak: number
  last_activity_at: string | null
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
  review: string | null
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

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface SearchResult {
  games: Game[]
  users: Profile[]
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

// Custom list types
export interface GameList {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ListItem {
  id: string
  list_id: string
  game_id: number
  position: number
  added_at: string
}

export interface GameListWithItems extends GameList {
  items: Array<ListItem & {
    game: {
      id: number
      name: string
      cover_url: string | null
    }
  }>
  item_count?: number
}

export interface GameListWithUser extends GameList {
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  item_count?: number
  preview_games?: Array<{
    id: number
    name: string
    cover_url: string | null
  }>
}

// Review likes & comments types
export interface ReviewLike {
  id: string
  user_id: string
  game_log_id: string
  created_at: string
  user?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface ReviewComment {
  id: string
  user_id: string
  game_log_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  replies?: ReviewComment[]
}
