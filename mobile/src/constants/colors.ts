// Sweaty Theme - Refined Terminal Aesthetic
// Premium cyberpunk with intentional color hierarchy

export const Colors = {
  // Backgrounds - Deep blacks with depth levels
  background: '#0A0A0A',      // Main background (deepest)
  surface: '#151515',         // Card/surface background
  surfaceLight: '#1E1E1E',    // Elevated elements
  surfaceBright: '#282828',   // Highlighted elements

  // PRIMARY ACCENT (Green) - Primary actions only
  // Use for: Primary buttons, active filters, progress bars, level bars, NOW PLAYING dot, terminal/AI elements
  accent: '#22C55E',          // Primary green
  accentBright: '#4ade80',    // Brighter for emphasis
  accentMuted: '#16a34a',     // Dimmer green
  accentDark: '#052e16',      // Dark green tint
  accentGlow: 'rgba(34, 197, 94, 0.2)',  // Subtle glow

  // SECONDARY ACCENT (Cyan) - Interactive text elements
  // Use for: Game titles, usernames, "See All" links, secondary interactive elements
  cyan: '#00BFFF',            // Clickable text
  cyanBright: '#33CCFF',      // Hover/active state
  cyanMuted: '#0099CC',       // Dimmer cyan
  cyanGlow: 'rgba(0, 191, 255, 0.2)',  // Subtle glow

  // TERTIARY ACCENT (Gold) - Achievements & ratings
  // Use for: Star ratings, achievements, special badges
  gold: '#FFD700',            // Star ratings
  goldBright: '#FFED4A',      // Brighter gold
  goldMuted: '#D4AF37',       // Dimmer gold
  goldGlow: 'rgba(255, 215, 0, 0.2)',  // Subtle glow

  // Text hierarchy
  text: '#FFFFFF',            // Primary text (pure white)
  textSecondary: '#A1A1A1',   // Secondary text
  textMuted: '#6B6B6B',       // Muted/tertiary text
  textDim: '#4A4A4A',         // Disabled/very muted

  // Legacy aliases (for backwards compatibility)
  textBright: '#FFFFFF',      // Alias for text
  textGreen: '#22C55E',       // Keep for specific green text needs

  // Borders - Subtle definition
  border: '#222222',          // Standard border
  borderBright: '#333333',    // Emphasized border
  borderGlow: 'rgba(34, 197, 94, 0.15)',  // Subtle green tint

  // Status colors - Refined palette
  error: '#ef4444',           // Red
  warning: '#f59e0b',         // Amber
  success: '#22C55E',         // Green

  // Game status colors
  statusPlaying: '#3b82f6',   // Blue
  statusCompleted: '#22C55E', // Green
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
  xs: 4,
  sm: 6,
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
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Cyan glow for links/interactive text
  cyan: {
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  // Gold glow for ratings/achievements
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  // Subtle glow for cards and surfaces
  subtle: {
    shadowColor: '#22C55E',
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
