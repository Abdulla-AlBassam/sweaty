// Sweaty Theme - Matrix/Cyberpunk Aesthetic
// Inspired by The Matrix, Metal Gear Solid, and retro CRT displays

export const Colors = {
  // Backgrounds - Deep blacks with subtle green undertones
  background: '#050505',      // Near-black, slightly warmer
  surface: '#0a120a',         // Dark with green tint
  surfaceLight: '#0f1a0f',    // Slightly lighter green-black
  surfaceBright: '#152015',   // For elevated elements

  // Matrix Green - The signature phosphor glow
  accent: '#00ff41',          // Primary Matrix green (phosphor)
  accentMuted: '#00cc33',     // Slightly dimmer green
  accentDark: '#003311',      // Dark green for backgrounds
  accentGlow: 'rgba(0, 255, 65, 0.3)',  // For glow effects

  // Text - Greens and grays for readability
  text: '#e0e0e0',            // Primary text (light gray)
  textBright: '#ffffff',      // Bright white for emphasis
  textGreen: '#00ff41',       // Green text for headers/accents
  textMuted: '#7a9f7a',       // Muted green-gray
  textDim: '#4a6a4a',         // Dim green-gray

  // Border
  border: '#1a2a1a',          // Subtle green-tinted border
  borderBright: '#2a3a2a',    // Brighter border
  borderGlow: '#00ff4130',    // Glowing green border

  // Status colors - Cyberpunk palette
  error: '#ff3333',           // Bright red
  warning: '#ffaa00',         // Amber
  success: '#00ff41',         // Matrix green

  // Game status colors - Neon/cyberpunk variants
  statusPlaying: '#00aaff',   // Cyan blue
  statusCompleted: '#00ff41', // Matrix green
  statusPlayed: '#aa66ff',    // Purple
  statusWantToPlay: '#ffaa00',// Amber
  statusOnHold: '#666666',    // Gray
  statusDropped: '#ff3333',   // Red

  // Special effects
  scanLine: 'rgba(0, 0, 0, 0.1)',     // For CRT scan line effect
  vignette: 'rgba(0, 0, 0, 0.8)',     // For edge darkening
  glitch: '#ff0066',                   // Pink for glitch effects
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

// Glow/Shadow presets for Matrix aesthetic
export const Glow = {
  // Green glow for buttons, cards
  accent: {
    shadowColor: '#00ff41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  // Subtle green glow
  subtle: {
    shadowColor: '#00ff41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  // Text glow effect (use with textShadow)
  text: {
    textShadowColor: '#00ff41',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
}
