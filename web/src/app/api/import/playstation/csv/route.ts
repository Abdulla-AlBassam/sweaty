import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchGames, Game } from '@/lib/igdb'

// Create a Supabase client with service role for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Column name variations for different CSV formats
const GAME_NAME_COLUMNS = [
  'game name', 'game_name', 'gamename',
  'title', 'name', 'game title', 'game_title',
  'content_name', 'content name', 'contentname',
  'product name', 'product_name', 'productname',
]

const PLATFORM_COLUMNS = [
  'platform', 'console', 'system',
  'device', 'device_type', 'device type',
]

const DATE_COLUMNS = [
  'purchase date', 'purchase_date', 'purchasedate',
  'date_of_purchase', 'date of purchase',
  'acquired', 'acquired_date', 'date',
  'played_at', 'last_played', 'last played',
]

const PLAYTIME_COLUMNS = [
  'playtime', 'play_time', 'play time',
  'hours', 'hours_played', 'hours played',
  'time_played', 'time played',
]

const TROPHY_COLUMNS = [
  'trophies', 'trophy', 'trophy_count',
  'completion', 'completion_percentage', 'completion %',
  'progress', 'achievements',
]

// Patterns to skip (DLC, themes, avatars, etc.)
const SKIP_PATTERNS = [
  /\btheme\b/i,
  /\bavatar\b/i,
  /\bdlc\b/i,
  /\bexpansion pass\b/i,
  /\bseason pass\b/i,
  /\bps plus\b/i,
  /\bps now\b/i,
  /\bplaystation plus\b/i,
  /\bplaystation now\b/i,
  /\btrial\b/i,
  /\bdemo\b/i,
  /\bbeta\b/i,
  /\bsoundtrack\b/i,
  /\bartbook\b/i,
  /\bdigital art\b/i,
  /\bbonus content\b/i,
  /\badd-on\b/i,
  /\baddon\b/i,
  /\bvr experience\b/i,
  /\bdynamic theme\b/i,
  /\bstatic theme\b/i,
]

// Parse CSV content into rows
function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

  // Parse data rows
  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })
    rows.push(row)
  }

  return rows
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

// Find a value in a row by trying multiple column names
function findValue(row: Record<string, string>, columnNames: string[]): string | null {
  for (const colName of columnNames) {
    if (row[colName] && row[colName].trim()) {
      return row[colName].trim()
    }
  }
  return null
}

// Check if a game name should be skipped
function shouldSkip(gameName: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(gameName))
}

// Extract PlayStation platform from string
function extractPSPlatform(platformStr: string | null): string | null {
  if (!platformStr) return null

  const lower = platformStr.toLowerCase()
  if (lower.includes('ps5') || lower.includes('playstation 5')) return 'PS5'
  if (lower.includes('ps4') || lower.includes('playstation 4')) return 'PS4'
  if (lower.includes('ps3') || lower.includes('playstation 3')) return 'PS3'
  if (lower.includes('vita') || lower.includes('psvita')) return 'PSVita'
  if (lower.includes('ps2') || lower.includes('playstation 2')) return 'PS2'
  if (lower.includes('ps1') || lower.includes('playstation 1') || lower.includes('psx')) return 'PS1'
  if (lower.includes('psp')) return 'PSP'

  return null
}

// Try to match a PlayStation game to IGDB
async function matchGameToIgdb(gameName: string): Promise<{ igdbId: number | null; cachedGame: Game | null }> {
  try {
    // Clean up the game name
    let cleanName = gameName
      .replace(/\s*\(PS[45]\)\s*/gi, '') // Remove (PS4), (PS5)
      .replace(/\s*-\s*PS[45]\s*$/gi, '') // Remove - PS4, - PS5 suffix
      .replace(/™|®|©/g, '') // Remove trademark symbols
      .replace(/\s+/g, ' ')
      .trim()

    const results = await searchGames(cleanName, 10)

    if (results.length === 0) {
      return { igdbId: null, cachedGame: null }
    }

    const normalizedName = cleanName.toLowerCase()

    // PlayStation platform names to look for
    const psPatterns = ['playstation', 'ps1', 'ps2', 'ps3', 'ps4', 'ps5', 'psp', 'vita']

    // Try to find a match with PlayStation platform
    for (const game of results) {
      const gameNameLower = game.name.toLowerCase()
      const hasPSPlatform = game.platforms.some(p =>
        psPatterns.some(pattern => p.toLowerCase().includes(pattern))
      )

      // Exact match with PS platform
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

    // Last resort: first result
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

// POST /api/import/playstation/csv
// Import PlayStation games from CSV file
export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('user_id') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const content = await file.text()
    const rows = parseCSV(content)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or could not be parsed' },
        { status: 400 }
      )
    }

    console.log(`Processing ${rows.length} rows from PlayStation CSV for user ${userId}`)

    // Process results
    const results = {
      total_rows: rows.length,
      imported: 0,
      matched: 0,
      unmatched: 0,
      skipped: 0,
      unmatched_games: [] as string[],
      matched_games: [] as Array<{
        igdb_id: number
        name: string
        cover_url: string | null
        platform: string | null
      }>,
      errors: 0,
    }

    // Process games
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
    const BATCH_SIZE = 10

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map(async (row) => {
          // Find game name
          const gameName = findValue(row, GAME_NAME_COLUMNS)
          if (!gameName) {
            return { skip: true, reason: 'no_name' }
          }

          // Skip non-game content
          if (shouldSkip(gameName)) {
            return { skip: true, reason: 'skip_pattern' }
          }

          // Skip duplicates
          const gameKey = gameName.toLowerCase()
          if (seenGames.has(gameKey)) {
            return { skip: true, reason: 'duplicate' }
          }
          seenGames.add(gameKey)

          // Extract optional fields
          const platformStr = findValue(row, PLATFORM_COLUMNS)
          const psPlatform = extractPSPlatform(platformStr)

          const dateStr = findValue(row, DATE_COLUMNS)
          let lastPlayedAt: string | null = null
          if (dateStr) {
            try {
              const date = new Date(dateStr)
              if (!isNaN(date.getTime())) {
                lastPlayedAt = date.toISOString()
              }
            } catch {
              // Ignore invalid dates
            }
          }

          const playtimeStr = findValue(row, PLAYTIME_COLUMNS)
          let playtimeMinutes: number | null = null
          if (playtimeStr) {
            const hours = parseFloat(playtimeStr)
            if (!isNaN(hours)) {
              playtimeMinutes = Math.round(hours * 60)
            }
          }

          const trophyStr = findValue(row, TROPHY_COLUMNS)
          let trophiesEarned: number | null = null
          if (trophyStr) {
            const trophies = parseInt(trophyStr)
            if (!isNaN(trophies)) {
              trophiesEarned = trophies
            }
          }

          // Match to IGDB
          try {
            const { igdbId, cachedGame } = await matchGameToIgdb(gameName)

            if (cachedGame) {
              await cacheGame(cachedGame)
            }

            return {
              skip: false,
              data: {
                user_id: userId,
                platform: 'playstation',
                platform_game_id: `psn_${gameKey.replace(/\s+/g, '_')}`,
                igdb_game_id: igdbId,
                game_name: gameName,
                playtime_minutes: playtimeMinutes,
                last_played_at: lastPlayedAt,
                achievements_earned: trophiesEarned,
                achievements_total: null,
                imported_at: new Date().toISOString(),
              },
              matched: igdbId !== null,
              gameName,
              psPlatform,
              cachedGame,
            }
          } catch (error) {
            console.error(`Error processing game "${gameName}":`, error)
            return { skip: true, reason: 'error', error }
          }
        })
      )

      // Collect results
      for (const result of batchResults) {
        if (result.skip) {
          if (result.reason === 'skip_pattern') {
            results.skipped++
          } else if (result.reason === 'error') {
            results.errors++
          }
          // Don't count duplicates or no_name as skipped
        } else if (result.data) {
          gamesToInsert.push(result.data)
          if (result.matched && result.cachedGame) {
            results.matched++
            // Add to matched games list for review UI
            results.matched_games.push({
              igdb_id: result.cachedGame.id,
              name: result.cachedGame.name,
              cover_url: result.cachedGame.coverUrl,
              platform: result.psPlatform || null,
            })
          } else {
            results.unmatched++
            if (result.gameName) {
              results.unmatched_games.push(result.gameName)
            }
          }
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < rows.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`Processed ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} rows`)
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

      results.imported = gamesToInsert.length
    }

    // Save/update platform connection to track import
    await supabaseAdmin
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform: 'playstation',
        platform_user_id: `csv_import_${userId}`,
        platform_username: null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      })

    console.log(`PlayStation CSV import complete: ${results.imported} imported, ${results.matched} matched, ${results.unmatched} unmatched, ${results.skipped} skipped`)

    return NextResponse.json({
      success: true,
      total_rows: results.total_rows,
      imported: results.imported,
      matched: results.matched,
      unmatched: results.unmatched,
      skipped: results.skipped,
      unmatched_games: results.unmatched_games.slice(0, 20),
      matched_games: results.matched_games,
      errors: results.errors,
    })

  } catch (error) {
    console.error('PlayStation CSV import error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}
