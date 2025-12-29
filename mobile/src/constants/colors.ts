// Sweaty Theme - Refined Terminal Aesthetic
// Premium cyberpunk with subtle green undertones

export const Colors = {
  // Backgrounds - Deep blacks with subtle warmth
  background: '#0a0a0a',      // Rich black
  surface: '#111111',         // Elevated surface
  surfaceLight: '#1a1a1a',    // Cards and containers
  surfaceBright: '#222222',   // Highlighted elements

  // Terminal Green - Sophisticated, not neon
  accent: '#22c55e',          // Modern green (refined)
  accentBright: '#4ade80',    // Brighter for emphasis
  accentMuted: '#16a34a',     // Dimmer green
  accentDark: '#052e16',      // Dark green tint
  accentGlow: 'rgba(34, 197, 94, 0.2)',  // Subtle glow

  // Text hierarchy
  text: '#f0f0f0',            // Primary text (off-white)
  textBright: '#ffffff',      // Pure white for emphasis
  textGreen: '#22c55e',       // Green accent text
  textMuted: '#888888',       // Secondary text
  textDim: '#555555',         // Tertiary/disabled

  // Borders - Subtle definition
  border: '#222222',          // Standard border
  borderBright: '#333333',    // Emphasized border
  borderGlow: 'rgba(34, 197, 94, 0.15)',  // Subtle green tint

  // Status colors - Refined palette
  error: '#ef4444',           // Red
  warning: '#f59e0b',         // Amber
  success: '#22c55e',         // Green

  // Game status colors - Cyberpunk but refined
  statusPlaying: '#3b82f6',   // Blue
  statusCompleted: '#22c55e', // Green
  statusPlayed: '#8b5cf6',    // Purple
  statusWantToPlay: '#f59e0b',// Amber
  statusOnHold: '#6b7280',    // Gray
  statusDropped: '#ef4444',   // Red

  // Special effects
  scanLine: 'rgba(0, 0, 0, 0.03)',    // Very subtle scan lines
  vignette: 'rgba(0, 0, 0, 0.6)',     // Softer vignette
  glitch: '#ec4899',                   // Pink/magenta for glitch
  glitchCyan: '#06b6d4',              // Cyan for RGB split effect
}

// Spacing values
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

// Border radius values
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

// Font sizes
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

// Glow/Shadow presets - Refined and subtle
export const Glow = {
  // Primary green glow for interactive elements
  accent: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Subtle glow for cards and surfaces
  subtle: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  // Text glow - very subtle
  text: {
    textShadowColor: 'rgba(34, 197, 94, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // Glitch glow for special effects
  glitch: {
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
}
