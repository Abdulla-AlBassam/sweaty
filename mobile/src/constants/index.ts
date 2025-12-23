export * from './colors'

// Game status labels
export const STATUS_LABELS: Record<string, string> = {
  playing: 'Playing',
  completed: 'Completed',
  played: 'Played',
  want_to_play: 'Want to Play',
  on_hold: 'On Hold',
  dropped: 'Dropped',
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
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://sweaty-v1.vercel.app',
}

// Image sizes for IGDB
export const IGDB_IMAGE_SIZES = {
  thumb: 't_thumb',
  coverSmall: 't_cover_small',
  coverBig: 't_cover_big',
  screenshot: 't_screenshot_med',
  screenshotBig: 't_screenshot_big',
  hd: 't_720p',
  fullHd: 't_1080p',
}

// Helper to construct IGDB image URLs
// Handles both imageId (e.g., "abc123") and full URLs (e.g., "//images.igdb.com/...")
export function getIGDBImageUrl(
  imageIdOrUrl: string | null | undefined,
  size: keyof typeof IGDB_IMAGE_SIZES = 'coverBig'
): string {
  if (!imageIdOrUrl) return ''

  // If it's already a full URL, transform it
  if (imageIdOrUrl.includes('images.igdb.com')) {
    let url = imageIdOrUrl
    // Add https if missing
    if (url.startsWith('//')) {
      url = `https:${url}`
    }
    // Replace size placeholder
    Object.values(IGDB_IMAGE_SIZES).forEach((sizeValue) => {
      url = url.replace(sizeValue, IGDB_IMAGE_SIZES[size])
    })
    return url
  }

  // Otherwise, construct from imageId
  return `https://images.igdb.com/igdb/image/upload/${IGDB_IMAGE_SIZES[size]}/${imageIdOrUrl}.jpg`
}
