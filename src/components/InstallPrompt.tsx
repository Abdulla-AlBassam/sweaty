'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('sweaty-install-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    // Track visit count
    const visitCount = parseInt(localStorage.getItem('sweaty-visit-count') || '0', 10) + 1
    localStorage.setItem('sweaty-visit-count', String(visitCount))

    // Check if on mobile or has visited 2+ times
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const shouldShow = isMobile || visitCount >= 2

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (shouldShow) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app is already installed
    const handleAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('sweaty-install-dismissed', 'true')
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background-card)] p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <Download className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Install Sweaty</h3>
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Add Sweaty to your home screen for a better experience.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:bg-[var(--accent-hover)] transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-4 py-2 text-sm text-[var(--foreground-muted)] hover:bg-[var(--background-lighter)] transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 rounded-lg p-1 text-[var(--foreground-muted)] hover:bg-[var(--background-lighter)] transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
