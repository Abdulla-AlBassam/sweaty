import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Track your <span className="text-[var(--accent)]">gaming journey</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--foreground-muted)]">
          Keep a diary of every game you play. Rate, review, and share your thoughts
          with a community of gamers. Like Letterboxd, but for games.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link
            href="/signup"
            className="rounded-lg bg-[var(--accent)] px-8 py-3 text-lg font-semibold
                     text-black hover:bg-[var(--accent-hover)] transition-colors text-center"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] px-8 py-3 text-lg font-semibold
                     hover:bg-[var(--background-lighter)] transition-colors text-center"
          >
            Log in
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[var(--border)] bg-[var(--background-lighter)] px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold">
            Everything you need to track your games
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl bg-[var(--background-card)] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <svg
                  className="h-6 w-6 text-[var(--accent)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Log your games</h3>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Track what you&apos;re playing, what you&apos;ve completed, and what&apos;s on your backlog.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl bg-[var(--background-card)] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <svg
                  className="h-6 w-6 text-[var(--accent)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Rate and review</h3>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Share your opinions with ratings and written reviews for every game.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl bg-[var(--background-card)] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <svg
                  className="h-6 w-6 text-[var(--accent)]"
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
              </div>
              <h3 className="text-xl font-semibold">Discover games</h3>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Search from thousands of games powered by IGDB&apos;s comprehensive database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Ready to start tracking?</h2>
          <p className="mt-4 text-[var(--foreground-muted)]">
            Join gamers who are keeping track of their gaming experiences.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-[var(--accent)] px-8 py-3 text-lg
                     font-semibold text-black hover:bg-[var(--accent-hover)] transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-[var(--foreground-muted)]">
          <p>Built with Next.js, Supabase, and IGDB</p>
        </div>
      </footer>
    </div>
  )
}
