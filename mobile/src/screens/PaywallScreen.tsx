import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import type { PurchasesPackage } from 'react-native-purchases'
import LoadingSpinner from '../components/LoadingSpinner'
import PremiumBadge from '../components/PremiumBadge'
import { usePurchases } from '../contexts/PurchasesContext'
import { BorderRadius, Colors, FontSize, Spacing } from '../constants/colors'
import { Fonts, Typography } from '../constants/fonts'

export const PAYWALL_STORAGE_KEY = '@sweaty:hasSeenPaywall'

const TERMS_URL = 'https://sweaty-v1.vercel.app/terms'
const PRIVACY_URL = 'https://sweaty-v1.vercel.app/privacy'

type Plan = 'monthly' | 'yearly'

// Fallback prices used when the RevenueCat Offering has not loaded yet — in
// dev without configured API keys, or on a first paint while getOfferings is
// in flight. Real prices from the store overwrite these whenever available.
const FALLBACK_MONTHLY_NUMERIC = 4.99
const FALLBACK_YEARLY_NUMERIC = 49.99
const FALLBACK_MONTHLY_LABEL = '$4.99'
const FALLBACK_YEARLY_LABEL = '$49.99'

interface PaywallScreenProps {
  onFinish: () => void | Promise<void>
}

interface PlanDisplay {
  id: Plan
  label: string
  priceLabel: string
  priceNumeric: number
  cadence: string
  helper: string
  pkg: PurchasesPackage | null
}

export default function PaywallScreen({ onFinish }: PaywallScreenProps) {
  const { monthlyPackage, yearlyPackage, purchase, restore } = usePurchases()
  const [selected, setSelected] = useState<Plan>('yearly')
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const monthly: PlanDisplay = useMemo(() => {
    const product = monthlyPackage?.product
    const priceNumeric = product?.price ?? FALLBACK_MONTHLY_NUMERIC
    return {
      id: 'monthly',
      label: 'Monthly',
      priceLabel: product?.priceString ?? FALLBACK_MONTHLY_LABEL,
      priceNumeric,
      cadence: 'per month',
      helper: 'Cancel any time.',
      pkg: monthlyPackage,
    }
  }, [monthlyPackage])

  const yearly: PlanDisplay = useMemo(() => {
    const product = yearlyPackage?.product
    const priceNumeric = product?.price ?? FALLBACK_YEARLY_NUMERIC
    const discountPct = Math.round(
      (1 - priceNumeric / (monthly.priceNumeric * 12)) * 100,
    )
    return {
      id: 'yearly',
      label: 'Yearly',
      priceLabel: product?.priceString ?? FALLBACK_YEARLY_LABEL,
      priceNumeric,
      cadence: 'per year',
      helper: discountPct > 0 ? `Save ${discountPct}% compared to monthly.` : 'Best value.',
      pkg: yearlyPackage,
    }
  }, [yearlyPackage, monthly.priceNumeric])

  const handleSelect = useCallback((plan: Plan) => {
    Haptics.selectionAsync()
    setSelected(plan)
  }, [])

  const handleSubscribe = useCallback(async () => {
    const chosen = selected === 'yearly' ? yearly : monthly
    const pkg = chosen.pkg

    if (!pkg) {
      Alert.alert(
        'Store unavailable',
        'We could not reach the App Store right now. Please try again in a moment.',
      )
      return
    }

    setIsPurchasing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const result = await purchase(pkg)

    setIsPurchasing(false)

    if (result.cancelled) {
      return
    }

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await onFinish()
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Alert.alert('Purchase failed', result.error ?? 'Something went wrong. Please try again.')
  }, [selected, yearly, monthly, purchase, onFinish])

  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    const result = await restore()
    setIsRestoring(false)

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'Purchases restored',
        'Your Supporter badge has been restored. Thank you.',
        [{ text: 'OK', onPress: () => onFinish() }],
      )
    } else if (result.error) {
      Alert.alert('Nothing to restore', 'We did not find any previous purchases on this account.')
    } else {
      Alert.alert('Nothing to restore', 'We did not find any active subscriptions to restore.')
    }
  }, [restore, onFinish])

  const handleSkip = useCallback(async () => {
    Haptics.selectionAsync()
    await onFinish()
  }, [onFinish])

  const openLink = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open link:', err))
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeWrap}>
          <PremiumBadge size="large" variant="supporter" />
        </View>

        <Text style={styles.title}>SUPPORT SWEATY</Text>
        <Text style={styles.lede}>
          Sweaty is free. Every feature, forever.
        </Text>
        <Text style={styles.body}>
          If you would like to support the platform, you can pick up a Supporter
          badge. It is purely cosmetic, a small way to say thanks if Sweaty has
          become part of your routine.
        </Text>

        <View style={styles.plans}>
          <PlanCard
            plan={yearly}
            selected={selected === 'yearly'}
            onSelect={() => handleSelect('yearly')}
            badge="BEST VALUE"
          />
          <PlanCard
            plan={monthly}
            selected={selected === 'monthly'}
            onSelect={() => handleSelect('monthly')}
          />
        </View>

        <Text style={styles.finePrint}>
          Subscriptions renew automatically until cancelled. Your local currency
          and exact amount will appear at checkout. Manage from your App Store
          or Play Store account.
        </Text>

        <View style={styles.legalRow}>
          <Pressable onPress={() => openLink(TERMS_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => openLink(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={handleRestore} hitSlop={8} disabled={isRestoring}>
            <Text style={styles.legalLink}>
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubscribe}
          disabled={isPurchasing}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Support Sweaty with the ${selected} plan`}
        >
          {isPurchasing ? (
            <LoadingSpinner size="small" color={Colors.background} />
          ) : (
            <Text style={styles.ctaText}>Become a Supporter</Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleSkip}
          style={styles.skipButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Maybe later"
        >
          <Text style={styles.skipText}>Maybe later</Text>
        </Pressable>
      </View>
    </View>
  )
}

interface PlanCardProps {
  plan: PlanDisplay
  selected: boolean
  onSelect: () => void
  badge?: string
}

function PlanCard({ plan, selected, onSelect, badge }: PlanCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        pressed && styles.planCardPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.label} plan, ${plan.priceLabel} ${plan.cadence}`}
    >
      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      )}
      <View style={styles.planTop}>
        <Text style={styles.planLabel}>{plan.label}</Text>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
      <View style={styles.planPriceRow}>
        <Text style={styles.planPrice}>{plan.priceLabel}</Text>
        <Text style={styles.planCadence}>{plan.cadence}</Text>
      </View>
      <Text style={styles.planHelper}>{plan.helper}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  badgeWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.cream,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  lede: {
    ...Typography.bodyLarge,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.sm,
  },
  plans: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  planCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceLight,
  },
  planCardPressed: {
    opacity: 0.92,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.lg,
    backgroundColor: '#2f3924',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  planBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.cream,
    letterSpacing: 1.5,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  planPrice: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  planCadence: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  planHelper: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  finePrint: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legalLink: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textDim,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cta: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    ...Typography.button,
    color: Colors.background,
    letterSpacing: 1,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
})
