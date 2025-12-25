// Script to fetch hero/banner images from SteamGridDB
// Run with: node scripts/fetch-steamgrid-banners.js

const API_KEY = '215b9c0447f3847d9ed51073b3a0598c'

// Games to fetch banners for
const GAMES = [
  'Elden Ring',
  'God of War Ragnarok',
  'Ghost of Tsushima',
  'Red Dead Redemption 2',
  'The Witcher 3',
  'Cyberpunk 2077',
  'Horizon Forbidden West',
  'Dark Souls III',
  'Bloodborne',
  'Sekiro Shadows Die Twice',
  'Zelda Breath of the Wild',
  'Hollow Knight',
  'Hades',
  'Final Fantasy VII Remake',
  'Persona 5',
  'Death Stranding',
  'The Last of Us Part II',
  'Spider-Man PS5',
  'Baldurs Gate 3',
  'Starfield',
]

async function searchGame(name) {
  const response = await fetch(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(name)}`,
    {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    }
  )

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`)
  }

  const data = await response.json()
  return data.data?.[0] // Return first match
}

async function getHeroes(gameId) {
  const response = await fetch(
    `https://www.steamgriddb.com/api/v2/heroes/game/${gameId}`,
    {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    }
  )

  if (!response.ok) {
    throw new Error(`Heroes failed: ${response.status}`)
  }

  const data = await response.json()
  return data.data || []
}

async function fetchBanners() {
  console.log('Fetching hero images from SteamGridDB...\n')

  const results = []

  for (const gameName of GAMES) {
    try {
      // Search for the game
      const game = await searchGame(gameName)

      if (!game) {
        console.log(`✗ ${gameName} - Not found`)
        continue
      }

      // Get hero images
      const heroes = await getHeroes(game.id)

      if (heroes.length === 0) {
        console.log(`✗ ${gameName} - No heroes available`)
        continue
      }

      // Get the first hero image
      const hero = heroes[0]
      const id = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

      results.push({
        id: id,
        name: gameName,
        url: hero.url,
      })

      console.log(`✓ ${gameName} - Found hero image`)

      // Rate limit
      await new Promise(r => setTimeout(r, 300))
    } catch (error) {
      console.log(`✗ ${gameName} - Error: ${error.message}`)
    }
  }

  console.log('\n--- RESULTS ---')
  console.log(`Found ${results.length} banners\n`)

  // Output as TypeScript
  console.log('// Copy this to mobile/src/constants/banners.ts:\n')
  console.log('export interface BannerOption {')
  console.log('  id: string')
  console.log('  name: string')
  console.log('  url: string')
  console.log('}\n')
  console.log('export const BANNER_OPTIONS: BannerOption[] = [')
  for (const result of results) {
    console.log(`  {`)
    console.log(`    id: '${result.id}',`)
    console.log(`    name: '${result.name}',`)
    console.log(`    url: '${result.url}',`)
    console.log(`  },`)
  }
  console.log(']')
}

fetchBanners()
