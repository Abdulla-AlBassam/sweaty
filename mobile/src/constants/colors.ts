// Sweaty Theme - Chrome Glitch Aesthetic
// Premium RGB chromatic aberration with intentional color hierarchy

export const Colors = {
  // Backgrounds - Deep blacks with depth levels
  background: '#0A0A0A',      // Main background (deepest)
  surface: '#151515',         // Card/surface background
  surfaceLight: '#1E1E1E',    // Elevated elements
  surfaceBright: '#282828',   // Highlighted elements

  // PRIMARY ACCENT (Green) - Primary actions only
  // Use for: Primary buttons, active filters, progress bars, glitch layers
  accent: '#22C55E',          // Primary green (for buttons/glitch)
  accentBright: '#4ade80',    // Brighter for emphasis
  accentMuted: '#16a34a',     // Dimmer green
  accentSoft: '#86EFAC',      // Soft green for text (less intense)
  accentDark: '#052e16',      // Dark green tint
  accentGlow: 'rgba(34, 197, 94, 0.2)',  // Subtle glow

  // SECONDARY ACCENT (Cyan) - Interactive text elements
  // Use for: Game titles, usernames, "See All" links, glitch layers
  cyan: '#00BFFF',            // Vibrant cyan (for glitch effects only)
  cyanSoft: '#7DD3FC',        // Soft sky blue (for text - less intense)
  cyanBright: '#33CCFF',      // Hover/active state
  cyanMuted: '#0099CC',       // Dimmer cyan
  cyanGlow: 'rgba(0, 191, 255, 0.2)',  // Subtle glow

  // TERTIARY ACCENT (Gold) - Achievements & ratings
  // Use for: Star ratings, achievements, special badges
  gold: '#FFD700',            // Star ratings
  goldBright: '#FFED4A',      // Brighter gold
  goldMuted: '#D4AF37',       // Dimmer gold
  goldGlow: 'rgba(255, 215, 0, 0.2)',  // Subtle glow

  // HOT PINK - Glitch effects & special accents
  // Use for: Plus button, glitch borders, special effects
  pink: '#FF1493',            // Hot pink base
  pinkBright: '#FF69B4',      // Lighter pink
  pinkMuted: '#CC1177',       // Darker pink
  pinkGlow: 'rgba(255, 20, 147, 0.3)',  // Pink glow

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

// Spacing values - 8px grid system
export const Spacing = {
  // Tight spacing (icon + label pairs)
  xs: 4,
  sm: 8,
  // Medium spacing (between list items, card padding)
  md: 12,
  // Standard padding
  lg: 16,
  // Section internal spacing
  xl: 24,
  // Between major sections
  xxl: 32,
  // Major visual breaks
  xxxl: 48,
  // Screen edge padding
  screenPadding: 16,
  // Card gap
  cardGap: 12,
  // Section header spacing
  sectionHeaderAbove: 32,
  sectionHeaderBelow: 16,
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
  // Hot pink glow for plus button and accents
  pink: {
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
}
