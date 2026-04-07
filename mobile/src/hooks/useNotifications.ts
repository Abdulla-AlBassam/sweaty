import { useState, useEffect, useRef, useCallback } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { type EventSubscription, PermissionStatus } from 'expo-modules-core'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { NotificationPreferences } from '../types'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_followers: true,
  friend_activity: true,
  streak_reminders: true,
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function getProjectId(): Promise<string | undefined> {
  return Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
}

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  // Get Expo push token
  const projectId = await getProjectId()
  if (!projectId) {
    console.warn('No EAS project ID found - push token unavailable')
    return null
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  return token
}

export function useNotifications(userId: string | undefined) {
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)
  const notificationListener = useRef<EventSubscription | null>(null)
  const responseListener = useRef<EventSubscription | null>(null)

  // Check current permission status
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status)
    })
  }, [])

  // Load preferences from profile
  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    async function loadPreferences() {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single()

      if (!error && data?.notification_preferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...data.notification_preferences })
      }
      setIsLoading(false)
    }

    loadPreferences()
  }, [userId])

  // Register push token when user is available and permissions granted
  useEffect(() => {
    if (!userId || permissionStatus !== 'granted') return

    async function register() {
      const token = await registerForPushNotifications()
      if (!token) return

      setPushToken(token)

      // Upsert token in database
      await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        })
    }

    register()
  }, [userId, permissionStatus])

  // Set up notification listeners
  useEffect(() => {
    // Notification received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Handled by setNotificationHandler above
    })

    // User tapped on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      // Navigation will be handled by the component consuming this hook
      // Data shape: { type: 'new_follower' | 'friend_activity' | 'streak_reminder', ... }
      console.log('Notification tapped:', data)
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  // Request permissions (called from settings when user enables notifications)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync()
    setPermissionStatus(status)

    if (status === 'granted' && userId) {
      const token = await registerForPushNotifications()
      if (token) {
        setPushToken(token)
        await supabase
          .from('push_tokens')
          .upsert({
            user_id: userId,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,token',
          })
      }
    }

    return status === 'granted'
  }, [userId])

  // Update a single preference
  const updatePreference = useCallback(async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!userId) return

    const updated = { ...preferences, [key]: value }
    setPreferences(updated)

    await supabase
      .from('profiles')
      .update({
        notification_preferences: updated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }, [userId, preferences])

  // Remove push token (when user disables all notifications)
  const removePushToken = useCallback(async () => {
    if (!userId || !pushToken) return

    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', pushToken)

    setPushToken(null)
  }, [userId, pushToken])

  const isEnabled = permissionStatus === 'granted'

  return {
    pushToken,
    permissionStatus,
    preferences,
    isEnabled,
    isLoading,
    requestPermissions,
    updatePreference,
    removePushToken,
  }
}
