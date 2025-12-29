import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchGames, Game } from '@/lib/igdb'

// Create a Supabase client with service role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Steam Web API
const STEAM_API_URL = 'https://api.steampowered.com'

interface SteamGame {
  appid: number
  name: string
  playtime_forever: number // Total playtime in minutes
  playtime_2weeks?: number // Playtime in last 2 weeks (minutes)
  img_icon_url?: string
  img_logo_url?: string
  has_community_visible_stats?: boolean
  rtime_last_played?: number // Unix timestamp of last play
}

interface SteamLibraryResponse {
  response: {
    game_count?: number
    games?: SteamGame[]
  }
}

// Fetch user's Steam library
async function getSteamLibrary(steamId: string): Promise<SteamGame[]> {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) {
    throw new Error('STEAM_API_KEY not configured')
  }

  const url = `${STEAM_API_URL}/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`)
  }

  const data: SteamLibraryResponse = await response.json()

  // Empty response usually means private profile
  if (!data.response.games) {
    return []
  }

  return data.response.games
}

// Try to match a Steam game to IGDB
// Returns the IGDB game ID if found, null otherwise
async function matchGameToIgdb(gameName: string): Promise<{ igdbId: number | null; cachedGame: Game | null }> {
  try {
    // Search IGDB for the game
    const results = await searchGames(gameName, 5)

    if (results.length === 0) {
      return { igdbId: null, cachedGame: null }
    }

    // Try to find an exact or close match
    const normalizedName = gameName.toLowerCase().trim()

    // First, try exact match
    let match = results.find(g =>
      g.name.toLowerCase().trim() === normalizedName
    )

    // If no exact match, try starts with
    if (!match) {
      match = results.find(g =>
        g.name.toLowerCase().trim().startsWith(normalizedName) ||
        normalizedName.startsWith(g.name.toLowerCase().trim())
      )
    }

    // If still no match, check if the first result has PC platform
    if (!match && results[0].platforms.some(p =>
      p.toLowerCase().includes('pc') ||
      p.toLowerCase().includes('windows') ||
      p.toLowerCase().includes('mac') ||
      p.toLowerCase().includes('linux')
    )) {
      match = results[0]
    }

    // Fall back to first result if nothing else matches
    if (!match) {
      match = results[0]
    }

    return { igdbId: match.id, cachedGame: match }
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

// POST /api/import/steam/sync
// Syncs user's Steam library to platform_games table
export async function POST(request: NextRequest) {
  try {
    // Get user_id from request body
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      )
    }

    // Get user's Steam connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('platform_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('platform', 'steam')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Steam account not linked. Please connect your Steam account first.' },
        { status: 400 }
      )
    }

    const steamId = connection.platform_user_id
    console.log(`Syncing Steam library for user ${user_id}, Steam ID: ${steamId}`)

    // Fetch Steam library
    const steamGames = await getSteamLibrary(steamId)

    if (steamGames.length === 0) {
      return NextResponse.json({
        error: 'No games found. Your Steam profile may be private. Please set your game details to public in Steam privacy settings.',
        is_private: true,
      }, { status: 400 })
    }

    console.log(`Found ${steamGames.length} games in Steam library`)

    // Process games and try to match to IGDB
    const results = {
      imported: 0,
      matched: 0,
      unmatched: 0,
      unmatched_games: [] as string[],
      errors: 0,
    }

    // Process in batches to avoid overwhelming IGDB
    const BATCH_SIZE = 10
    const gamesToInsert: Array<{
      user_id: string
      platform: string
      platform_game_id: string
      igdb_game_id: number | null
      game_name: string
      playtime_minutes: number | null
      last_played_at: string | null
      imported_at: string
    }> = []

    for (let i = 0; i < steamGames.length; i += BATCH_SIZE) {
      const batch = steamGames.slice(i, i + BATCH_SIZE)

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (steamGame) => {
          try {
            // Try to match to IGDB
            const { igdbId, cachedGame } = await matchGameToIgdb(steamGame.name)

            // Cache the matched game if found
            if (cachedGame) {
              await cacheGame(cachedGame)
            }

            return {
              user_id,
              platform: 'steam',
              platform_game_id: steamGame.appid.toString(),
              igdb_game_id: igdbId,
              game_name: steamGame.name,
              playtime_minutes: steamGame.playtime_forever || null,
              last_played_at: steamGame.rtime_last_played
                ? new Date(steamGame.rtime_last_played * 1000).toISOString()
                : null,
              imported_at: new Date().toISOString(),
              matched: igdbId !== null,
            }
          } catch (error) {
            console.error(`Error processing game ${steamGame.name}:`, error)
            results.errors++
            return null
          }
        })
      )

      // Collect results
      for (const result of batchResults) {
        if (result) {
          const { matched, ...gameData } = result
          gamesToInsert.push(gameData)

          if (matched) {
            results.matched++
          } else {
            results.unmatched++
            results.unmatched_games.push(result.game_name)
          }
        }
      }

      // Small delay between batches to be nice to IGDB rate limits
      if (i + BATCH_SIZE < steamGames.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Log progress
      console.log(`Processed ${Math.min(i + BATCH_SIZE, steamGames.length)}/${steamGames.length} games`)
    }

    // Insert all games into platform_games (upsert to handle re-syncs)
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

      results.imported = gamesToInsert.length
    }

    // Update last_synced_at on the connection
    await supabaseAdmin
      .from('platform_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)

    console.log(`Steam sync complete: ${results.imported} imported, ${results.matched} matched, ${results.unmatched} unmatched`)

    return NextResponse.json({
      success: true,
      imported: results.imported,
      matched: results.matched,
      unmatched: results.unmatched,
      unmatched_games: results.unmatched_games.slice(0, 20), // Limit to first 20
      errors: results.errors,
    })

  } catch (error) {
    console.error('Steam sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync Steam library' },
      { status: 500 }
    )
  }
}
