import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import { searchGames, Game } from '@/lib/igdb'
import { requireSession } from '@/lib/auth/require-session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PSNPROFILES_BASE_URL = 'https://psnprofiles.com'

interface PSNGame {
  name: string
  platform: string | null
  trophyCompletion: number | null
  hasPlatinum: boolean
}

// Fetch and parse PSNProfiles page
async function fetchPSNProfileGames(username: string): Promise<{ games: PSNGame[], error?: string, errorType?: string }> {
  const url = `${PSNPROFILES_BASE_URL}/${encodeURIComponent(username)}/games`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (response.status === 404) {
      return {
        games: [],
        error: `PSN username "${username}" not found. Check the spelling or make sure your profile is public on PSNProfiles.`,
        errorType: 'psn_not_found',
      }
    }

    if (!response.ok) {
      console.error('PSNProfiles error:', response.status, response.statusText)
      return {
        games: [],
        error: 'Unable to fetch games right now. Try again later or use CSV import.',
        errorType: 'service_unavailable',
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Check for private profile
    const privateMessage = $('.page').text().toLowerCase()
    if (privateMessage.includes('private') || privateMessage.includes('hidden')) {
      return {
        games: [],
        error: 'This PSN profile is private. Change your privacy settings to Public on PlayStation, then update your PSNProfiles.',
        errorType: 'profile_private',
      }
    }

    const games: PSNGame[] = []

    // PSNProfiles game list structure - games are in table rows
    // Try multiple selectors as the structure may vary
    $('tr.game-row, .game-row, #gamesTable tr').each((_, element) => {
      const $row = $(element)

      // Get game name - try multiple selectors
      let name = $row.find('.title a').first().text().trim()
      if (!name) {
        name = $row.find('a.title').first().text().trim()
      }
      if (!name) {
        name = $row.find('.game-title').first().text().trim()
      }
      if (!name) {
        name = $row.find('td').first().find('a').first().text().trim()
      }

      if (!name) return // Skip if no name found

      // Get platform - look for platform tags/icons
      let platform: string | null = null
      const platformText = $row.find('.platform, .tag.platform').text().toLowerCase()
      const platformImg = $row.find('img[title]').attr('title')?.toLowerCase() || ''
      const combinedPlatform = platformText + ' ' + platformImg

      if (combinedPlatform.includes('ps5')) platform = 'PS5'
      else if (combinedPlatform.includes('ps4')) platform = 'PS4'
      else if (combinedPlatform.includes('ps3')) platform = 'PS3'
      else if (combinedPlatform.includes('vita')) platform = 'PSVita'
      else if (combinedPlatform.includes('psp')) platform = 'PSP'

      // Get trophy completion percentage
      let trophyCompletion: number | null = null
      const completionText = $row.find('.progress-bar span, .completion, .progress').text()
      const completionMatch = completionText.match(/(\d+)%/)
      if (completionMatch) {
        trophyCompletion = parseInt(completionMatch[1])
      }

      // Check for platinum
      const hasPlatinum = $row.find('.platinum, .trophy.platinum, img[src*="platinum"]').length > 0 ||
        $row.text().toLowerCase().includes('platinum')

      games.push({
        name,
        platform,
        trophyCompletion,
        hasPlatinum,
      })
    })

    // Alternative parsing if table structure is different
    if (games.length === 0) {
      // Try parsing game cards/divs
      $('.game, .game-card, [data-game]').each((_, element) => {
        const $game = $(element)
        const name = $game.find('.title, .game-title, h3, h4').first().text().trim()

        if (!name) return

        let platform: string | null = null
        const platformText = $game.text().toLowerCase()
        if (platformText.includes('ps5')) platform = 'PS5'
        else if (platformText.includes('ps4')) platform = 'PS4'
        else if (platformText.includes('ps3')) platform = 'PS3'
        else if (platformText.includes('vita')) platform = 'PSVita'

        games.push({
          name,
          platform,
          trophyCompletion: null,
          hasPlatinum: false,
        })
      })
    }

    // If still no games, check if profile exists but has no games
    if (games.length === 0) {
      const profileExists = $('.user-bar, .profile, #user-bar').length > 0
      if (profileExists) {
        // Profile exists but no games found
        return { games: [] }
      }
      // Could be a parsing issue
      console.warn('No games found for', username, '- page structure may have changed')
    }

    return { games }

  } catch (error) {
    console.error('Error fetching PSNProfiles:', error)
    return {
      games: [],
      error: 'Unable to fetch games right now. Try again later or use CSV import.',
      errorType: 'service_unavailable',
    }
  }
}

// Try to match a PlayStation game to IGDB
async function matchGameToIgdb(gameName: string): Promise<{ igdbId: number | null; cachedGame: Game | null }> {
  try {
    // Clean up the game name
    let cleanName = gameName
      .replace(/\s*\(PS[45]\)\s*/gi, '')
      .replace(/\s*-\s*PS[45]\s*$/gi, '')
      .replace(/™|®|©/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const results = await searchGames(cleanName, 10)

    if (results.length === 0) {
      return { igdbId: null, cachedGame: null }
    }

    const normalizedName = cleanName.toLowerCase()
    const psPatterns = ['playstation', 'ps1', 'ps2', 'ps3', 'ps4', 'ps5', 'psp', 'vita']

    // Try to find a match with PlayStation platform
    for (const game of results) {
      const gameNameLower = game.name.toLowerCase()
      const hasPSPlatform = game.platforms.some(p =>
        psPatterns.some(pattern => p.toLowerCase().includes(pattern))
      )

      if (gameNameLower === normalizedName && hasPSPlatform) {
        return { igdbId: game.id, cachedGame: game }
      }
    }

    // Try close match with PS platform
    for (const game of results) {
      const gameNameLower = game.name.toLowerCase()
      const hasPSPlatform = game.platforms.some(p =>
        psPatterns.some(pattern => p.toLowerCase().includes(pattern))
      )

      if (hasPSPlatform && (
        gameNameLower.startsWith(normalizedName) ||
        normalizedName.startsWith(gameNameLower) ||
        gameNameLower.includes(normalizedName) ||
        normalizedName.includes(gameNameLower)
      )) {
        return { igdbId: game.id, cachedGame: game }
      }
    }

    // Fall back to first result with PS platform
    const psGame = results.find(g =>
      g.platforms.some(p =>
        psPatterns.some(pattern => p.toLowerCase().includes(pattern))
      )
    )

    if (psGame) {
      return { igdbId: psGame.id, cachedGame: psGame }
    }

    return { igdbId: results[0].id, cachedGame: results[0] }

  } catch (error) {
    console.error(`Error matching game "${gameName}" to IGDB:`, error)
    return { igdbId: null, cachedGame: null }
  }
}

// Cache a game to games_cache table
async function cacheGame(game: Game): Promise<void> {
  try {
    await supabaseAdmin
      .from('games_cache')
      .upsert({
        id: game.id,
        name: game.name,
        slug: game.slug,
        summary: game.summary,
        cover_url: game.coverUrl,
        first_release_date: game.firstReleaseDate,
        genres: game.genres,
        platforms: game.platforms,
        rating: game.rating,
        cached_at: new Date().toISOString(),
      }, { onConflict: 'id' })
  } catch (error) {
    console.error('Error caching game:', error)
  }
}

// POST /api/import/playstation/username
// Import PlayStation games by PSN username via PSNProfiles.
// Auth: Authorization: Bearer <session.access_token>.
export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if ('error' in session) return session.error
  const user_id = session.user.id

  try {
    const body = await request.json()
    const { psn_username } = body

    if (!psn_username || typeof psn_username !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: psn_username' },
        { status: 400 }
      )
    }

    const cleanUsername = psn_username.trim()
    if (cleanUsername.length < 3 || cleanUsername.length > 16) {
      return NextResponse.json(
        { error: 'Invalid PSN username. Must be 3-16 characters.' },
        { status: 400 }
      )
    }

    console.log(`Fetching PSN games for user ${user_id}, PSN: ${cleanUsername}`)

    // Fetch games from PSNProfiles
    const { games: psnGames, error: fetchError, errorType } = await fetchPSNProfileGames(cleanUsername)

    if (fetchError) {
      // Collapse all upstream failures (not-found / private / unavailable) to a
      // single generic error so this route can't be used as an oracle to
      // enumerate PSN usernames or probe profile privacy.
      return NextResponse.json(
        { error: 'Could not import games from this PSN account.' },
        { status: 400 }
      )
    }

    if (psnGames.length === 0) {
      return NextResponse.json({
        success: true,
        total_games: 0,
        matched: 0,
        unmatched: 0,
        unmatched_games: [],
        message: 'No games found on this PSN profile.',
      })
    }

    console.log(`Found ${psnGames.length} games on PSNProfiles for ${cleanUsername}`)

    // Process results
    const results = {
      total_games: psnGames.length,
      matched: 0,
      unmatched: 0,
      unmatched_games: [] as string[],
      errors: 0,
    }

    const gamesToInsert: Array<{
      user_id: string
      platform: string
      platform_game_id: string
      igdb_game_id: number | null
      game_name: string
      playtime_minutes: number | null
      last_played_at: string | null
      achievements_earned: number | null
      achievements_total: number | null
      imported_at: string
    }> = []

    const seenGames = new Set<string>()

    // Process in batches
    const BATCH_SIZE = 5

    for (let i = 0; i < psnGames.length; i += BATCH_SIZE) {
      const batch = psnGames.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map(async (psnGame) => {
          const gameKey = psnGame.name.toLowerCase()

          // Skip duplicates
          if (seenGames.has(gameKey)) {
            return null
          }
          seenGames.add(gameKey)

          try {
            const { igdbId, cachedGame } = await matchGameToIgdb(psnGame.name)

            if (cachedGame) {
              await cacheGame(cachedGame)
            }

            // Calculate trophy progress as percentage (store as achievements_earned out of 100)
            const achievementsEarned = psnGame.trophyCompletion

            return {
              data: {
                user_id,
                platform: 'playstation',
                platform_game_id: `psn_${gameKey.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
                igdb_game_id: igdbId,
                game_name: psnGame.name,
                playtime_minutes: null,
                last_played_at: null,
                achievements_earned: achievementsEarned,
                achievements_total: achievementsEarned !== null ? 100 : null, // Store as percentage
                imported_at: new Date().toISOString(),
              },
              matched: igdbId !== null,
              gameName: psnGame.name,
            }
          } catch (error) {
            console.error(`Error processing game "${psnGame.name}":`, error)
            return null
          }
        })
      )

      // Collect results
      for (const result of batchResults) {
        if (result) {
          gamesToInsert.push(result.data)
          if (result.matched) {
            results.matched++
          } else {
            results.unmatched++
            results.unmatched_games.push(result.gameName)
          }
        }
      }

      // Rate limiting - 1 second delay between batches
      if (i + BATCH_SIZE < psnGames.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(`Processed ${Math.min(i + BATCH_SIZE, psnGames.length)}/${psnGames.length} games`)
    }

    // Insert all games
    if (gamesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('platform_games')
        .upsert(gamesToInsert, {
          onConflict: 'user_id,platform,platform_game_id',
        })

      if (insertError) {
        console.error('Error inserting platform games:', insertError)
        return NextResponse.json(
          { error: 'Failed to save imported games' },
          { status: 500 }
        )
      }
    }

    // Save/update platform connection with PSN username
    await supabaseAdmin
      .from('platform_connections')
      .upsert({
        user_id,
        platform: 'playstation',
        platform_user_id: cleanUsername,
        platform_username: cleanUsername,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      })

    console.log(`PSN import complete for ${cleanUsername}: ${gamesToInsert.length} imported, ${results.matched} matched, ${results.unmatched} unmatched`)

    return NextResponse.json({
      success: true,
      total_games: gamesToInsert.length,
      matched: results.matched,
      unmatched: results.unmatched,
      unmatched_games: results.unmatched_games.slice(0, 20),
      psn_username: cleanUsername,
    })

  } catch (error) {
    console.error('PSN username import error:', error)
    return NextResponse.json(
      { error: 'Failed to import PlayStation games' },
      { status: 500 }
    )
  }
}
