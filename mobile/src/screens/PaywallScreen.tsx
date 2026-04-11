import React, { useCallback, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import PremiumBadge from '../components/PremiumBadge'
import { BorderRadius, Colors, FontSize, Spacing } from '../constants/colors'
import { Fonts, Typography } from '../constants/fonts'

export const PAYWALL_STORAGE_KEY = '@sweaty:hasSeenPaywall'

type Plan = 'monthly' | 'yearly'

interface PaywallScreenProps {
  onFinish: () => void | Promise<void>
}

// TODO(RevenueCat): replace these hardcoded strings with the localised price
// strings that StoreKit / Play Billing return via react-native-purchases.
// useOffering() from @revenuecat/purchases-js-hooks, then read
// offering.availablePackages[x].product.priceString and .price.
const MONTHLY = {
  id: 'monthly' as Plan,
  label: 'Monthly',
  priceLabel: '$4.99',
  priceNumeric: 4.99,
  cadence: 'per month',
  helper: 'Cancel any time.',
}
const YEARLY_PRICE_NUMERIC = 49.99
const YEARLY_DISCOUNT_PCT = Math.round(
  (1 - YEARLY_PRICE_NUMERIC / (MONTHLY.priceNumeric * 12)) * 100,
)
const YEARLY = {
  id: 'yearly' as Plan,
  label: 'Yearly',
  priceLabel: '$49.99',
  priceNumeric: YEARLY_PRICE_NUMERIC,
  cadence: 'per year',
  helper: `Save ${YEARLY_DISCOUNT_PCT}% compared to monthly.`,
}

export default function PaywallScreen({ onFinish }: PaywallScreenProps) {
  const [selected, setSelected] = useState<Plan>('yearly')
  const [isPurchasing, setIsPurchasing] = useState(false)

  const handleSelect = useCallback((plan: Plan) => {
    Haptics.selectionAsync()
    setSelected(plan)
  }, [])

  const handleSubscribe = useCallback(async () => {
    // TODO(RevenueCat): call Purchases.purchasePackage(selectedPackage),
    // then on success update profiles.subscription_tier via webhook or
    // direct update, then call onFinish().
    setIsPurchasing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await new Promise((r) => setTimeout(r, 300))
    setIsPurchasing(false)
    await onFinish()
  }, [onFinish])

  const handleSkip = useCallback(async () => {
    Haptics.selectionAsync()
    await onFinish()
  }, [onFinish])

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
            plan={YEARLY}
            selected={selected === 'yearly'}
            onSelect={() => handleSelect('yearly')}
            badge="BEST VALUE"
          />
          <PlanCard
            plan={MONTHLY}
            selected={selected === 'monthly'}
            onSelect={() => handleSelect('monthly')}
          />
        </View>

        <Text style={styles.finePrint}>
          Prices shown in USD. Your local currency and exact amount will appear
          at checkout. Subscriptions renew automatically until cancelled. Manage
          from your App Store or Play Store account.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubscribe}
          disabled={isPurchasing}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Support Sweaty with the ${selected} plan`}
        >
          <Text style={styles.ctaText}>
            {isPurchasing ? 'Processing...' : 'Become a Supporter'}
          </Text>
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
  plan: typeof MONTHLY | typeof YEARLY
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
        <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>
          {plan.label}
        </Text>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
      <View style={styles.planPriceRow}>
        <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
          {plan.priceLabel}
        </Text>
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
  planLabelSelected: {
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
  planPriceSelected: {
    color: Colors.text,
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
