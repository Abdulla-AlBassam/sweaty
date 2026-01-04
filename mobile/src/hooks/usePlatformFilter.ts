import { useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getIGDBPlatformIds } from '../constants'

// PC platform names that indicate a game is on PC
const PC_PLATFORM_NAMES = [
  'pc',
  'windows',
  'mac',
  'linux',
  'pc (microsoft windows)',
  'macos',
  'classic mac os',
  'steam',
  'dos',
]

/**
 * Check if a game is PC-only based on its platforms array
 * Returns true if ALL platforms are PC variants (Windows, Mac, Linux, etc.)
 */
export function isPcOnlyGame(platforms: string[] | null | undefined): boolean {
  if (!platforms || platforms.length === 0) return false

  // Normalize platform names to lowercase for comparison
  const normalizedPlatforms = platforms.map(p => p.toLowerCase().trim())

  // Check if ALL platforms are PC-related
  return normalizedPlatforms.every(platform =>
    PC_PLATFORM_NAMES.some(pcName => platform.includes(pcName))
  )
}

/**
 * Hook to get the user's platform filter settings
 * Returns IGDB platform IDs for filtering game content
 *
 * If no platforms selected, returns empty array (show all platforms)
 */
export function usePlatformFilter() {
  const { profile } = useAuth()

  // Filter function to remove PC-only games from a list
  const filterPcOnlyGames = useCallback(<T extends { platforms?: string[] | null }>(
    games: T[]
  ): T[] => {
    if (!profile?.exclude_pc_only) return games
    return games.filter(game => !isPcOnlyGame(game.platforms))
  }, [profile?.exclude_pc_only])

  const platformFilter = useMemo(() => {
    const platforms = profile?.gaming_platforms || []
    const igdbIds = getIGDBPlatformIds(platforms)
    const excludePcOnly = profile?.exclude_pc_only || false

    return {
      // User's selected platform names (e.g., ['playstation', 'pc'])
      platforms,
      // IGDB platform IDs (e.g., [48, 167, 6])
      igdbPlatformIds: igdbIds,
      // Query param string for API calls (e.g., 'playstation,pc')
      platformsParam: platforms.length > 0 ? platforms.join(',') : null,
      // Whether platform filtering is active
      isFiltering: platforms.length > 0,
      // Whether to exclude PC-only games
      excludePcOnly,
      // Helper function to filter PC-only games from a list
      filterPcOnlyGames,
    }
  }, [profile?.gaming_platforms, profile?.exclude_pc_only, filterPcOnlyGames])

  return platformFilter
}
