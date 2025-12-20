import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 text-center min-h-[80vh]">
        {/* Background Image */}
        <Image
          src="/hero-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[30%_center] sm:object-center"
          sizes="100vw"
        />

        {/* Dark Overlay - gradient from left/bottom */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {/* Content */}
        <div className="relative z-10">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl drop-shadow-lg">
            Track your <span className="text-[var(--accent)]">gaming journey</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-200 drop-shadow-md">
            Keep a diary of every game you play. Rate, review, and share your thoughts
            with a community of gamers.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 sm:w-auto justify-center">
            <Link
              href="/signup"
              className="rounded-lg bg-[var(--accent)] px-8 py-3 text-lg font-semibold
                       text-black hover:bg-[var(--accent-hover)] transition-colors text-center shadow-lg"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-8 py-3 text-lg font-semibold
                       hover:bg-white/20 transition-colors text-center shadow-lg"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[var(--border)] bg-[var(--background-lighter)] px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold">
            Everything you need to track your games
          </h2>
          <div className="mt-16 grid gap-8 grid-cols-1 sm:grid-cols-2">
            {/* Feature 1: Log your games */}
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

            {/* Feature 2: Rate and review */}
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

            {/* Feature 3: Level up */}
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
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Level up</h3>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Earn XP for every game you log and for contributing socially.
              </p>
            </div>

            {/* Feature 4: Join the community */}
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Join the community</h3>
              <p className="mt-2 text-[var(--foreground-muted)]">
                Follow friends, see what they&apos;re playing, and share your gaming journey.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
