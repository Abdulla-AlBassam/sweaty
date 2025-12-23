'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console (could be sent to error reporting service)
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>

      {/* Message */}
      <h1 className="mt-6 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-[var(--foreground-muted)]">
        We encountered an unexpected error. Don&apos;t worry, your data is safe.
        Try refreshing the page or go back home.
      </p>

      {/* Error details (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 max-w-lg text-left">
          <summary className="cursor-pointer text-sm text-[var(--foreground-muted)] hover:text-white">
            Error details
          </summary>
          <pre className="mt-2 overflow-auto rounded-lg bg-[var(--background-lighter)] p-4 text-xs text-red-400">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-black transition-colors hover:bg-[var(--accent-hover)]"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--background-lighter)] px-6 py-3 font-medium transition-colors hover:bg-[var(--background-card)]"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  )
}
