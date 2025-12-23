'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Check, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface PosterSelectModalProps {
  isOpen: boolean
  onClose: () => void
  gameLogId: string
  gameName: string
  defaultCoverUrl: string | null
  artworkUrls: string[]
  currentVariant: number | null
  onSelect: (variant: number | null) => void
  isPremium: boolean
}

export default function PosterSelectModal({
  isOpen,
  onClose,
  gameLogId,
  gameName,
  defaultCoverUrl,
  artworkUrls,
  currentVariant,
  onSelect,
  isPremium,
}: PosterSelectModalProps) {
  const supabase = createClient()
  const [selectedVariant, setSelectedVariant] = useState<number | null>(currentVariant)
  const [saving, setSaving] = useState(false)

  // Combine default cover with artworks
  // null = default cover, 0+ = artwork index
  const allPosters = [
    { url: defaultCoverUrl, label: 'Default', variant: null as number | null },
    ...artworkUrls.map((url, index) => ({
      url,
      label: `Artwork ${index + 1}`,
      variant: index,
    })),
  ]

  const handleSave = async () => {
    if (!isPremium) {
      toast.error('Premium feature - upgrade to customize posters')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('game_logs')
      .update({ cover_variant: selectedVariant })
      .eq('id', gameLogId)

    setSaving(false)

    if (error) {
      toast.error('Failed to save poster selection')
      console.error('Error saving poster:', error)
      return
    }

    onSelect(selectedVariant)
    toast.success('Poster updated!')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-[var(--background-lighter)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-400" />
              Choose Poster
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">{gameName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--background-card)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!isPremium && (
            <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <Crown className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-400 font-medium">Premium Feature</p>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                Upgrade to Premium to customize your game posters
              </p>
            </div>
          )}

          {allPosters.length <= 1 ? (
            <div className="text-center py-8 text-[var(--foreground-muted)]">
              <p>No alternative posters available for this game</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {allPosters.map((poster, index) => {
                const isSelected = selectedVariant === poster.variant
                return (
                  <button
                    key={index}
                    onClick={() => isPremium && setSelectedVariant(poster.variant)}
                    disabled={!isPremium}
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden transition-all ${
                      isPremium ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                    } ${
                      isSelected
                        ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background-lighter)]'
                        : 'ring-1 ring-[var(--border)]'
                    }`}
                  >
                    {poster.url ? (
                      <Image
                        src={poster.url}
                        alt={poster.label}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    ) : (
                      <div className="h-full w-full bg-[var(--background-card)] flex items-center justify-center">
                        <span className="text-[var(--foreground-muted)] text-sm">No image</span>
                      </div>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[var(--accent)]/20 flex items-center justify-center">
                        <div className="rounded-full bg-[var(--accent)] p-2">
                          <Check className="h-5 w-5 text-black" />
                        </div>
                      </div>
                    )}

                    {/* Label */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white text-center">{poster.label}</p>
                    </div>
                  </button>
                )
              })}
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
            disabled={saving || !isPremium || selectedVariant === currentVariant}
            className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-black
                     hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
