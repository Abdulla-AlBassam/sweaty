import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getGameById } from '@/lib/igdb'
import GameLogButton from '@/components/GameLogButton'

interface GamePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { id } = await params
  const gameId = parseInt(id)

  if (isNaN(gameId)) {
    return { title: 'Game Not Found' }
  }

  const game = await getGameById(gameId)

  if (!game) {
    return { title: 'Game Not Found' }
  }

  const releaseYear = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).getFullYear()
    : null

  const title = releaseYear ? `${game.name} (${releaseYear})` : game.name
  const description = game.summary
    ? game.summary.slice(0, 160) + (game.summary.length > 160 ? '...' : '')
    : `Track ${game.name} on Sweaty - your video game tracking app.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Sweaty`,
      description,
      images: game.coverUrl ? [{ url: game.coverUrl, width: 264, height: 352 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Sweaty`,
      description,
      images: game.coverUrl ? [game.coverUrl] : [],
    },
  }
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params
  const gameId = parseInt(id)

  // Validate ID
  if (isNaN(gameId)) {
    notFound()
  }

  // Fetch game data
  const game = await getGameById(gameId)

  if (!game) {
    notFound()
  }

  // Format release date
  const releaseDate = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown'

  const releaseYear = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).getFullYear()
    : null

  return (
    <div className="min-h-screen">
      {/* Hero Section with Backdrop */}
      <div className="relative">
        {/* Backdrop gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background-card)] to-[var(--background)]" />

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            {/* Cover Art */}
            <div className="flex-shrink-0">
              <div className="relative aspect-[3/4] w-48 sm:w-64 overflow-hidden rounded-lg bg-[var(--background-card)] shadow-2xl">
                {game.coverUrl ? (
                  <Image
                    src={game.coverUrl}
                    alt={game.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 640px) 192px, 256px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg
                      className="h-16 w-16 text-[var(--foreground-muted)]"
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
            </div>

            {/* Game Info */}
            <div className="flex-1 text-center md:text-left">
              {/* Title and Year */}
              <h1 className="text-2xl sm:text-4xl font-bold">
                {game.name}
                {releaseYear && (
                  <span className="ml-2 sm:ml-3 text-[var(--foreground-muted)]">
                    ({releaseYear})
                  </span>
                )}
              </h1>

              {/* Metadata */}
              <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-[var(--foreground-muted)] md:justify-start">
                {/* Release Date */}
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {releaseDate}
                </div>

                {/* IGDB Rating */}
                {game.rating && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-[var(--accent)]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {game.rating}/100
                  </div>
                )}
              </div>

              {/* Genres */}
              {game.genres.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  {game.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-[var(--background-card)] px-3 py-1 text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Platforms */}
              {game.platforms.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {game.platforms.join(' • ')}
                  </p>
                </div>
              )}

              {/* Log Game Button */}
              <div className="mt-8">
                <GameLogButton game={game} />
              </div>

              {/* User Rating Section */}
              <div className="mt-8 rounded-lg bg-[var(--background-lighter)] p-6">
                <h3 className="font-semibold">Sweaty Ratings</h3>
                <p className="mt-2 text-[var(--foreground-muted)]">
                  No ratings yet. Be the first to log this game!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold">About</h2>
        {game.summary ? (
          <p className="mt-4 leading-relaxed text-[var(--foreground-muted)]">
            {game.summary}
          </p>
        ) : (
          <p className="mt-4 text-[var(--foreground-muted)]">
            No description available.
          </p>
        )}
      </div>
    </div>
  )
}
