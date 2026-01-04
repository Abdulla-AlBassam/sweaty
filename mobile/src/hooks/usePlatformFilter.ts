import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getIGDBPlatformIds } from '../constants'

/**
 * Hook to get the user's platform filter settings
 * Returns IGDB platform IDs for filtering game content
 *
 * If no platforms selected, returns empty array (show all platforms)
 */
export function usePlatformFilter() {
  const { profile } = useAuth()

  const platformFilter = useMemo(() => {
    const platforms = profile?.gaming_platforms || []
    const igdbIds = getIGDBPlatformIds(platforms)

    return {
      // User's selected platform names (e.g., ['playstation', 'pc'])
      platforms,
      // IGDB platform IDs (e.g., [48, 167, 6])
      igdbPlatformIds: igdbIds,
      // Query param string for API calls (e.g., 'playstation,pc')
      platformsParam: platforms.length > 0 ? platforms.join(',') : null,
      // Whether filtering is active
      isFiltering: platforms.length > 0,
    }
  }, [profile?.gaming_platforms])

  return platformFilter
}
