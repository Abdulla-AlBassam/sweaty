import { Colors } from '../../constants/colors'

export const GlassTokens = {
  blur: {
    soft: 20,
    medium: 40,
    heavy: 70,
  },

  tint: {
    chrome: 'rgba(26, 26, 28, 0.55)',
    sheet: 'rgba(26, 26, 28, 0.70)',
    capsule: 'rgba(40, 40, 44, 0.45)',
    overContent: 'rgba(20, 20, 22, 0.35)',
  },

  stroke: {
    hairline: 'rgba(255, 255, 255, 0.06)',
    edge: 'rgba(255, 255, 255, 0.10)',
    active: 'rgba(192, 200, 208, 0.35)',
  },

  highlight: {
    top: 'rgba(255, 255, 255, 0.04)',
  },

  radius: {
    capsule: 999,
    chip: 14,
    card: 20,
    sheet: 28,
  },

  vibrancy: {
    primary: Colors.accent,
    secondary: Colors.cyanSoft,
    brand: Colors.cream,
  },
} as const

export type GlassIntensity = 'soft' | 'medium' | 'heavy'
export type GlassRole = 'chrome' | 'sheet' | 'capsule' | 'overContent'
