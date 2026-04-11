import { useState, useEffect, useCallback, useRef } from 'react'
import { YouTubeVideo } from '../types'
import { API_CONFIG } from '../constants'

const PAGE_SIZE = 15

export function useYouTube(limit: number = PAGE_SIZE) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const hasMoreRef = useRef(true)

  const fetchVideos = useCallback(async (loadMore = false) => {
    if (loadMore) {
      if (!hasMoreRef.current) return
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      offsetRef.current = 0
    }
    setError(null)

    try {
      const offset = loadMore ? offsetRef.current : 0
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/youtube?limit=${limit}&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }

      const data = await response.json()
      const newVideos = data.videos || []

      if (loadMore) {
        setVideos(prev => [...prev, ...newVideos])
      } else {
        setVideos(newVideos)
      }

      offsetRef.current = offset + newVideos.length
      const more = data.hasMore ?? false
      hasMoreRef.current = more
      setHasMore(more)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [limit])

  useEffect(() => {
    fetchVideos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMoreRef.current && !isLoading) {
      fetchVideos(true)
    }
  }, [fetchVideos, isLoadingMore, isLoading])

  const refetch = useCallback(() => {
    hasMoreRef.current = true
    setHasMore(true)
    fetchVideos(false)
  }, [fetchVideos])

  return { videos, isLoading, isLoadingMore, hasMore, error, refetch, loadMore }
}
