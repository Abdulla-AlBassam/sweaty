'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, Search, User as UserIcon } from 'lucide-react'
import type { Game } from '@/lib/igdb'

interface UserResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface MobileSearchOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure overlay is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle escape key and back button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handlePopState = () => {
      onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      window.addEventListener('popstate', handlePopState)
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setUserResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const [gamesRes, usersRes] = await Promise.all([
          fetch(`/api/games/search?q=${encodeURIComponent(searchQuery)}&limit=10`),
          fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        ])
        const gamesData = await gamesRes.json()
        const usersData = await usersRes.json()
        setSearchResults(gamesData.games || [])
        setUserResults(usersData.users || [])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      handleClose()
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setUserResults([])
    onClose()
  }

  const handleGameClick = (gameId: number) => {
    router.push(`/game/${gameId}`)
    handleClose()
  }

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)] flex flex-col">
      {/* Header with search input */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-[var(--background-lighter)] pl-10 pr-4 py-3 text-base
                     placeholder-[var(--foreground-muted)] border border-[var(--border)]
                     focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
        </form>
        <button
          onClick={handleClose}
          className="flex-shrink-0 rounded-lg p-2 hover:bg-[var(--background-lighter)] transition-colors"
          aria-label="Close search"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {searching && (
          <div className="flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-[var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {/* No query state */}
        {!searching && !searchQuery.trim() && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="h-12 w-12 text-[var(--foreground-muted)] mb-4" />
            <p className="text-[var(--foreground-muted)]">
              Search for games or users
            </p>
          </div>
        )}

        {/* Results */}
        {!searching && searchQuery.trim() && (
          <>
            {/* Users Section */}
            {userResults.length > 0 && (
              <div>
                <div className="sticky top-0 px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider bg-[var(--background-card)] border-b border-[var(--border)]">
                  Users
                </div>
                {userResults.map((userResult) => (
                  <button
                    key={userResult.id}
                    onClick={() => handleUserClick(userResult.username)}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-[var(--background-lighter)] active:bg-[var(--background-card)] transition-colors border-b border-[var(--border)]"
                    style={{ minHeight: '64px' }}
                  >
                    {/* User Avatar */}
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-card)]">
                      {userResult.avatar_url ? (
                        <Image
                          src={userResult.avatar_url}
                          alt={userResult.username}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserIcon className="h-6 w-6 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                    </div>
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-medium">
                        {userResult.display_name || userResult.username}
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        @{userResult.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Games Section */}
            {searchResults.length > 0 && (
              <div>
                <div className="sticky top-0 px-4 py-3 text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider bg-[var(--background-card)] border-b border-[var(--border)]">
                  Games
                </div>
                {searchResults.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game.id)}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-[var(--background-lighter)] active:bg-[var(--background-card)] transition-colors border-b border-[var(--border)]"
                    style={{ minHeight: '64px' }}
                  >
                    {/* Game Cover */}
                    <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-[var(--background-card)]">
                      {game.coverUrl ? (
                        <Image
                          src={game.coverUrl}
                          alt={game.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            className="h-6 w-6 text-[var(--foreground-muted)]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Game Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-base font-medium">{game.name}</p>
                      {game.firstReleaseDate && (
                        <p className="text-sm text-[var(--foreground-muted)]">
                          {new Date(game.firstReleaseDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
                {/* View All Results */}
                <button
                  onClick={handleSearch as () => void}
                  className="w-full px-4 py-4 text-center text-base text-[var(--accent)] font-medium hover:bg-[var(--background-lighter)] active:bg-[var(--background-card)] transition-colors"
                  style={{ minHeight: '56px' }}
                >
                  View all game results
                </button>
              </div>
            )}

            {/* No Results */}
            {searchResults.length === 0 && userResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-12 w-12 text-[var(--foreground-muted)] mb-4" />
                <p className="text-[var(--foreground-muted)]">
                  No results found for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
