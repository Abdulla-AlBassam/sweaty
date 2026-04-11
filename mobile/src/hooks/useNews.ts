import { useState, useEffect, useCallback, useRef } from 'react'
import { NewsArticle } from '../types'
import { API_CONFIG } from '../constants'

const PAGE_SIZE = 15

export function useNews(limit: number = PAGE_SIZE) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const hasMoreRef = useRef(true)

  const fetchNews = useCallback(async (loadMore = false) => {
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
        `${API_CONFIG.baseUrl}/api/news?limit=${limit}&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch news')
      }

      const data = await response.json()
      const newArticles = data.articles || []

      if (loadMore) {
        setArticles(prev => [...prev, ...newArticles])
      } else {
        setArticles(newArticles)
      }

      offsetRef.current = offset + newArticles.length
      const more = data.hasMore ?? false
      hasMoreRef.current = more
      setHasMore(more)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [limit])

  useEffect(() => {
    fetchNews()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMoreRef.current && !isLoading) {
      fetchNews(true)
    }
  }, [fetchNews, isLoadingMore, isLoading])

  const refetch = useCallback(() => {
    hasMoreRef.current = true
    setHasMore(true)
    fetchNews(false)
  }, [fetchNews])

  return { articles, isLoading, isLoadingMore, hasMore, error, refetch, loadMore }
}
