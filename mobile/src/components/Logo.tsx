import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Fonts } from '../constants/fonts'
import { Colors } from '../constants/colors'

type LogoVariant = 'minimal' | 'elegant' | 'bold' | 'accent'

interface LogoProps {
  variant?: LogoVariant
}

/**
 * SWEATY Logo Component - 4 style variants to choose from
 *
 * Change the variant prop in DashboardScreen to preview each:
 * - 'minimal': Ultra-clean, thin white text
 * - 'elegant': Refined with subtle green underline
 * - 'bold': Strong presence, thicker weight
 * - 'accent': Green colored text
 */
export default function Logo({ variant = 'minimal' }: LogoProps) {
  switch (variant) {
    case 'minimal':
      return <MinimalLogo />
    case 'elegant':
      return <ElegantLogo />
    case 'bold':
      return <BoldLogo />
    case 'accent':
      return <AccentLogo />
    default:
      return <MinimalLogo />
  }
}

// Option 1: MINIMAL - Ultra clean, thin weight, pure white
function MinimalLogo() {
  return (
    <View style={styles.container}>
      <Text style={styles.minimalText}>SWEATY</Text>
    </View>
  )
}

// Option 2: ELEGANT - Clean text with thin green line underneath
function ElegantLogo() {
  return (
    <View style={styles.container}>
      <Text style={styles.elegantText}>SWEATY</Text>
      <View style={styles.elegantLine} />
    </View>
  )
}

// Option 3: BOLD - Stronger presence, heavier weight
function BoldLogo() {
  return (
    <View style={styles.container}>
      <Text style={styles.boldText}>SWEATY</Text>
    </View>
  )
}

// Option 4: ACCENT - Green colored text
function AccentLogo() {
  return (
    <View style={styles.container}>
      <Text style={styles.accentText}>SWEATY</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Option 1: Minimal - ultra clean
  minimalText: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: 14,
  },

  // Option 2: Elegant - with underline
  elegantText: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 12,
  },
  elegantLine: {
    width: 60,
    height: 1,
    backgroundColor: Colors.accent,
    marginTop: 8,
    opacity: 0.6,
  },

  // Option 3: Bold - stronger
  boldText: {
    fontFamily: Fonts.mono,
    fontSize: 30,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 8,
  },

  // Option 4: Accent - green
  accentText: {
    fontFamily: Fonts.mono,
    fontSize: 28,
    fontWeight: '300',
    color: Colors.accent,
    letterSpacing: 12,
  },
})
