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
  // Expo push tokens are only available on physical devices.
  if (!Device.isDevice) {
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

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

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status)
    })
  }, [])

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

  useEffect(() => {
    if (!userId || permissionStatus !== 'granted') return

    async function register() {
      const token = await registerForPushNotifications()
      if (!token) return

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

    register()
  }, [userId, permissionStatus])

  useEffect(() => {
    // Foreground receipt is handled by setNotificationHandler above.
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})

    // Data shape: { type: 'new_follower' | 'friend_activity' | 'streak_reminder', ... }.
    // Consumers route based on `type`; this hook just logs the tap.
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      console.log('Notification tapped:', data)
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

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
