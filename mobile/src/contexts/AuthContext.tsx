import React, { createContext, useContext, useEffect, useState } from 'react'
import { Linking } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import Constants from 'expo-constants'

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

    // Handle deep link for OAuth callback
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url
      console.log('Deep link received:', url)

      // Check if this is an auth callback - look for auth/callback path OR access_token in URL
      // (sometimes the path gets stripped but tokens are still in the hash)
      if (url.includes('auth/callback') || url.includes('access_token')) {
        // Extract tokens from URL hash
        const hashIndex = url.indexOf('#')
        if (hashIndex !== -1) {
          const params = new URLSearchParams(url.substring(hashIndex + 1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken) {
            console.log('Setting session from deep link')
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
          }
        }
      }
    }

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url })
    })

    // Listen for deep links while app is open
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink)

    return () => {
      subscription.unsubscribe()
      linkingSubscription.remove()
    }
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
      // Create redirect URL that works in both Expo Go and standalone builds
      // In Expo Go: exp://192.168.x.x:8081/--/auth/callback
      // In standalone: sweaty://auth/callback
      let redirectUrl: string

      const hostUri = Constants.expoConfig?.hostUri // e.g., "192.168.1.x:8081"
      if (hostUri) {
        // Running in Expo Go - use exp:// scheme
        redirectUrl = `exp://${hostUri}/--/auth/callback`
      } else {
        // Standalone build - use app scheme
        redirectUrl = 'sweaty://auth/callback'
      }

      console.log('OAuth redirect URL:', redirectUrl)

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
      await Linking.openURL(data.url)

      // Return pending - the deep link handler will complete the auth
      return { error: null }
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
