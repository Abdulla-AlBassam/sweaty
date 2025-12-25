// Script to fetch game screenshots from RAWG API (free, no auth required)
// Run with: node scripts/fetch-rawg-banners.js

// Popular games with their RAWG slugs
const GAMES = [
  { slug: 'elden-ring', name: 'Elden Ring' },
  { slug: 'god-of-war-ragnarok', name: 'God of War Ragnarök' },
  { slug: 'ghost-of-tsushima', name: 'Ghost of Tsushima' },
  { slug: 'red-dead-redemption-2', name: 'Red Dead Redemption 2' },
  { slug: 'the-witcher-3-wild-hunt', name: 'The Witcher 3' },
  { slug: 'cyberpunk-2077', name: 'Cyberpunk 2077' },
  { slug: 'horizon-forbidden-west', name: 'Horizon Forbidden West' },
  { slug: 'dark-souls-iii', name: 'Dark Souls III' },
  { slug: 'bloodborne', name: 'Bloodborne' },
  { slug: 'sekiro-shadows-die-twice', name: 'Sekiro' },
  { slug: 'the-legend-of-zelda-breath-of-the-wild', name: 'Zelda: Breath of the Wild' },
  { slug: 'hollow-knight', name: 'Hollow Knight' },
  { slug: 'hades-2', name: 'Hades' },
  { slug: 'final-fantasy-vii-remake', name: 'Final Fantasy VII Remake' },
  { slug: 'persona-5', name: 'Persona 5' },
  { slug: 'death-stranding', name: 'Death Stranding' },
  { slug: 'the-last-of-us-part-ii', name: 'The Last of Us Part II' },
  { slug: 'marvels-spider-man', name: "Marvel's Spider-Man" },
  { slug: 'baldurs-gate-3', name: "Baldur's Gate 3" },
  { slug: 'starfield', name: 'Starfield' },
]

async function fetchBanners() {
  console.log('Fetching screenshots from RAWG API...\n')

  const results = []

  for (const game of GAMES) {
    try {
      // RAWG API - free tier allows requests without API key
      const response = await fetch(`https://api.rawg.io/api/games/${game.slug}?key=c542e67aec3a4340908f9de9e86038af`)

      if (!response.ok) {
        console.log(`✗ ${game.name} - API error: ${response.status}`)
        continue
      }

      const data = await response.json()

      // RAWG returns background_image (main banner) and short_screenshots
      if (data.background_image) {
        results.push({
          id: game.slug,
          name: game.name,
          url: data.background_image,
        })
        console.log(`✓ ${game.name} - Found banner`)
      } else {
        console.log(`✗ ${game.name} - No background image`)
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 250))
    } catch (error) {
      console.log(`✗ ${game.name} - Error: ${error.message}`)
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
