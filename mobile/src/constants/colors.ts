// Sweaty Theme - Clean & Minimal
// Forest green + gray palette with refined aesthetic

export const Colors = {
  // Backgrounds - Warm dark greys with depth levels
  background: '#1A1A1C',      // Main background (warm dark grey)
  surface: '#2A2A2E',         // Card/surface background
  surfaceLight: '#333338',    // Elevated elements
  surfaceBright: '#3A3A3E',   // Highlighted elements
  alternate: '#1E1E21',       // Alternating section background
  surfaceTranslucent: 'rgba(26, 26, 28, 0.7)',  // Frosted surface (auth forms)
  surfaceLightTranslucent: 'rgba(51, 51, 56, 0.9)',  // Translucent input fields (auth)

  // PRIMARY ACCENT (Off-white) - Primary actions only
  // Use for: Primary buttons, active filters, progress bars
  accent: '#E0E0E0',          // Off-white (primary)
  accentBright: '#FFFFFF',    // Pure white
  accentMuted: '#B0B0B0',    // Muted off-white
  accentSoft: '#C8C8C8',     // Soft off-white for text
  accentDark: '#1E1E1E',     // Dark tint
  accentGlow: 'rgba(224, 224, 224, 0.2)',  // Subtle glow
  accentSubtle: 'rgba(224, 224, 224, 0.12)',  // Subtle tint for highlighted items

  // SECONDARY ACCENT (Gray) - Interactive text elements
  // Use for: Game titles, usernames, "See All" links
  cyan: '#8A8A8A',            // Medium gray (replaces cyan)
  cyanSoft: '#A0A0A0',        // Soft gray
  cyanBright: '#9A9A9A',      // Slightly brighter gray
  cyanMuted: '#707070',       // Dimmer gray
  cyanGlow: 'rgba(138, 138, 138, 0.2)',  // Subtle glow

  // BRAND ACCENT - Section headers & brand identity
  cream: '#C0C8D0',            // Cool silver

  // TERTIARY ACCENT (Gold) - Achievements & ratings
  // Use for: Star ratings, achievements, special badges
  gold: '#FFD700',            // Star ratings (kept)
  goldBright: '#FFED4A',      // Brighter gold
  goldMuted: '#D4AF37',       // Dimmer gold
  goldGlow: 'rgba(255, 215, 0, 0.2)',  // Subtle glow

  // OFF-WHITE ACCENT - Subtle effects & accents
  // Use for: Plus button, borders, special effects
  pink: '#E0E0E0',            // Off-white (replaces forest green)
  pinkBright: '#FFFFFF',      // Pure white
  pinkMuted: '#B0B0B0',      // Muted off-white
  pinkGlow: 'rgba(224, 224, 224, 0.3)',  // Off-white glow

  // Text hierarchy — off-white primary to reduce halation on dark surfaces
  // All values pass WCAG AA (4.5:1) on background (#1A1A1C) and surface (#2A2A2E)
  text: '#E0E0E0',            // Primary text (soft off-white, reduces eye strain)
  textSecondary: '#A1A1A1',   // Secondary text
  textMuted: '#A3A3A3',       // Muted/tertiary text (~5:1 on background)
  textDim: '#999999',         // Disabled/very muted (~4.5:1 on background)

  // Pure white — use sparingly for high-emphasis moments (badges, active states)
  textBright: '#FFFFFF',      // Pure white (use only when contrast demands it)
  textGreen: '#E0E0E0',       // Off-white text (was forest green)

  // Borders - Subtle definition
  border: '#2E2E32',          // Standard border
  borderBright: '#3A3A3A',    // Emphasized border
  borderSubtle: 'rgba(255, 255, 255, 0.08)', // Very subtle white border (game covers, cards)
  borderGlow: 'rgba(224, 224, 224, 0.15)',  // Subtle off-white tint

  // Status colors - Refined palette
  error: '#ef4444',           // Red
  errorGlow: 'rgba(239, 68, 68, 0.2)',  // Error background tint
  warning: '#f59e0b',         // Amber
  success: '#E0E0E0',         // Off-white (was forest green)

  // Game status colors
  statusPlaying: '#3b82f6',   // Blue
  statusCompleted: '#E0E0E0', // Off-white (was forest green)
  statusPlayed: '#8b5cf6',    // Purple
  statusWantToPlay: '#f59e0b',// Amber
  statusOnHold: '#6b7280',    // Gray
  statusDropped: '#ef4444',   // Red

  // Fire/streak color
  fire: '#FF8C00',                     // Orange for streak badge

  // Overlays
  overlayLight: 'rgba(0, 0, 0, 0.4)', // Light overlay (banners, subtle tints)
  overlay: 'rgba(0, 0, 0, 0.5)',      // Standard modal overlay
  overlayDark: 'rgba(0, 0, 0, 0.8)',  // Heavy overlay

  // Background-tinted overlays (for gradients that blend into background)
  gradientStart: 'rgba(26, 26, 28, 0.6)',      // Banner top fade
  gradientEnd: 'rgba(26, 26, 28, 0.85)',        // Banner bottom fade
  gradientSubtle: 'rgba(26, 26, 28, 0.3)',      // Profile banner light fade
  gradientMedium: 'rgba(26, 26, 28, 0.6)',      // Profile banner medium fade
  edgeFadeLight: 'rgba(26, 26, 28, 0.7)',       // Auth screen edge gradient
  edgeFadeHeavy: 'rgba(26, 26, 28, 0.9)',       // Auth screen edge gradient (top)
  edgeFadeMax: 'rgba(26, 26, 28, 0.95)',        // Auth screen edge gradient (bottom)

  // Platform brand colors
  platformPlayStation: '#006FCD',
  platformXbox: '#107C10',
  platformPC: '#FF6600',
  platformNintendo: '#E60012',

  // OpenCritic tier colors
  openCriticMighty: '#66CC33',
  openCriticStrong: '#4A90D9',
  openCriticFair: '#FFCC33',
  openCriticWeak: '#FF6633',

  // External brand
  twitch: '#9146FF',
  youtube: '#FF0000',

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
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

