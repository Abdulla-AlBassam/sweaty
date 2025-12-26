import { useMemo } from 'react'

export type SubscriptionTier = 'free' | 'trial' | 'monthly' | 'yearly' | 'lifetime'

interface PremiumStatus {
  isPremium: boolean
  tier: SubscriptionTier
  isLifetime: boolean
  isTrial: boolean
  expiresAt: Date | null
  daysRemaining: number | null
}

/**
 * Check if a user has active premium status
 */
export function usePremium(
  subscriptionTier?: string | null,
  subscriptionExpiresAt?: string | null
): PremiumStatus {
  return useMemo(() => {
    const tier = (subscriptionTier as SubscriptionTier) || 'free'
    const expiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null

    // Lifetime is always premium
    if (tier === 'lifetime') {
      return {
        isPremium: true,
        tier,
        isLifetime: true,
        isTrial: false,
        expiresAt: null,
        daysRemaining: null,
      }
    }

    // Check if subscription is active (not expired)
    if (tier === 'monthly' || tier === 'yearly' || tier === 'trial') {
      const now = new Date()
      const isActive = !expiresAt || expiresAt > now

      let daysRemaining: number | null = null
      if (expiresAt && isActive) {
        const diffMs = expiresAt.getTime() - now.getTime()
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      }

      return {
        isPremium: isActive,
        tier,
        isLifetime: false,
        isTrial: tier === 'trial',
        expiresAt,
        daysRemaining,
      }
    }

    // Free tier
    return {
      isPremium: false,
      tier: 'free',
      isLifetime: false,
      isTrial: false,
      expiresAt: null,
      daysRemaining: null,
    }
  }, [subscriptionTier, subscriptionExpiresAt])
}

/**
 * Simple helper to check premium status without hook
 */
export function checkIsPremium(
  subscriptionTier?: string | null,
  subscriptionExpiresAt?: string | null
): boolean {
  const tier = subscriptionTier || 'free'

  if (tier === 'lifetime') return true

  if (tier === 'monthly' || tier === 'yearly' || tier === 'trial') {
    if (!subscriptionExpiresAt) return true
    return new Date(subscriptionExpiresAt) > new Date()
  }

  return false
}
