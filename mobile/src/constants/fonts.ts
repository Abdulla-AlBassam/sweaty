// Font family constants
// BBH Bogle - Display font (headlines, logo, section titles)
// Geist - Body font (everything else)
// Space Mono - Terminal/cyberpunk elements

export const Fonts = {
  // Display font - BBH Bogle
  display: 'BBHBogle',

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
  'BBHBogle': require('../../assets/fonts/BBHBogle-Regular.ttf'),
  'Geist-Regular': require('../../assets/fonts/Geist-Regular.ttf'),
  'Geist-Medium': require('../../assets/fonts/Geist-Medium.ttf'),
  'Geist-SemiBold': require('../../assets/fonts/Geist-SemiBold.ttf'),
  'Geist-Bold': require('../../assets/fonts/Geist-Bold.ttf'),
  'SpaceMono-Regular': require('../../assets/fonts/SpaceMono-Regular.ttf'),
}

// Typography presets for consistent styling
export const Typography = {
  // Display styles (BBH Bogle)
  logo: {
    fontFamily: 'BBHBogle',
    fontSize: 24,
  },
  headline: {
    fontFamily: 'BBHBogle',
    fontSize: 26,
  },
  sectionTitle: {
    fontFamily: 'BBHBogle',
    fontSize: 18,
  },

  // Body styles (Geist)
  bodyLarge: {
    fontFamily: 'Geist-Regular',
    fontSize: 18,
  },
  body: {
    fontFamily: 'Geist-Regular',
    fontSize: 16,
  },
  bodySmall: {
    fontFamily: 'Geist-Regular',
    fontSize: 14,
  },
  caption: {
    fontFamily: 'Geist-Regular',
    fontSize: 12,
  },

  // Button/UI styles
  button: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 16,
  },
  buttonSmall: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 14,
  },
  label: {
    fontFamily: 'Geist-Medium',
    fontSize: 14,
  },

  // Terminal/Cyberpunk styles (Space Mono)
  terminal: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 14,
  },
  terminalLarge: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 16,
  },
  terminalSmall: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
  },
  code: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 13,
  },
}
