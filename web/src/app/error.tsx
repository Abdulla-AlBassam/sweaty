'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 pt-16 text-center">
      <span className="font-mono text-4xl font-bold text-[var(--foreground-dim)]/20">Error</span>
      <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        We encountered an unexpected error. Please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--foreground-bright)]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-lg border border-[var(--border)] bg-[var(--background-lighter)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--foreground-dim)]/30"
        >
          Go home
        </a>
      </div>
    </div>
  )
}
