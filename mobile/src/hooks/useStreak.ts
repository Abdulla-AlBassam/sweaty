import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Toast from 'react-native-toast-message'

interface StreakData {
  current_streak: number
  longest_streak: number
  last_activity_at: string | null
}

export function useStreak() {
  const { user, profile, refreshProfile } = useAuth()

  /**
   * Record an activity and update the user's streak
   * Call this after any trackable action (log game, follow user, etc.)
   */
  const recordActivity = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_activity_at')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        console.error('Error fetching streak data:', fetchError)
        return
      }

      const streakData = currentData as StreakData
      const now = new Date()
      const lastActivity = streakData.last_activity_at
        ? new Date(streakData.last_activity_at)
        : null

      let newStreak = streakData.current_streak || 0
      let showToast = false
      let toastMessage = ''

      if (!lastActivity) {
        newStreak = 1
        showToast = true
        toastMessage = 'Streak started! 🔥'
      } else {
        const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
        const isSameDay = now.toDateString() === lastActivity.toDateString()

        if (isSameDay) {
          // Same-day re-trigger: keep the streak value, just refresh last_activity_at.
        } else if (hoursSinceLastActivity < 24) {
          // Different calendar day within 24h of last activity — the streak continues.
          newStreak = (streakData.current_streak || 0) + 1
          showToast = true
          toastMessage = `${newStreak} day streak! 🔥`
        } else {
          // Gap > 24h breaks the streak; start a fresh one at 1.
          newStreak = 1
          showToast = true
          toastMessage = 'New streak started! 🔥'
        }
      }

      const newLongestStreak = Math.max(newStreak, streakData.longest_streak || 0)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_activity_at: now.toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating streak:', updateError)
        return
      }

      await refreshProfile()

      if (showToast) {
        Toast.show({
          type: 'streak',
          text1: toastMessage,
          position: 'top',
          visibilityTime: 2000,
        })
      }
    } catch (err) {
      console.error('Error in recordActivity:', err)
    }
  }, [user, refreshProfile])

  /**
   * Get streak data for any user (for viewing profiles)
   */
  const getStreakForUser = useCallback(async (userId: string): Promise<StreakData | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_activity_at')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user streak:', error)
        return null
      }

      return data as StreakData
    } catch (err) {
      console.error('Error in getStreakForUser:', err)
      return null
    }
  }, [])

  return {
    recordActivity,
    getStreakForUser,
    currentStreak: (profile as any)?.current_streak || 0,
    longestStreak: (profile as any)?.longest_streak || 0,
  }
}
