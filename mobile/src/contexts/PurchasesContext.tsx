import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import type { SubscriptionTier } from '../types'

const RC_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
})

// The name of the Offering configured in the RevenueCat dashboard. Change
// this constant if you rename it.
const OFFERING_ID = 'default'

// The entitlement identifier that grants the Supporter badge. Set this in the
// RevenueCat dashboard on both the monthly and the yearly product.
export const SUPPORTER_ENTITLEMENT = 'supporter'

interface PurchasesContextType {
  isReady: boolean
  offering: PurchasesOffering | null
  monthlyPackage: PurchasesPackage | null
  yearlyPackage: PurchasesPackage | null
  isSubscribed: boolean
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; cancelled: boolean; error?: string }>
  restore: () => Promise<{ success: boolean; error?: string }>
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

function tierFromCustomerInfo(info: CustomerInfo): SubscriptionTier {
  const entitlement = info.entitlements.active[SUPPORTER_ENTITLEMENT]
  if (!entitlement) return 'free'

  // Map the product identifier suffix back to a tier. Yearly products
  // conventionally contain "year" or "annual" in the id.
  const productId = entitlement.productIdentifier.toLowerCase()
  if (productId.includes('year') || productId.includes('annual')) return 'yearly'
  return 'monthly'
}

async function syncSubscriptionToSupabase(userId: string, info: CustomerInfo) {
  try {
    const tier = tierFromCustomerInfo(info)
    const entitlement = info.entitlements.active[SUPPORTER_ENTITLEMENT]
    const expiresAt = entitlement?.expirationDate ?? null

    await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  } catch (err) {
    console.error('Failed to sync subscription to Supabase:', err)
  }
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Configure Purchases once with the current user id. When the user changes
  // (login / logout) we re-configure so entitlements follow the account.
  useEffect(() => {
    if (!RC_API_KEY) {
      console.warn(
        'RevenueCat API key missing. Set EXPO_PUBLIC_RC_IOS_KEY / EXPO_PUBLIC_RC_ANDROID_KEY in mobile/.env and rebuild.',
      )
      setIsReady(true)
      return
    }

    try {
      Purchases.configure({
        apiKey: RC_API_KEY,
        appUserID: user?.id ?? null,
      })
      setIsReady(true)
    } catch (err) {
      console.error('Purchases.configure failed:', err)
      setIsReady(true)
    }
  }, [user?.id])

  // Load the current Offering once configured.
  useEffect(() => {
    if (!isReady || !RC_API_KEY) return

    let cancelled = false
    Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return
        const picked =
          offerings.all[OFFERING_ID] ??
          offerings.current ??
          null
        setOffering(picked)
      })
      .catch((err) => {
        console.error('Purchases.getOfferings failed:', err)
      })

    return () => {
      cancelled = true
    }
  }, [isReady])

  // Listen for entitlement changes (purchase, restore, renewal, cancellation)
  // and mirror them into the Supabase profile row.
  useEffect(() => {
    if (!isReady || !RC_API_KEY || !user?.id) return

    const listener = (info: CustomerInfo) => {
      const subscribed = SUPPORTER_ENTITLEMENT in info.entitlements.active
      setIsSubscribed(subscribed)
      syncSubscriptionToSupabase(user.id, info)
    }

    Purchases.addCustomerInfoUpdateListener(listener)

    // Prime the current state on mount.
    Purchases.getCustomerInfo()
      .then(listener)
      .catch((err) => console.error('Purchases.getCustomerInfo failed:', err))

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
    }
  }, [isReady, user?.id])

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!RC_API_KEY) {
        return { success: false, cancelled: false, error: 'Purchases not configured' }
      }
      try {
        const result = await Purchases.purchasePackage(pkg)
        const subscribed = SUPPORTER_ENTITLEMENT in result.customerInfo.entitlements.active
        return { success: subscribed, cancelled: false }
      } catch (err: any) {
        if (err?.userCancelled) {
          return { success: false, cancelled: true }
        }
        console.error('Purchase failed:', err)
        return {
          success: false,
          cancelled: false,
          error: err?.message ?? 'Purchase failed',
        }
      }
    },
    [],
  )

  const restore = useCallback(async () => {
    if (!RC_API_KEY) {
      return { success: false, error: 'Purchases not configured' }
    }
    try {
      const info = await Purchases.restorePurchases()
      const subscribed = SUPPORTER_ENTITLEMENT in info.entitlements.active
      return { success: subscribed }
    } catch (err: any) {
      console.error('Restore failed:', err)
      return { success: false, error: err?.message ?? 'Restore failed' }
    }
  }, [])

  const monthlyPackage = offering?.monthly ?? null
  const yearlyPackage = offering?.annual ?? null

  return (
    <PurchasesContext.Provider
      value={{
        isReady,
        offering,
        monthlyPackage,
        yearlyPackage,
        isSubscribed,
        purchase,
        restore,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  )
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext)
  if (!ctx) {
    throw new Error('usePurchases must be used within a PurchasesProvider')
  }
  return ctx
}
