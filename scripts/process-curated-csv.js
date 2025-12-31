#!/usr/bin/env node
/**
 * Process Curated Lists CSV
 *
 * Reads a CSV file with curated game lists, searches IGDB for each game,
 * and generates SQL UPDATE statements for the curated_lists table.
 *
 * CSV Format:
 *   list_slug,game_name[,release_year][,developer]
 *
 * Usage:
 *   API_URL=https://sweaty-v1.vercel.app node scripts/process-curated-csv.js database/sweaty-curated-lists.csv
 */

const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'https://sweaty-v1.vercel.app';

// Parse CSV file
function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.trim().split('\n');

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('list') ? 1 : 0;

  const lists = new Map();

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted values
    const parts = parseCsvLine(line);
    if (parts.length < 2) continue;

    const [listSlug, gameName, releaseYear, developer] = parts;

    if (!lists.has(listSlug)) {
      lists.set(listSlug, []);
    }

    lists.get(listSlug).push({
      name: gameName.trim(),
      releaseYear: releaseYear?.trim() || null,
      developer: developer?.trim() || null
    });
  }

  return lists;
}

// Parse a single CSV line handling quotes
function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts.map(p => p.replace(/^"|"$/g, '').trim());
}

// Search IGDB for a game
async function searchGame(gameName, releaseYear = null, developer = null) {
  try {
    const response = await fetch(`${API_URL}/api/games/search?q=${encodeURIComponent(gameName)}`);
    if (!response.ok) {
      console.error(`  Search failed for "${gameName}": ${response.status}`);
      return null;
    }

    const games = await response.json();
    if (!games || games.length === 0) {
      console.error(`  No results for "${gameName}"`);
      return null;
    }

    // Smart disambiguation
    let bestMatch = games[0];

    // If we have a release year, find exact match
    if (releaseYear) {
      const yearMatch = games.find(g => {
        if (!g.firstReleaseDate) return false;
        const gameYear = new Date(g.firstReleaseDate).getFullYear().toString();
        return gameYear === releaseYear;
      });
      if (yearMatch) bestMatch = yearMatch;
    }

    // If name is exact match (case insensitive), prefer it
    const exactMatch = games.find(g =>
      g.name.toLowerCase() === gameName.toLowerCase()
    );
    if (exactMatch) bestMatch = exactMatch;

    return bestMatch;
  } catch (error) {
    console.error(`  Error searching for "${gameName}":`, error.message);
    return null;
  }
}

// Main processing function
async function processCSV(csvPath) {
  console.log('=== Curated Lists CSV Processor ===');
  console.log(`API URL: ${API_URL}`);
  console.log(`CSV File: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`);
    process.exit(1);
  }

  const lists = parseCSV(csvPath);
  console.log(`Found ${lists.size} lists\n`);

  const results = new Map();
  const notFound = [];

  for (const [slug, games] of lists) {
    console.log(`\n--- Processing: ${slug} (${games.length} games) ---`);
    const gameIds = [];

    for (const game of games) {
      process.stdout.write(`  Searching: ${game.name}... `);

      const result = await searchGame(game.name, game.releaseYear, game.developer);

      if (result) {
        console.log(`Found: ${result.name} (ID: ${result.id})`);
        gameIds.push(result.id);

        // Rate limit - 200ms between requests
        await new Promise(r => setTimeout(r, 200));
      } else {
        console.log('NOT FOUND');
        notFound.push({ list: slug, game: game.name });
      }
    }

    results.set(slug, gameIds);
    console.log(`  Completed: ${gameIds.length}/${games.length} games found`);
  }

  // Generate SQL
  console.log('\n\n=== SQL UPDATE STATEMENTS ===\n');
  console.log('-- Copy and paste these into Supabase SQL Editor\n');

  for (const [slug, gameIds] of results) {
    if (gameIds.length > 0) {
      console.log(`UPDATE curated_lists SET game_ids = ARRAY[${gameIds.join(', ')}]::BIGINT[] WHERE slug = '${slug}';`);
    }
  }

  // Report not found games
  if (notFound.length > 0) {
    console.log('\n\n=== GAMES NOT FOUND ===\n');
    for (const { list, game } of notFound) {
      console.log(`  ${list}: "${game}"`);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Lists processed: ${results.size}`);
  console.log(`Games not found: ${notFound.length}`);
}

// Run
const csvPath = process.argv[2] || 'database/sweaty-curated-lists.csv';
processCSV(path.resolve(csvPath));
