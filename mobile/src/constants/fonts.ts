// Font family constants
// Montserrat - Display font (headlines, logo, section titles)
// Geist - Body font (everything else)
// Space Mono - Terminal/cyberpunk elements

export const Fonts = {
  // Display font - Montserrat
  display: 'Montserrat-Bold',
  displaySemiBold: 'Montserrat-SemiBold',

  // Body font - Geist (with weight variants)
  body: 'Geist-Regular',
  bodyMedium: 'Geist-Medium',
  bodySemiBold: 'Geist-SemiBold',
  bodyBold: 'Geist-Bold',

  // Monospace font - Space Mono (for terminal/cyberpunk aesthetic)
  mono: 'SpaceMono-Regular',
}

// Font files to load (must match filenames in assets/fonts/)
export const FontAssets = {
  'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
  'Montserrat-SemiBold': require('../../assets/fonts/Montserrat-SemiBold.ttf'),
  'Geist-Regular': require('../../assets/fonts/Geist-Regular.ttf'),
  'Geist-Medium': require('../../assets/fonts/Geist-Medium.ttf'),
  'Geist-SemiBold': require('../../assets/fonts/Geist-SemiBold.ttf'),
  'Geist-Bold': require('../../assets/fonts/Geist-Bold.ttf'),
  'SpaceMono-Regular': require('../../assets/fonts/SpaceMono-Regular.ttf'),
}

// Typography presets for consistent styling
// Every preset includes lineHeight (1.4–1.5× fontSize) for cross-device consistency
export const Typography = {
  // Display styles (Montserrat)
  logo: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    lineHeight: 34,
  },
  headline: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 26,
    lineHeight: 36,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    lineHeight: 26,
  },

  // Body styles (Geist)
  bodyLarge: {
    fontFamily: 'Geist-Regular',
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Geist-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  // Button/UI styles
  button: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonSmall: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: 'Geist-Medium',
    fontSize: 14,
    lineHeight: 20,
  },

  // Terminal/Cyberpunk styles (Space Mono)
  terminal: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  terminalLarge: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  terminalSmall: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  code: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
}
