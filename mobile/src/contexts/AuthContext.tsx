import React, { createContext, useContext, useEffect, useState } from 'react'
import { Linking, Platform } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'
import Constants from 'expo-constants'
import * as AppleAuthentication from 'expo-apple-authentication'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: Error | null; needsEmailVerification?: boolean }>
  signInWithGoogle: () => Promise<{ error: Error | null; needsUsername?: boolean }>
  signInWithApple: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
        }
      }
    })
    if (error) return { error: error as Error }

    if (data.user) {
      // Check if email confirmation is required (no session means confirmation needed)
      const needsEmailVerification = !data.session

      if (needsEmailVerification) {
        // User needs to verify email before they can sign in
        // Profile will be created by trigger, we'll update username after they verify
        return { error: null, needsEmailVerification: true }
      }

      // Email confirmation disabled - user is auto-logged in
      // Profile is auto-created by database trigger, update username/display_name
      await new Promise(resolve => setTimeout(resolve, 500))

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName,
        })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }
    }
    return { error: null, needsEmailVerification: false }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const signInWithGoogle = async (): Promise<{ error: Error | null; needsUsername?: boolean }> => {
    try {
      // Check if running in Expo Go (development)
      const isExpoGo = Constants.appOwnership === 'expo'

      if (isExpoGo) {
        // Google Sign-In doesn't work reliably in Expo Go
        // It will work in production/dev builds
        return { error: new Error('Google Sign-In is only available in production builds. Please use email/password for testing.') }
      }

      // Production/dev build - use custom scheme
      const redirectUrl = 'sweaty://auth/callback'

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

      // Open the OAuth URL in the device browser
      // The deep link handler will catch the callback
      await Linking.openURL(data.url)

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  const signInWithApple = async (): Promise<{ error: Error | null }> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        return { error: new Error('No identity token received from Apple') }
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })

      if (error) return { error: error as Error }

      // Apple provides name ONLY on first sign-in. Capture it now.
      if (credential.fullName) {
        const firstName = credential.fullName.givenName || ''
        const lastName = credential.fullName.familyName || ''
        const displayName = [firstName, lastName].filter(Boolean).join(' ')

        if (displayName) {
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            await supabase
              .from('profiles')
              .update({ display_name: displayName })
              .eq('id', currentUser.id)
          }
        }
      }

      return { error: null }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return { error: null }
      }
      return { error: err as Error }
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'sweaty://auth/reset-password',
    })
    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signIn, signUp, signInWithGoogle, signInWithApple, signOut, refreshProfile, resetPassword }}>
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
