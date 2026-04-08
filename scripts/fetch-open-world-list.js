#!/usr/bin/env node
/**
 * Fetch IGDB IDs for curated open world games list
 * Compiled from GamesRadar, TheGamer, Den of Geek, Gameranx, GameRant, PCGamesN
 *
 * Usage: node scripts/fetch-open-world-list.js
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

// Master list: ~100 open world games compiled from multiple "best of" lists
const OPEN_WORLD_GAMES = [
  // === CONSENSUS TOP TIER (appeared on 4+ lists) ===
  "Elden Ring",
  "Red Dead Redemption 2",
  "The Witcher 3: Wild Hunt",
  "Grand Theft Auto V",
  "Cyberpunk 2077",
  "Minecraft",

  // === APPEARED ON 3+ LISTS ===
  "The Legend of Zelda: Breath of the Wild",
  "The Legend of Zelda: Tears of the Kingdom",
  "Marvel's Spider-Man",
  "Ghost of Tsushima",
  "Horizon Zero Dawn",
  "Horizon Forbidden West",
  "Metal Gear Solid V: The Phantom Pain",
  "The Elder Scrolls V: Skyrim",
  "The Elder Scrolls III: Morrowind",
  "Batman: Arkham City",
  "Fallout 4",
  "No Man's Sky",
  "Forza Horizon 5",

  // === APPEARED ON 2 LISTS ===
  "Red Dead Redemption",
  "Fallout: New Vegas",
  "Fallout 3",
  "Death Stranding",
  "Dragon's Dogma 2",
  "Far Cry 3",
  "Assassin's Creed IV: Black Flag",
  "Assassin's Creed Shadows",
  "Kingdom Come: Deliverance II",
  "Days Gone",
  "Dragon Age: Inquisition",
  "NieR: Automata",
  "Subnautica",
  "Shadow of the Colossus",
  "Sleeping Dogs",
  "Dying Light",
  "Marvel's Spider-Man 2",
  "Monster Hunter Wilds",
  "Starfield",
  "Far Cry 5",

  // === NOTABLE SINGLE-LIST PICKS ===
  "The Elder Scrolls IV: Oblivion",
  "Grand Theft Auto: San Andreas",
  "Grand Theft Auto IV",
  "God of War Ragnarök",
  "Bloodborne",
  "Dark Souls",
  "Dark Souls III",
  "Assassin's Creed II",
  "Assassin's Creed: Odyssey",
  "Assassin's Creed Valhalla",
  "Assassin's Creed Origins",
  "Kingdom Come: Deliverance",
  "Hogwarts Legacy",
  "Spider-Man: Miles Morales",
  "Middle-Earth: Shadow of Mordor",
  "Middle-Earth: Shadow of War",
  "Far Cry 2",
  "Far Cry 4",
  "Far Cry 6",
  "Batman: Arkham Asylum",
  "Batman: Arkham Knight",
  "Just Cause 2",
  "Just Cause 3",
  "Watch Dogs 2",
  "Saints Row: The Third",
  "Borderlands 2",
  "Star Wars Jedi: Survivor",
  "Star Wars Outlaws",
  "Shenmue",
  "Yakuza 0",
  "Yakuza: Like a Dragon",
  "Infamous Second Son",
  "Mad Max",
  "Xenoblade Chronicles",
  "Xenoblade Chronicles 3",
  "Sea of Thieves",
  "Genshin Impact",
  "The Outer Worlds",
  "Kingdoms of Amalur: Reckoning",
  "S.T.A.L.K.E.R.: Shadow of Chernobyl",
  "Red Faction: Guerrilla",
  "Mafia II",
  "Dying Light 2 Stay Human",
  "Ghost of Yotei",
  "Death Stranding 2: On the Beach",
  "Rise of the Ronin",
  "Avatar: Frontiers of Pandora",
  "Halo Infinite",
  "Dragon's Dogma: Dark Arisen",
  "Terraria",
  "Valheim",
  "Grand Theft Auto: Vice City",
  "Baldur's Gate 3",
  "The Legend of Zelda: Ocarina of Time",
  "Immortals Fenyx Rising",
  "Saints Row 2",
  "Burnout Paradise",
  "Palworld",
  "Crackdown",
];

async function getToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  return (await res.json()).access_token;
}

async function igdbQuery(token, endpoint, query) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: query,
  });
  return res.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const token = await getToken();
  const found = [];
  const notFound = [];

  console.log(`Searching IGDB for ${OPEN_WORLD_GAMES.length} open world games...\n`);

  for (let i = 0; i < OPEN_WORLD_GAMES.length; i++) {
    const name = OPEN_WORLD_GAMES[i];

    // Search for the game, prefer exact/close matches, base games only
    const results = await igdbQuery(token, 'games',
      `search "${name}";
       fields name,total_rating,total_rating_count,first_release_date,parent_game,version_parent;
       where parent_game = null & version_parent = null;
       limit 5;`
    );

    // Find best match (prefer exact name match, then closest)
    let match = results.find(g => g.name.toLowerCase() === name.toLowerCase());
    if (!match) match = results.find(g => g.name.toLowerCase().startsWith(name.toLowerCase().split(':')[0]));
    if (!match && results.length > 0) match = results[0];

    if (match) {
      const yr = match.first_release_date ? new Date(match.first_release_date * 1000).getFullYear() : '?';
      const rat = match.total_rating ? match.total_rating.toFixed(1) : '?';
      found.push({ id: match.id, name: match.name, year: yr, rating: rat, searchName: name });
      console.log(`  ✓ [${match.id}] ${match.name} (${yr}) — ${rat}/100`);
    } else {
      notFound.push(name);
      console.log(`  ✗ NOT FOUND: ${name}`);
    }

    // Rate limit: ~3 req/sec
    if (i % 3 === 2) await sleep(1000);
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Found: ${found.length}/${OPEN_WORLD_GAMES.length}`);
  console.log(`Not found: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log(`\nMissing games:`);
    notFound.forEach(n => console.log(`  - ${n}`));
  }

  // Output game IDs for Supabase
  const ids = found.map(g => g.id);
  console.log(`\n=== GAME IDS (for curated_lists.game_ids) ===`);
  console.log(`{${ids.join(',')}}`);

  // Output SQL
  console.log(`\n=== SQL INSERT ===`);
  console.log(`INSERT INTO curated_lists (slug, title, description, game_ids, display_order, is_active)`);
  console.log(`VALUES (`);
  console.log(`  'open-world-epics',`);
  console.log(`  'Open World Epics',`);
  console.log(`  'The greatest open world games of all time',`);
  console.log(`  ARRAY[${ids.join(',')}]::bigint[],`);
  console.log(`  22,`);
  console.log(`  true`);
  console.log(`);`);

  // Output full list for review
  console.log(`\n=== FULL LIST (for review) ===`);
  found.forEach((g, i) => {
    console.log(`${(i+1).toString().padStart(3)}. [${g.id}] ${g.name} (${g.year}) — ${g.rating}/100`);
  });
}

main().catch(console.error);
