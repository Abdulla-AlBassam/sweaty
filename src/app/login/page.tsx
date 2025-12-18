'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [identifier, setIdentifier] = useState('') // Can be email or username
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    let emailToUse = identifier.trim()

    // If identifier doesn't contain @, treat it as a username
    if (!identifier.includes('@')) {
      try {
        const res = await fetch('/api/auth/lookup-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier.trim() }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (res.status === 404) {
            setError('Username not found')
          } else {
            setError(data.error || 'Failed to lookup username')
          }
          setLoading(false)
          return
        }

        const data = await res.json()
        emailToUse = data.email
      } catch (err) {
        console.error('Username lookup error:', err)
        setError('Failed to lookup username')
        setLoading(false)
        return
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Redirect to specified page or dashboard
      router.push(redirect)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Log in to continue tracking your games
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Email or Username Field */}
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="you@example.com or username"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-3 font-semibold text-black
                     hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--accent)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

// Wrap in Suspense because useSearchParams needs it
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
