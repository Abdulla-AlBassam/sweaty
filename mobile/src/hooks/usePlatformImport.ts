import { useState, useCallback } from 'react'
import { API_CONFIG } from '../constants'
import { Platform, PlatformConnection, PlatformGame } from '../types'
import { supabase } from '../lib/supabase'

interface ImportResult {
  success: boolean
  total_rows?: number
  imported?: number
  matched?: number
  unmatched?: number
  skipped?: number
  unmatched_games?: string[]
  errors?: number
  error?: string
  is_private?: boolean
}

interface PlatformStatus {
  connected?: boolean
  has_imported?: boolean
  platform: Platform
  steam_id?: string
  username?: string
  last_synced_at?: string | null
  last_import?: string | null
  connected_at?: string | null
  first_import?: string | null
  game_count?: number
  matched_count?: number
}

export function usePlatformImport(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get PlayStation import status
  const getPlayStationStatus = useCallback(async (): Promise<PlatformStatus | null> => {
    if (!userId) return null

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/import/playstation/status?user_id=${userId}`
      )
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error getting PlayStation status:', err)
      return null
    }
  }, [userId])

  // Get Steam import status
  const getSteamStatus = useCallback(async (): Promise<PlatformStatus | null> => {
    if (!userId) return null

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/import/steam/status?user_id=${userId}`
      )
      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error getting Steam status:', err)
      return null
    }
  }, [userId])

  // Import PlayStation games from CSV
  const importPlayStationCSV = useCallback(async (
    fileUri: string,
    fileName: string,
    fileContent: string
  ): Promise<ImportResult> => {
    if (!userId) {
      return { success: false, error: 'Not logged in' }
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create form data with the file content
      const formData = new FormData()

      // Create a blob-like object for React Native
      const file = {
        uri: fileUri,
        type: 'text/csv',
        name: fileName,
      } as any

      formData.append('file', file)
      formData.append('user_id', userId)

      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/import/playstation/csv`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Import failed')
        return { success: false, error: data.error }
      }

      return data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to import CSV'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Clear PlayStation imported data
  const clearPlayStationData = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    setIsLoading(true)
    setError(null)

    try {
      // Delete platform_games for PlayStation
      const { error: gamesError } = await supabase
        .from('platform_games')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'playstation')

      if (gamesError) throw gamesError

      // Delete platform_connection for PlayStation
      const { error: connectionError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'playstation')

      if (connectionError) throw connectionError

      return true
    } catch (err: any) {
      setError(err.message || 'Failed to clear data')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Get Steam auth URL
  const getSteamAuthUrl = useCallback(async (redirectUri?: string): Promise<string | null> => {
    if (!userId) return null

    try {
      const params = new URLSearchParams({ user_id: userId })
      if (redirectUri) {
        params.append('redirect_uri', redirectUri)
      }

      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/import/steam/auth?${params.toString()}`
      )
      const data = await response.json()
      return data.auth_url || null
    } catch (err) {
      console.error('Error getting Steam auth URL:', err)
      return null
    }
  }, [userId])

  // Sync Steam library
  const syncSteamLibrary = useCallback(async (): Promise<ImportResult> => {
    if (!userId) {
      return { success: false, error: 'Not logged in' }
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/import/steam/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sync failed')
        return { success: false, error: data.error, is_private: data.is_private }
      }

      return data
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to sync Steam library'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Clear Steam data
  const clearSteamData = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    setIsLoading(true)
    setError(null)

    try {
      // Delete platform_games for Steam
      const { error: gamesError } = await supabase
        .from('platform_games')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'steam')

      if (gamesError) throw gamesError

      // Delete platform_connection for Steam
      const { error: connectionError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'steam')

      if (connectionError) throw connectionError

      return true
    } catch (err: any) {
      setError(err.message || 'Failed to clear data')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Get imported games for a platform
  const getImportedGames = useCallback(async (platform: Platform): Promise<PlatformGame[]> => {
    if (!userId) return []

    try {
      const { data, error } = await supabase
        .from('platform_games')
        .select(`
          *,
          games_cache:igdb_game_id (
            id,
            name,
            cover_url
          )
        `)
        .eq('user_id', userId)
        .eq('platform', platform)
        .order('game_name')

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error getting imported games:', err)
      return []
    }
  }, [userId])

  return {
    isLoading,
    error,
    // PlayStation
    getPlayStationStatus,
    importPlayStationCSV,
    clearPlayStationData,
    // Steam
    getSteamStatus,
    getSteamAuthUrl,
    syncSteamLibrary,
    clearSteamData,
    // Shared
    getImportedGames,
  }
}

export type { ImportResult, PlatformStatus }
