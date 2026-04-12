import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 pt-16 text-center">
      <span className="font-mono text-6xl font-bold text-[var(--foreground-dim)]/20">404</span>
      <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[var(--background-lighter)] border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:border-[var(--foreground-dim)]/30"
      >
        Go home
      </Link>
    </div>
  )
}
