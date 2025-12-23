'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Loader2 } from 'lucide-react'

export default function SetupProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Check if user is logged in and doesn't already have a username
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Check if user already has a profile with username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, bio')
        .eq('id', user.id)
        .single()

      if (profile?.username) {
        // Already has username, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Pre-fill display name if exists
      if (profile?.display_name) {
        setDisplayName(profile.display_name)
      }
      if (profile?.bio) {
        setBio(profile.bio)
      }
    }

    checkUser()
  }, [supabase, router])

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null)
      return
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]+$/.test(usernameToCheck)) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)

    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', usernameToCheck.toLowerCase())
      .single()

    setUsernameAvailable(!data)
    setCheckingUsername(false)
  }, [supabase])

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsernameAvailability(username)
    }, 500)

    return () => clearTimeout(timer)
  }, [username, checkUsernameAvailability])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate username
    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (username.length > 20) {
      setError('Username must be 20 characters or less')
      return
    }

    if (!usernameAvailable) {
      setError('Username is already taken')
      return
    }

    if (!userId) {
      setError('Not logged in')
      return
    }

    setSaving(true)

    // Upsert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: username.toLowerCase(),
        display_name: displayName.trim() || username,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      setError(profileError.message)
      setSaving(false)
      return
    }

    // Success - redirect to dashboard
    router.push('/dashboard')
  }

  const getUsernameStatus = () => {
    if (!username || username.length < 3) return null
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return <span className="text-red-400 text-xs">Invalid characters</span>
    }
    if (checkingUsername) {
      return <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground-muted)]" />
    }
    if (usernameAvailable === true) {
      return <Check className="h-4 w-4 text-green-400" />
    }
    if (usernameAvailable === false) {
      return <X className="h-4 w-4 text-red-400" />
    }
    return null
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Set up your profile</h1>
          <p className="mt-2 text-[var(--foreground-muted)]">
            Choose a username to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                maxLength={20}
                className="w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3 pr-10
                         border border-[var(--border)] placeholder-[var(--foreground-muted)]
                         focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="your_username"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getUsernameStatus()}
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              3-20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          {/* Display Name Field */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium">
              Display Name <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Your Name"
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              This is how your name will appear on your profile.
            </p>
          </div>

          {/* Bio Field */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio <span className="text-[var(--foreground-muted)]">(optional)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              {bio.length}/160 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving || !usernameAvailable}
            className="w-full rounded-lg bg-[var(--accent)] py-3 font-semibold text-black
                     hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
