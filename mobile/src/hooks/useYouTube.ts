import { useState, useEffect, useCallback } from 'react'
import { YouTubeVideo } from '../types'
import { API_CONFIG } from '../constants'

export function useYouTube(limit: number = 10) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVideos = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/youtube?limit=${limit}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }

      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  return { videos, isLoading, error, refetch: fetchVideos }
}
