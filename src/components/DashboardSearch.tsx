'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface DashboardSearchProps {
  placeholder?: string
}

export default function DashboardSearch({ placeholder = 'Search for games...' }: DashboardSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3 pl-11 text-sm
                 placeholder-[var(--foreground-muted)] border border-[var(--border)]
                 focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--foreground-muted)]" />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-black
                 hover:bg-[var(--accent-hover)] transition-colors"
      >
        Search
      </button>
    </form>
  )
}
