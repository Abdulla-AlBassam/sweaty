export * from './colors'

// Game status labels and icons
export const STATUS_LABELS: Record<string, string> = {
  playing: 'Playing',
  completed: 'Completed',
  played: 'Played',
  want_to_play: 'Want to Play',
  on_hold: 'On Hold',
  dropped: 'Dropped',
}

export const STATUS_EMOJI: Record<string, string> = {
  playing: '🎮',
  completed: '✅',
  played: '🕹️',
  want_to_play: '📋',
  on_hold: '⏸️',
  dropped: '❌',
}

// Platform options for game logging
export const PLATFORMS = [
  'PC',
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X|S',
  'Xbox One',
  'Nintendo Switch',
  'Steam Deck',
  'Mobile',
  'Other',
]

// API configuration
export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
}

// Image sizes for IGDB
export const IGDB_IMAGE_SIZES = {
  thumb: 't_thumb',
  coverSmall: 't_cover_small',
  coverBig: 't_cover_big',
  screenshot: 't_screenshot_med',
  hd: 't_720p',
  fullHd: 't_1080p',
}

// Helper to construct IGDB image URLs
export function getIGDBImageUrl(imageId: string, size: keyof typeof IGDB_IMAGE_SIZES = 'coverBig'): string {
  return `https://images.igdb.com/igdb/image/upload/${IGDB_IMAGE_SIZES[size]}/${imageId}.jpg`
}
