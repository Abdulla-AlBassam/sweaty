import Image from 'next/image'
import Link from 'next/link'
import type { Game } from '@/lib/igdb'

interface GameCardProps {
  game: Game
}

export default function GameCard({ game }: GameCardProps) {
  // Extract year from release date
  const year = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).getFullYear()
    : null

  return (
    <Link
      href={`/game/${game.id}`}
      className="group block overflow-hidden rounded-lg transition-transform hover:scale-105"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--background-card)]">
        {game.coverUrl ? (
          <Image
            src={game.coverUrl}
            alt={game.name}
            fill
            className="object-cover transition-opacity group-hover:opacity-80"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          // Placeholder when no cover
          <div className="flex h-full items-center justify-center">
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
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
        )}

        {/* Rating Badge */}
        {game.rating && (
          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium">
            {game.rating}
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="mt-2">
        <h3 className="truncate text-sm font-medium group-hover:text-[var(--accent)] transition-colors">
          {game.name}
        </h3>
        {year && (
          <p className="text-xs text-[var(--foreground-muted)]">{year}</p>
        )}
      </div>
    </Link>
  )
}
