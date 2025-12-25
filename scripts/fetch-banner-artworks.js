// Script to fetch real IGDB screenshot URLs for banner library
// Run with: API_URL=https://sweaty-v1.vercel.app node scripts/fetch-banner-artworks.js

const API_URL = process.env.API_URL || 'https://sweaty-v1.vercel.app'

// Popular games to fetch screenshots for (sorted by popularity)
const GAMES_TO_FETCH = [
  { id: 119133, name: 'Elden Ring' },
  { id: 199113, name: 'God of War Ragnarök' },
  { id: 26758, name: 'Ghost of Tsushima' },
  { id: 25076, name: 'Red Dead Redemption 2' },
  { id: 1942, name: 'The Witcher 3' },
  { id: 1877, name: 'Cyberpunk 2077' },
  { id: 126459, name: 'Horizon Forbidden West' },
  { id: 11133, name: 'Dark Souls III' },
  { id: 7334, name: 'Bloodborne' },
  { id: 112917, name: 'Sekiro' },
  { id: 7346, name: 'Zelda: Breath of the Wild' },
  { id: 9767, name: 'Hollow Knight' },
  { id: 109462, name: 'Hades' },
  { id: 24268, name: 'Final Fantasy VII Remake' },
  { id: 24249, name: 'Persona 5' },
  { id: 36962, name: 'Death Stranding' },
  { id: 26950, name: 'The Last of Us Part II' },
  { id: 1020, name: "Marvel's Spider-Man" },
  { id: 119171, name: "Baldur's Gate 3" },
  { id: 96437, name: 'Starfield' },
]

async function fetchGameScreenshots() {
  console.log('Fetching real screenshot URLs from IGDB via API...\n')
  console.log(`API URL: ${API_URL}\n`)

  const results = []

  for (const game of GAMES_TO_FETCH) {
    try {
      const response = await fetch(`${API_URL}/api/games/${game.id}`)
      if (!response.ok) {
        console.log(`✗ ${game.name} - API error: ${response.status}`)
        continue
      }

      const data = await response.json()

      // Check for screenshots (preferred) or artworks (fallback)
      const screenshots = data.screenshotUrls || []
      const artworks = data.artworkUrls || []
      const images = screenshots.length > 0 ? screenshots : artworks
      const imageType = screenshots.length > 0 ? 'screenshot' : 'artwork'

      if (images.length > 0) {
        // Get up to 2 screenshots per game
        const gameBanners = images.slice(0, 2).map((url, index) => {
          const suffix = index === 0 ? '' : `-${index + 1}`
          return {
            id: game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + suffix,
            name: game.name + (index > 0 ? ` (${index + 1})` : ''),
            url: url,
            gameId: game.id,
          }
        })
        results.push(...gameBanners)
        console.log(`✓ ${game.name} - Found ${images.length} ${imageType}s`)
      } else {
        console.log(`✗ ${game.name} - No screenshots or artworks available`)
      }

      // Rate limit: wait 200ms between requests
      await new Promise(r => setTimeout(r, 200))
    } catch (error) {
      console.log(`✗ ${game.name} - Error: ${error.message}`)
    }
  }

  console.log('\n--- RESULTS ---')
  console.log(`Found ${results.length} valid banner URLs\n`)

  // Output as TypeScript constant
  console.log('// Copy this to mobile/src/constants/banners.ts:\n')
  console.log('export const BANNER_OPTIONS: BannerOption[] = [')
  for (const result of results) {
    console.log(`  {`)
    console.log(`    id: '${result.id}',`)
    console.log(`    name: '${result.name}',`)
    console.log(`    url: '${result.url}',`)
    console.log(`    gameId: ${result.gameId},`)
    console.log(`  },`)
  }
  console.log(']')
}

fetchGameScreenshots()
