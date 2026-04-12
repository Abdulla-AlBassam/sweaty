'use client'

import { useState } from 'react'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message)
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error)
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-lighter)]/60 backdrop-blur-sm px-5 py-4">
        <svg className="h-5 w-5 flex-shrink-0 text-[var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-sm text-[var(--foreground)]">{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder="Enter your email"
          required
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background-lighter)]/60 backdrop-blur-sm
                     px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--foreground-dim)]
                     focus:outline-none focus:border-[var(--foreground-dim)] transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-xl bg-[var(--foreground)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.1em]
                     text-[var(--background)] hover:bg-[var(--foreground-bright)] transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === 'loading' ? 'Joining...' : 'Get notified'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-xs text-[var(--error)]">{message}</p>
      )}
    </form>
  )
}
