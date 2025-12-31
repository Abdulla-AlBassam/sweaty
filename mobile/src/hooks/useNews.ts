import { useState, useEffect, useCallback } from 'react'
import { NewsArticle } from '../types'
import { API_CONFIG } from '../constants'

export function useNews(limit: number = 5) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/news?limit=${limit}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch news')
      }

      const data = await response.json()
      setArticles(data.articles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  return { articles, isLoading, error, refetch: fetchNews }
}
