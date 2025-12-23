'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import GameCard from '@/components/GameCard'
import { User as UserIcon } from 'lucide-react'
import type { Game } from '@/lib/igdb'

interface UserResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''

  const [games, setGames] = useState<Game[]>([])
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) {
      setGames([])
      setUsers([])
      setSearched(false)
      setError(null)
      return
    }

    const search = async () => {
      setLoading(true)
      setError(null)
      try {
        // Search both games and users in parallel
        const [gamesRes, usersRes] = await Promise.all([
          fetch(`/api/games/search?q=${encodeURIComponent(query)}&limit=40`),
          fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
        ])

        if (!gamesRes.ok) {
          throw new Error('Failed to search games')
        }

        const gamesData = await gamesRes.json()
        const usersData = await usersRes.json()

        setGames(gamesData.games || [])
        setUsers(usersData.users || [])
      } catch (err) {
        console.error('Search failed:', err)
        setError('Something went wrong while searching. Please try again.')
        setGames([])
        setUsers([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }

    search()
  }, [query])

  const totalResults = games.length + users.length

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
                : `${totalResults} results for "${query}"`}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Search</h1>
            <p className="mt-2 text-[var(--foreground-muted)]">
              Use the search bar above to find games or users
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
        <>
          {/* Users Loading */}
          <div className="mb-8">
            <div className="h-6 w-20 animate-pulse rounded bg-[var(--background-card)] mb-4" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-[var(--background-card)] p-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-[var(--background-lighter)]" />
                  <div className="flex-1">
                    <div className="h-4 w-24 rounded bg-[var(--background-lighter)]" />
                    <div className="mt-1 h-3 w-16 rounded bg-[var(--background-lighter)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Games Loading */}
          <div className="h-6 w-20 animate-pulse rounded bg-[var(--background-card)] mb-4" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-[var(--background-card)]" />
                <div className="mt-2 h-4 w-3/4 rounded bg-[var(--background-card)]" />
                <div className="mt-1 h-3 w-1/2 rounded bg-[var(--background-card)]" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Results */}
      {!loading && searched && query && (
        <>
          {/* Users Section */}
          {users.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-[var(--foreground-muted)] mb-4">
                Users ({users.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--background-card)] p-4 hover:border-[var(--accent)] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-lighter)]">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserIcon className="h-7 w-7 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-medium">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        @{user.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Games Section */}
          {games.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground-muted)] mb-4">
                Games ({games.length})
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {games.length === 0 && users.length === 0 && (
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
              <h2 className="mt-6 text-xl font-semibold">No results found</h2>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </>
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
          <h2 className="mt-6 text-xl font-semibold">Find games or users</h2>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Search for any game to add it to your library, or find other users to follow
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
