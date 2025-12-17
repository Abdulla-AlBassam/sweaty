'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { User, Camera, Trash2, Loader2, Check, X, AlertTriangle, LogOut, Key, Mail } from 'lucide-react'

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)

  // Form fields
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  // Username availability
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [originalUsername, setOriginalUsername] = useState('')

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Load user data
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setEmail(user.email || '')

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setUsername(profileData.username || '')
        setOriginalUsername(profileData.username || '')
        setDisplayName(profileData.display_name || '')
        setBio(profileData.bio || '')
        setAvatarUrl(profileData.avatar_url)
      }

      setLoading(false)
    }

    loadUser()
  }, [supabase, router])

  // Check username availability
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null)
      return
    }

    // If same as original, it's available
    if (usernameToCheck.toLowerCase() === originalUsername.toLowerCase()) {
      setUsernameAvailable(true)
      return
    }

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
  }, [supabase, originalUsername])

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsernameAvailability(username)
    }, 500)

    return () => clearTimeout(timer)
  }, [username, checkUsernameAvailability])

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setAvatarFile(file)
    setRemoveAvatar(false)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Save profile changes
  const handleSave = async () => {
    if (!profile) return

    // Validate username
    if (!username.trim()) {
      toast.error('Username is required')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('Username can only contain letters, numbers, and underscores')
      return
    }

    if (username.length < 3 || username.length > 20) {
      toast.error('Username must be 3-20 characters')
      return
    }

    if (username.toLowerCase() !== originalUsername.toLowerCase() && !usernameAvailable) {
      toast.error('Username is not available')
      return
    }

    setSaving(true)

    try {
      let newAvatarUrl = avatarUrl

      // Handle avatar upload
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error('Failed to upload avatar')
          setSaving(false)
          return
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        newAvatarUrl = urlData.publicUrl

        // Delete old avatar if exists
        if (avatarUrl) {
          const oldPath = avatarUrl.split('/avatars/')[1]
          if (oldPath) {
            await supabase.storage.from('avatars').remove([`avatars/${oldPath}`])
          }
        }
      } else if (removeAvatar && avatarUrl) {
        // Remove avatar
        const oldPath = avatarUrl.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`avatars/${oldPath}`])
        }
        newAvatarUrl = null
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Update error:', updateError)
        toast.error(updateError.message)
        setSaving(false)
        return
      }

      // Update local state
      setOriginalUsername(username.toLowerCase())
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setRemoveAvatar(false)

      toast.success('Profile updated successfully')
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // Change password
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    }

    setChangingPassword(false)
  }

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }

    setDeleting(true)

    try {
      // Delete user's game logs first
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('game_logs').delete().eq('user_id', user.id)
        await supabase.from('profiles').delete().eq('id', user.id)
      }

      // Note: Actual auth user deletion requires admin API or edge function
      // For now, we'll sign them out after deleting their data
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete account')
      setDeleting(false)
    }
  }

  // Username status indicator
  const getUsernameStatus = () => {
    if (!username || username.length < 3) return null
    if (username.toLowerCase() === originalUsername.toLowerCase()) return null
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Profile Section */}
      <section className="mt-8 rounded-xl bg-[var(--background-lighter)] p-6">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Customize how others see you on Sweaty
        </p>

        <div className="mt-6 space-y-6">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium mb-3">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-card)]">
                {avatarPreview || (avatarUrl && !removeAvatar) ? (
                  <Image
                    src={avatarPreview || avatarUrl!}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-[var(--foreground-muted)]" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg bg-[var(--background-card)] px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Upload photo
                </button>
                {(avatarUrl || avatarPreview) && !removeAvatar && (
                  <button
                    onClick={() => {
                      setRemoveAvatar(true)
                      setAvatarFile(null)
                      setAvatarPreview(null)
                    }}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--foreground-muted)]">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>

          {/* Username */}
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
                maxLength={20}
                className="w-full rounded-lg bg-[var(--background-card)] px-4 py-3 pr-10
                         border border-[var(--border)] placeholder-[var(--foreground-muted)]
                         focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getUsernameStatus()}
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              3-20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="mt-2 w-full rounded-lg bg-[var(--background-card)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="mt-2 w-full rounded-lg bg-[var(--background-card)] px-4 py-3
                       border border-[var(--border)] placeholder-[var(--foreground-muted)]
                       focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              {bio.length}/200 characters
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-black
                   hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </section>

      {/* Account Section */}
      <section className="mt-8 rounded-xl bg-[var(--background-lighter)] p-6">
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Manage your account settings
        </p>

        <div className="mt-6 space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between rounded-lg bg-[var(--background-card)] p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[var(--foreground-muted)]" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-[var(--foreground-muted)]">{email}</p>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-lg bg-[var(--background-card)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-[var(--foreground-muted)]" />
                <div>
                  <p className="text-sm font-medium">Password</p>
                  <p className="text-sm text-[var(--foreground-muted)]">Change your password</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                {showPasswordForm ? 'Cancel' : 'Change'}
              </button>
            </div>

            {showPasswordForm && (
              <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                             border border-[var(--border)] placeholder-[var(--foreground-muted)]
                             focus:outline-none focus:border-[var(--accent)] transition-colors"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 w-full rounded-lg bg-[var(--background-lighter)] px-4 py-3
                             border border-[var(--border)] placeholder-[var(--foreground-muted)]
                             focus:outline-none focus:border-[var(--accent)] transition-colors"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black
                           hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg bg-[var(--background-card)] p-4 text-left hover:bg-[var(--border)] transition-colors"
          >
            <LogOut className="h-5 w-5 text-[var(--foreground-muted)]" />
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-sm text-[var(--foreground-muted)]">Sign out of your account</p>
            </div>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Irreversible actions that affect your account
        </p>

        <div className="mt-6">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400
                     hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete account
          </button>
          <p className="mt-2 text-xs text-[var(--foreground-muted)]">
            This will permanently delete your account and all your game logs.
          </p>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-[var(--background-lighter)] p-6 shadow-2xl">
            <h3 className="flex items-center gap-2 text-xl font-bold text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </h3>
            <p className="mt-4 text-[var(--foreground-muted)]">
              This action cannot be undone. This will permanently delete your account
              and remove all your game logs from our servers.
            </p>

            <div className="mt-6">
              <label className="block text-sm font-medium">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-2 w-full rounded-lg bg-[var(--background-card)] px-4 py-3
                         border border-red-500/30 placeholder-[var(--foreground-muted)]
                         focus:outline-none focus:border-red-500 transition-colors"
                placeholder="DELETE"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 rounded-lg bg-[var(--background-card)] px-4 py-3 text-sm font-medium
                         hover:bg-[var(--border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-sm font-medium text-white
                         hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
