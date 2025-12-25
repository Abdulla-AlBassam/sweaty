// Script to fetch real IGDB artwork URLs for banner library
// Run with: API_URL=https://sweaty-v1.vercel.app node scripts/fetch-banner-artworks.js

const API_URL = process.env.API_URL || 'https://sweaty-v1.vercel.app'

const GAMES_TO_FETCH = [
  { id: 119133, name: 'Elden Ring' },
  { id: 119388, name: 'Zelda: Tears of the Kingdom' },
  { id: 199113, name: 'God of War Ragnarök' },
  { id: 26758, name: 'Ghost of Tsushima' },
  { id: 126459, name: 'Horizon Forbidden West' },
  { id: 25076, name: 'Red Dead Redemption 2' },
  { id: 11133, name: 'Dark Souls III' },
  { id: 112917, name: 'Sekiro: Shadows Die Twice' },
  { id: 7334, name: 'Bloodborne' },
  { id: 1877, name: 'Cyberpunk 2077' },
  { id: 131913, name: 'Mass Effect Legendary' },
  { id: 96437, name: 'Starfield' },
  { id: 119161, name: 'Halo Infinite' },
  { id: 1942, name: 'The Witcher 3' },
  { id: 119171, name: "Baldur's Gate 3" },
  { id: 205827, name: 'Final Fantasy XVI' },
  { id: 24249, name: 'Persona 5 Royal' },
  { id: 233231, name: 'Resident Evil 4 Remake' },
  { id: 135525, name: 'Alan Wake 2' },
  { id: 9767, name: 'Hollow Knight' },
  { id: 109462, name: 'Hades' },
  { id: 26192, name: 'Celeste' },
  { id: 114795, name: 'Apex Legends' },
  { id: 138585, name: 'Valorant' },
  { id: 26726, name: 'Super Mario Odyssey' },
  { id: 135480, name: 'Metroid Dread' },
  { id: 109462, name: 'Animal Crossing: New Horizons' },
  { id: 17000, name: 'Stardew Valley' },
]

async function fetchGameArtworks() {
  console.log('Fetching real artwork URLs from IGDB via API...\n')

  const results = []

  for (const game of GAMES_TO_FETCH) {
    try {
      const response = await fetch(`${API_URL}/api/games/${game.id}`)
      if (!response.ok) {
        console.log(`✗ ${game.name} - API error: ${response.status}`)
        continue
      }

      const data = await response.json()

      if (data.artworkUrls && data.artworkUrls.length > 0) {
        // Get the first artwork URL (best quality)
        const artworkUrl = data.artworkUrls[0]
        results.push({
          id: game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-'),
          name: game.name,
          url: artworkUrl,
          gameId: game.id,
        })
        console.log(`✓ ${game.name} - Found artwork`)
      } else {
        console.log(`✗ ${game.name} - No artworks available`)
      }

      // Rate limit: wait 200ms between requests
      await new Promise(r => setTimeout(r, 200))
    } catch (error) {
      console.log(`✗ ${game.name} - Error: ${error.message}`)
    }
  }

  console.log('\n--- RESULTS ---')
  console.log(`Found ${results.length} valid artwork URLs\n`)

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

fetchGameArtworks()
