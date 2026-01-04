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

// Platform options for game logging - Granular console selection
export const PLATFORMS = [
  // PC
  'PC',
  'Steam Deck',
  // PlayStation
  'PlayStation 5',
  'PlayStation 4',
  'PlayStation 3',
  'PlayStation 2',
  'PlayStation',
  'PS Vita',
  'PSP',
  // Xbox
  'Xbox Series X|S',
  'Xbox One',
  'Xbox 360',
  'Xbox',
  // Nintendo
  'Nintendo Switch',
  'Wii U',
  'Wii',
  'Nintendo 3DS',
  'Nintendo DS',
  'GameCube',
  'Nintendo 64',
  // Mobile & Other
  'iOS',
  'Android',
  'Other',
]

// API configuration
export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://sweaty-v1.vercel.app',
}

// IGDB Platform ID mapping
// Used for filtering games by platform
export const IGDB_PLATFORM_IDS: Record<string, number[]> = {
  playstation: [48, 167],     // PS4, PS5
  xbox: [49, 169],            // Xbox One, Xbox Series X|S
  pc: [6],                    // PC (Windows)
  nintendo: [130],            // Nintendo Switch
}

// Helper to convert user's gaming platforms to IGDB platform IDs
export function getIGDBPlatformIds(platforms: string[] | null): number[] {
  if (!platforms || platforms.length === 0) return []

  const ids: number[] = []
  for (const platform of platforms) {
    const platformIds = IGDB_PLATFORM_IDS[platform]
    if (platformIds) {
      ids.push(...platformIds)
    }
  }
  return [...new Set(ids)] // Remove duplicates
}

// Image sizes for IGDB
export const IGDB_IMAGE_SIZES = {
  thumb: 't_thumb',
  coverSmall: 't_cover_small',
  coverBig: 't_cover_big',
  coverBig2x: 't_cover_big_2x',  // 528x748 - HD covers for retina
  screenshot: 't_screenshot_med',
  screenshotBig: 't_screenshot_big',
  hd: 't_720p',
  fullHd: 't_1080p',
}

// Helper to construct IGDB image URLs
// Extracts image ID from any format and rebuilds with desired size
export function getIGDBImageUrl(
  imageIdOrUrl: string | null | undefined,
  size: keyof typeof IGDB_IMAGE_SIZES = 'coverBig2x'
): string {
  if (!imageIdOrUrl) return ''

  // Extract just the image ID from any format
  let imageId = imageIdOrUrl

  // If it's a full URL, extract the image ID (e.g., "co4jni" from the URL)
  if (imageIdOrUrl.includes('igdb.com') || imageIdOrUrl.includes('/')) {
    // Match the image ID pattern (letters + numbers, typically like "co4jni")
    const match = imageIdOrUrl.match(/([a-z0-9]+)\.(jpg|png|webp)$/i)
    if (match) {
      imageId = match[1]
    } else {
      // Try to get the last path segment before any extension
      const segments = imageIdOrUrl.split('/')
      const lastSegment = segments[segments.length - 1]
      imageId = lastSegment.replace(/\.(jpg|png|webp)$/i, '')
    }
  }

  // Always construct fresh URL with desired size
  return `https://images.igdb.com/igdb/image/upload/${IGDB_IMAGE_SIZES[size]}/${imageId}.jpg`
}
