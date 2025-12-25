import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'

// Required for web browser auth flow
WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null; needsUsername?: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data as Profile
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile)
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, username: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error as Error }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: displayName,
      })
      if (profileError) return { error: profileError as Error }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const signInWithGoogle = async (): Promise<{ error: Error | null; needsUsername?: boolean }> => {
    try {
      // Create redirect URL for the app
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'sweaty',
        path: 'auth/callback',
      })

      // Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        return { error: error as Error }
      }

      if (!data.url) {
        return { error: new Error('No OAuth URL returned') }
      }

      // Open browser for Google login
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        { showInRecents: true }
      )

      if (result.type === 'success' && result.url) {
        // Extract tokens from URL
        const url = new URL(result.url)
        const params = new URLSearchParams(url.hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken) {
          // Set the session
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (sessionError) {
            return { error: sessionError as Error }
          }

          // Check if profile exists (new Google user may need to set username)
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', currentUser.id)
              .single()

            if (!existingProfile?.username) {
              return { error: null, needsUsername: true }
            }
          }

          return { error: null }
        }
      }

      if (result.type === 'cancel') {
        return { error: new Error('Login cancelled') }
      }

      return { error: new Error('Authentication failed') }
    } catch (err) {
      return { error: err as Error }
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
