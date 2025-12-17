'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, Search } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Game } from '@/lib/igdb'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Check for logged-in user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
        const data = await res.json()
        setSearchResults(data.games || [])
        setShowDropdown(true)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setSearching(false)
      }
    }, 300) // Wait 300ms after user stops typing

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowDropdown(false)
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleResultClick = (gameId: number) => {
    setShowDropdown(false)
    setSearchQuery('')
    router.push(`/game/${gameId}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-xl font-bold tracking-tight text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            sweaty
          </Link>

          {/* Search Bar - Desktop only */}
          {user && (
            <div ref={searchRef} className="relative hidden flex-1 max-w-md sm:block">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  className="w-full rounded-lg bg-[var(--background-lighter)] px-4 py-2 text-sm
                           placeholder-[var(--foreground-muted)] border border-[var(--border)]
                           focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                {/* Search Icon / Loading Spinner */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {searching ? (
                    <svg
                      className="h-4 w-4 animate-spin text-[var(--foreground-muted)]"
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
                  ) : (
                    <svg
                      className="h-4 w-4 text-[var(--foreground-muted)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  )}
                </div>
              </form>

              {/* Search Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-[var(--border)] bg-[var(--background-lighter)] shadow-xl overflow-hidden">
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => handleResultClick(game.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--background-card)] transition-colors"
                        >
                          {/* Game Cover Thumbnail */}
                          <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-[var(--background-card)]">
                            {game.coverUrl ? (
                              <Image
                                src={game.coverUrl}
                                alt={game.name}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <svg
                                  className="h-4 w-4 text-[var(--foreground-muted)]"
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
                            <p className="truncate text-sm font-medium">{game.name}</p>
                            {game.firstReleaseDate && (
                              <p className="text-xs text-[var(--foreground-muted)]">
                                {new Date(game.firstReleaseDate).getFullYear()}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                      {/* View All Results */}
                      <button
                        onClick={() => handleSearch({ preventDefault: () => {} } as React.FormEvent)}
                        className="w-full border-t border-[var(--border)] px-4 py-3 text-center text-sm text-[var(--accent)] hover:bg-[var(--background-card)] transition-colors"
                      >
                        View all results
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-3 text-sm text-[var(--foreground-muted)]">
                      No games found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Desktop Auth Buttons / User Menu */}
          <div className="hidden items-center gap-3 sm:flex">
            {loading ? (
              // Loading skeleton
              <div className="h-8 w-20 animate-pulse rounded bg-[var(--background-lighter)]" />
            ) : user ? (
              // Logged in - show user menu
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
                >
                  Settings
                </Link>
              </>
            ) : (
              // Logged out - show auth buttons
              <>
                <Link
                  href="/login"
                  className="text-sm text-[var(--foreground-muted)] hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium
                           text-black hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Buttons */}
          <div className="flex items-center gap-2 sm:hidden">
            {user && (
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="rounded-lg p-2 hover:bg-[var(--background-lighter)] transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-[var(--background-lighter)] transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {user && mobileSearchOpen && (
          <div className="border-t border-[var(--border)] py-3 sm:hidden">
            <form onSubmit={(e) => { handleSearch(e); setMobileSearchOpen(false); }}>
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full rounded-lg bg-[var(--background-lighter)] px-4 py-2 text-sm
                         placeholder-[var(--foreground-muted)] border border-[var(--border)]
                         focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border)] py-4 sm:hidden">
            <div className="flex flex-col gap-2">
              {loading ? (
                <div className="h-8 w-full animate-pulse rounded bg-[var(--background-lighter)]" />
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm hover:bg-[var(--background-lighter)] transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm hover:bg-[var(--background-lighter)] transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm hover:bg-[var(--background-lighter)] transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-4 py-3 text-left text-sm text-red-400 hover:bg-[var(--background-lighter)] transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm hover:bg-[var(--background-lighter)] transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-black text-center
                             hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
