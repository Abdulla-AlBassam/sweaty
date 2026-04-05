// Sweaty Theme - Clean & Minimal
// Forest green + gray palette with refined aesthetic

export const Colors = {
  // Backgrounds - Deep blacks with depth levels
  background: '#0A0A0A',      // Main background (deepest)
  surface: '#151515',         // Card/surface background
  surfaceLight: '#1E1E1E',    // Elevated elements
  surfaceBright: '#282828',   // Highlighted elements

  // PRIMARY ACCENT (Forest Green) - Primary actions only
  // Use for: Primary buttons, active filters, progress bars
  accent: '#2D6B4A',          // Forest green (primary)
  accentBright: '#3D8B63',    // Lighter forest green
  accentMuted: '#1F4D35',     // Deep forest
  accentSoft: '#4A9E6E',      // Soft green for text
  accentDark: '#0F2A1C',      // Dark green tint
  accentGlow: 'rgba(45, 107, 74, 0.2)',  // Subtle glow

  // SECONDARY ACCENT (Gray) - Interactive text elements
  // Use for: Game titles, usernames, "See All" links
  cyan: '#8A8A8A',            // Medium gray (replaces cyan)
  cyanSoft: '#A0A0A0',        // Soft gray
  cyanBright: '#9A9A9A',      // Slightly brighter gray
  cyanMuted: '#707070',       // Dimmer gray
  cyanGlow: 'rgba(138, 138, 138, 0.2)',  // Subtle glow

  // TERTIARY ACCENT (Gold) - Achievements & ratings
  // Use for: Star ratings, achievements, special badges
  gold: '#FFD700',            // Star ratings (kept)
  goldBright: '#FFED4A',      // Brighter gold
  goldMuted: '#D4AF37',       // Dimmer gold
  goldGlow: 'rgba(255, 215, 0, 0.2)',  // Subtle glow

  // FOREST GREEN ACCENT - Subtle effects & accents
  // Use for: Plus button, borders, special effects
  pink: '#2D6B4A',            // Forest green (replaces hot pink)
  pinkBright: '#3D8B63',      // Lighter forest green
  pinkMuted: '#1F4D35',       // Deeper forest green
  pinkGlow: 'rgba(45, 107, 74, 0.3)',  // Forest green glow

  // Text hierarchy — off-white primary to reduce halation on dark surfaces
  text: '#E0E0E0',            // Primary text (soft off-white, reduces eye strain)
  textSecondary: '#A1A1A1',   // Secondary text
  textMuted: '#6B6B6B',       // Muted/tertiary text
  textDim: '#5C5C5C',         // Disabled/very muted (was #4A4A4A — boosted for WCAG AA)

  // Pure white — use sparingly for high-emphasis moments (badges, active states)
  textBright: '#FFFFFF',      // Pure white (use only when contrast demands it)
  textGreen: '#2D6B4A',       // Forest green text

  // Borders - Subtle definition
  border: '#222222',          // Standard border
  borderBright: '#333333',    // Emphasized border
  borderGlow: 'rgba(45, 107, 74, 0.15)',  // Subtle forest green tint

  // Status colors - Refined palette
  error: '#ef4444',           // Red
  warning: '#f59e0b',         // Amber
  success: '#2D6B4A',         // Forest green

  // Game status colors
  statusPlaying: '#3b82f6',   // Blue
  statusCompleted: '#2D6B4A', // Forest green
  statusPlayed: '#8b5cf6',    // Purple
  statusWantToPlay: '#f59e0b',// Amber
  statusOnHold: '#6b7280',    // Gray
  statusDropped: '#ef4444',   // Red

  // Fire/streak color
  fire: '#FF8C00',                     // Orange for streak badge

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',      // Standard modal overlay
  overlayDark: 'rgba(0, 0, 0, 0.8)',  // Heavy overlay

  // Special effects
  scanLine: 'rgba(0, 0, 0, 0.03)',    // Very subtle scan lines
  vignette: 'rgba(0, 0, 0, 0.6)',     // Softer vignette
  glitch: '#3D8B63',                   // Forest green for effects
  glitchCyan: '#5A5A5A',              // Gray for split effect
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
  // Primary forest green glow for interactive elements
  accent: {
    shadowColor: '#2D6B4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  // Gray glow for links/interactive text
  cyan: {
    shadowColor: '#8A8A8A',
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
    shadowColor: '#2D6B4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  // Text glow - very subtle
  text: {
    textShadowColor: 'rgba(45, 107, 74, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  // Effect glow for special effects
  glitch: {
    shadowColor: '#3D8B63',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  // Forest green glow for plus button and accents
  pink: {
    shadowColor: '#2D6B4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
}
