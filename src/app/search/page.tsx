'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import GameCard from '@/components/GameCard'
import type { Game } from '@/lib/igdb'

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      setGames([])
      setSearched(false)
      setError(null)
      return
    }

    const searchGames = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}&limit=40`)
        if (!res.ok) {
          throw new Error('Failed to search games')
        }
        const data = await res.json()
        setGames(data.games || [])
      } catch (err) {
        console.error('Search failed:', err)
        setError('Something went wrong while searching. Please try again.')
        setGames([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }

    searchGames()
  }, [query])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        {query ? (
          <>
            <h1 className="text-3xl font-bold">Search results</h1>
            <p className="mt-2 text-[var(--foreground-muted)]">
              {loading
                ? 'Searching...'
                : `${games.length} results for "${query}"`}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Search games</h1>
            <p className="mt-2 text-[var(--foreground-muted)]">
              Use the search bar above to find games
            </p>
          </>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="mt-4 text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-[var(--background-card)]" />
              <div className="mt-2 h-4 w-3/4 rounded bg-[var(--background-card)]" />
              <div className="mt-1 h-3 w-1/2 rounded bg-[var(--background-card)]" />
            </div>
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && searched && games.length === 0 && query && (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--background-card)]">
            <svg
              className="h-12 w-12 text-[var(--foreground-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold">No games found</h2>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Try adjusting your search terms
          </p>
        </div>
      )}

      {/* Empty State (no query) */}
      {!loading && !query && (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--background-card)]">
            <svg
              className="h-12 w-12 text-[var(--foreground-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-xl font-semibold">Find your next game</h2>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Search for any game to add it to your library
          </p>
        </div>
      )}
    </div>
  )
}

// Wrap in Suspense because useSearchParams needs it
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--background-card)]" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  )
}
