#!/usr/bin/env node
/**
 * Fetch top open world games from IGDB
 * Usage: node scripts/fetch-open-world.js
 */

const path = require('path');
const fs = require('fs');

// Load .env.local from web directory
const envPath = path.join(__dirname, '..', 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const CLIENT_ID = env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = env.TWITCH_CLIENT_SECRET;

async function getToken() {
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, {
    method: 'POST'
  });
  const data = await res.json();
  return data.access_token;
}

async function igdbQuery(token, endpoint, query) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: query
  });
  return res.json();
}

async function main() {
  const token = await getToken();

  // Step 1: Find the "Open world" theme ID
  console.log('--- Finding Open World theme ID ---');
  const themes = await igdbQuery(token, 'themes', 'fields name; where name ~ *"Open world"*; limit 10;');
  console.log(themes);
  const openWorldId = themes.find(t => t.name === 'Open world')?.id;
  if (!openWorldId) { console.error('Could not find Open World theme'); return; }
  console.log(`Open World theme ID: ${openWorldId}\n`);

  // Step 2: Fetch top open world games (page 1 + 2 for 100 results)
  console.log('--- Top Open World Games (by total_rating) ---\n');

  const page1 = await igdbQuery(token, 'games',
    `fields name,total_rating,total_rating_count,first_release_date,platforms.name,genres.name;
     where themes = (${openWorldId}) & category = 0 & total_rating > 70 & total_rating_count > 10;
     sort total_rating desc;
     limit 50; offset 0;`
  );

  const page2 = await igdbQuery(token, 'games',
    `fields name,total_rating,total_rating_count,first_release_date,platforms.name,genres.name;
     where themes = (${openWorldId}) & category = 0 & total_rating > 70 & total_rating_count > 10;
     sort total_rating desc;
     limit 50; offset 50;`
  );

  const games = [...page1, ...page2];

  games.forEach((g, i) => {
    const date = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : '?';
    const rating = g.total_rating ? g.total_rating.toFixed(1) : '?';
    const count = g.total_rating_count || 0;
    const genres = g.genres?.map(x => x.name).join(', ') || '';
    console.log(`${(i+1).toString().padStart(3)}. [${g.id}] ${g.name} (${date}) — ${rating}/100 (${count} ratings) — ${genres}`);
  });

  console.log(`\n--- Total: ${games.length} games ---`);

  // Output game IDs as array for SQL
  const ids = games.map(g => g.id);
  console.log(`\nGame IDs array:\n{${ids.join(',')}}`);
}

main().catch(console.error);
