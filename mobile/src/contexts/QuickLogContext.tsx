import React, { createContext, useContext, useState, useCallback } from 'react'

interface QuickLogContextType {
  isQuickLogOpen: boolean
  openQuickLog: () => void
  closeQuickLog: () => void
}

const QuickLogContext = createContext<QuickLogContextType | undefined>(undefined)

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false)

  const openQuickLog = useCallback(() => {
    setIsQuickLogOpen(true)
  }, [])

  const closeQuickLog = useCallback(() => {
    setIsQuickLogOpen(false)
  }, [])

  return (
    <QuickLogContext.Provider value={{ isQuickLogOpen, openQuickLog, closeQuickLog }}>
      {children}
    </QuickLogContext.Provider>
  )
}

export function useQuickLog() {
  const context = useContext(QuickLogContext)
  if (context === undefined) {
    throw new Error('useQuickLog must be used within a QuickLogProvider')
  }
  return context
}
