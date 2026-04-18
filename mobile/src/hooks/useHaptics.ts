import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

export function useHaptics() {
  const trigger = async (type: HapticType = 'light') => {
    if (Platform.OS === 'web') return

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          break
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          break
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          break
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          break
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          break
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          break
        case 'selection':
          await Haptics.selectionAsync()
          break
      }
    } catch (e) {
      // Haptics are unsupported on some devices; silently no-op.
    }
  }

  const light = () => trigger('light')
  const medium = () => trigger('medium')
  const heavy = () => trigger('heavy')
  const success = () => trigger('success')
  const warning = () => trigger('warning')
  const error = () => trigger('error')
  const selection = () => trigger('selection')

  // Success → Heavy → Medium → Light staircase used only for level-up celebrations.
  const celebrate = async () => {
    if (Platform.OS === 'web') return
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 300)
    } catch (e) {}
  }

  return {
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    celebrate,
  }
}

// For callers that aren't React components (event handlers, utilities, etc.).
export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  selection: () => Haptics.selectionAsync().catch(() => {}),
}
