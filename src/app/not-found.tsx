import Link from 'next/link'
import { Gamepad2, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="relative">
        <Gamepad2 className="h-24 w-24 text-[var(--foreground-muted)] opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-[var(--accent)]">404</span>
        </div>
      </div>

      {/* Message */}
      <h1 className="mt-6 text-2xl font-bold">Page Not Found</h1>
      <p className="mt-2 max-w-md text-[var(--foreground-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Maybe try searching for what you need?
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-black transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
        <Link
          href="/search"
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--background-lighter)] px-6 py-3 font-medium transition-colors hover:bg-[var(--background-card)]"
        >
          <Search className="h-4 w-4" />
          Search Games
        </Link>
      </div>
    </div>
  )
}
