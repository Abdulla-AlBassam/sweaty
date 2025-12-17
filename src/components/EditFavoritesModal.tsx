'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { X, Search, Plus, Gamepad2, Star } from 'lucide-react'
import LogGameModal from './LogGameModal'
import type { Game } from '@/lib/igdb'

interface GameCache {
  id: number
  name: string
  cover_url: string | null
}

interface GameLog {
  game_id: number
  games_cache: GameCache | null
}

interface EditFavoritesModalProps {
  isOpen: boolean
  onClose: () => void
  currentFavorites: number[]
  userGameLogs: GameLog[]
  onSave: (favorites: number[]) => void
}

export default function EditFavoritesModal({
  isOpen,
  onClose,
  currentFavorites,
  userGameLogs,
  onSave,
}: EditFavoritesModalProps) {
  const supabase = createClient()
  const [favorites, setFavorites] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [gameToLog, setGameToLog] = useState<Game | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize favorites when modal opens
  useEffect(() => {
    if (isOpen) {
      setFavorites([...currentFavorites])
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen, currentFavorites])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(searchQuery)}&limit=8`)
        const data = await res.json()
        setSearchResults(data.games || [])
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

  // Check if a game is in user's library
  const isGameLogged = (gameId: number) => {
    return userGameLogs.some(log => log.game_id === gameId)
  }

  // Get game cache data from user's logs
  const getGameFromLogs = (gameId: number): GameCache | null => {
    const log = userGameLogs.find(l => l.game_id === gameId)
    return log?.games_cache || null
  }

  // Add game to favorites
  const addFavorite = (gameId: number) => {
    if (favorites.length >= 3) {
      toast.error('You can only have 3 favorite games')
      return
    }
    if (favorites.includes(gameId)) {
      toast.error('This game is already in your favorites')
      return
    }

    // Check if game is in library
    if (!isGameLogged(gameId)) {
      // Find the game from search results to log it
      const game = searchResults.find(g => g.id === gameId)
      if (game) {
        setGameToLog(game)
        setShowLogModal(true)
      }
      return
    }

    setFavorites([...favorites, gameId])
    setSearchQuery('')
    setSearchResults([])
  }

  // Handle game logged from modal - add to favorites after logging
  const handleGameLogged = () => {
    if (gameToLog && favorites.length < 3) {
      setFavorites([...favorites, gameToLog.id])
    }
    setShowLogModal(false)
    setGameToLog(null)
    setSearchQuery('')
    setSearchResults([])
  }

  // Remove game from favorites
  const removeFavorite = (gameId: number) => {
    setFavorites(favorites.filter(id => id !== gameId))
  }

  // Save favorites
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ favorite_games: favorites })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message)
        return
      }

      onSave(favorites)
      toast.success('Favorites updated!')
      onClose()
    } catch (err) {
      toast.error('Failed to save favorites')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-[var(--background-lighter)] shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-xl font-bold">Edit Favorite Games</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-[var(--background-card)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Favorites */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Your Favorites <span className="text-[var(--foreground-muted)]">({favorites.length}/3)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((index) => {
                  const gameId = favorites[index]
                  const gameData = gameId ? getGameFromLogs(gameId) : null

                  return (
                    <div key={index} className="relative">
                      {gameData ? (
                        <div className="group relative aspect-[3/4] overflow-hidden rounded-lg ring-2 ring-yellow-500/50 bg-[var(--background-card)]">
                          {gameData.cover_url ? (
                            <Image
                              src={gameData.cover_url}
                              alt={gameData.name}
                              fill
                              className="object-cover"
                              sizes="120px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Gamepad2 className="h-8 w-8 text-[var(--foreground-muted)]" />
                            </div>
                          )}
                          {/* Star badge */}
                          <div className="absolute top-1 left-1">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-lg" />
                          </div>
                          {/* Remove button */}
                          <button
                            onClick={() => removeFavorite(gameId)}
                            className="absolute top-1 right-1 rounded-full bg-black/70 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {/* Game name on hover */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs font-medium truncate">{gameData.name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--background-card)] flex items-center justify-center">
                          <Plus className="h-8 w-8 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Search to Add */}
            {favorites.length < 3 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Add from your library
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a game..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-[var(--background-card)] px-4 py-3 pl-10 border border-[var(--border)]
                             focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background-card)]">
                    {searchResults.map((game) => {
                      const isLogged = isGameLogged(game.id)
                      const isAlreadyFavorite = favorites.includes(game.id)

                      return (
                        <button
                          key={game.id}
                          onClick={() => addFavorite(game.id)}
                          disabled={isAlreadyFavorite}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                            isAlreadyFavorite
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-[var(--background-lighter)]'
                          }`}
                        >
                          <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-[var(--background-lighter)]">
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
                                <Gamepad2 className="h-4 w-4 text-[var(--foreground-muted)]" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">{game.name}</p>
                            <p className="text-xs text-[var(--foreground-muted)]">
                              {isAlreadyFavorite ? (
                                'Already in favorites'
                              ) : isLogged ? (
                                <span className="text-green-400">In your library</span>
                              ) : (
                                <span className="text-yellow-400">Click to log & add</span>
                              )}
                            </p>
                          </div>
                          {!isAlreadyFavorite && (
                            <Plus className="h-5 w-5 flex-shrink-0 text-[var(--foreground-muted)]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {searchQuery && !searching && searchResults.length === 0 && (
                  <p className="mt-2 text-sm text-[var(--foreground-muted)]">No games found</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm hover:bg-[var(--background-card)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-black
                       hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Log Game Modal for games not in library */}
      {gameToLog && (
        <LogGameModal
          game={gameToLog}
          isOpen={showLogModal}
          onClose={() => {
            setShowLogModal(false)
            setGameToLog(null)
          }}
          onSave={handleGameLogged}
        />
      )}
    </>
  )
}
