import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Celebration } from '../components/Confetti'
import { haptics } from '../hooks/useHaptics'

interface CelebrationData {
  title?: string
  subtitle?: string
}

interface CelebrationContextType {
  celebrate: (data?: CelebrationData) => void
  celebrateLevelUp: (rankName: string, level: number) => void
  celebrateStreak: (days: number) => void
  celebrateFirstGame: () => void
  celebrateCompletion: (gameName: string) => void
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined)

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [celebrationData, setCelebrationData] = useState<CelebrationData>({})

  const celebrate = useCallback((data?: CelebrationData) => {
    setCelebrationData(data || {})
    setVisible(true)
    // Haptic celebration pattern
    haptics.success()
    setTimeout(() => haptics.heavy(), 100)
    setTimeout(() => haptics.medium(), 200)
  }, [])

  const celebrateLevelUp = useCallback((rankName: string, level: number) => {
    celebrate({
      title: `LEVEL UP!`,
      subtitle: `You reached ${rankName} (Level ${level})`,
    })
  }, [celebrate])

  const celebrateStreak = useCallback((days: number) => {
    const milestones: Record<number, string> = {
      7: 'One Week!',
      14: 'Two Weeks!',
      30: 'One Month!',
      60: 'Two Months!',
      90: 'Three Months!',
      100: 'Century!',
      365: 'One Year!',
    }
    const milestone = milestones[days] || `${days} Days!`
    celebrate({
      title: `🔥 STREAK`,
      subtitle: milestone,
    })
  }, [celebrate])

  const celebrateFirstGame = useCallback(() => {
    celebrate({
      title: `WELCOME!`,
      subtitle: `You logged your first game!`,
    })
  }, [celebrate])

  const celebrateCompletion = useCallback((gameName: string) => {
    celebrate({
      title: `COMPLETED!`,
      subtitle: gameName,
    })
  }, [celebrate])

  const handleHide = useCallback(() => {
    setVisible(false)
    setCelebrationData({})
  }, [])

  return (
    <CelebrationContext.Provider
      value={{
        celebrate,
        celebrateLevelUp,
        celebrateStreak,
        celebrateFirstGame,
        celebrateCompletion,
      }}
    >
      {children}
      <Celebration
        visible={visible}
        onHide={handleHide}
        title={celebrationData.title}
        subtitle={celebrationData.subtitle}
      />
    </CelebrationContext.Provider>
  )
}

export function useCelebration() {
  const context = useContext(CelebrationContext)
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider')
  }
  return context
}
