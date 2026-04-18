// Catalogue of candidate filter values for the Search > Discover surface.
// Values are matched case-insensitively as whole words against each curated
// list's title + description. Keep lists small and concrete — options with
// zero matching lists are hidden automatically at render time.
export const DISCOVER_FILTERS = {
  platform: ['PlayStation', 'Xbox', 'Nintendo', 'Switch', 'PC'],
  genre: [
    'RPG', 'FPS', 'Horror', 'Indie', 'Racing', 'Sports',
    'Strategy', 'Fighting', 'Puzzle', 'Platformer', 'Shooter', 'Adventure',
  ],
  release: ['2025', '2024', '2023', '2022', '2020s', '2010s', '2000s', '90s', '80s', 'Retro'],
} as const

export type DiscoverFacet = keyof typeof DISCOVER_FILTERS
