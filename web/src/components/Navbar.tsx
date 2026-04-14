'use client'

import Link from 'next/link'
import { Logo } from './Logo'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size={30} />
          </Link>
          <a
            href="#waitlist"
            className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em]
                       text-[var(--background)] hover:bg-[var(--foreground-bright)] transition-colors"
          >
            Join Beta
          </a>
        </div>
      </div>
    </nav>
  )
}
