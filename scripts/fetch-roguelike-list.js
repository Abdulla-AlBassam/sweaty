#!/usr/bin/env node
/**
 * Fetch IGDB IDs for Roguelike Essentials curated list
 * Sources: Rogueliker, GamesRadar, Eneba, Beebom, FandomWire, PocketTactics + additions
 */
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => { const [k,...r] = line.split('='); if(k&&r.length) env[k.trim()]=r.join('=').trim(); });
const CLIENT_ID = env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = env.TWITCH_CLIENT_SECRET;

const ROGUELIKE_GAMES = [
  // === CONSENSUS TOP TIER ===
  "Hades",
  "Hades II",
  "Balatro",
  "Dead Cells",
  "Slay the Spire",
  "The Binding of Isaac: Rebirth",
  "Spelunky 2",
  "Vampire Survivors",
  "Returnal",
  "Enter the Gungeon",
  "Risk of Rain 2",
  "Darkest Dungeon",
  "Cult of the Lamb",
  "Noita",
  "Inscryption",

  // === STRONG CONSENSUS ===
  "FTL: Faster Than Light",
  "Into the Breach",
  "Rogue Legacy 2",
  "Loop Hero",
  "Nuclear Throne",
  "Monster Train",
  "Crypt of the NecroDancer",
  "Caves of Qud",
  "Blue Prince",
  "Dwarf Fortress",

  // === MULTI-LIST PICKS ===
  "Against the Storm",
  "Brotato",
  "Gunfire Reborn",
  "Streets of Rogue",
  "Wizard of Legend",
  "Dicey Dungeons",
  "Cobalt Core",
  "PlateUp!",
  "Halls of Torment",
  "Don't Starve",
  "Ballionaire",
  "Peglin",

  // === ORIGINALS / CLASSICS ===
  "Rogue",
  "Spelunky",
  "Rogue Legacy",
  "Risk of Rain",
  "The Binding of Isaac",
  "NetHack",
  "Dungeon Crawl Stone Soup",
  "Tales of Maj'Eyal",
  "ADOM",
  "Brogue",
  "Cogmind",

  // === ACTION ROGUELITES ===
  "Skul: The Hero Slayer",
  "Have a Nice Death",
  "Curse of the Dead Gods",
  "ScourgeBringer",
  "Neon Abyss",
  "Fury Unleashed",
  "Ember Knights",
  "Crown Trick",
  "Going Under",
  "Dandy Ace",
  "Robo Quest",
  "Undermine",

  // === DECKBUILDER ROGUELIKES ===
  "Monster Train",
  "Griftlands",
  "Roguebook",
  "Wildfrost",
  "Across the Obelisk",
  "Ring of Pain",
  "Luck be a Landlord",
  "Backpack Hero",

  // === BULLET HEAVEN / SURVIVORS ===
  "20 Minutes Till Dawn",
  "Boneraiser Minions",
  "HoloCure: Save the Fans!",
  "Deep Rock Galactic: Survivor",
  "Nova Drift",
  "Dome Keeper",

  // === STRATEGY / TACTICS ROGUELIKES ===
  "Invisible, Inc.",
  "Darkest Dungeon II",
  "Void Bastards",
  "Bad North",
  "Crying Suns",
  "Star Renegades",
  "Renowned Explorers",

  // === UNIQUE / GENRE-BENDING ===
  "Cultist Simulator",
  "World of Horror",
  "Buckshot Roulette",
  "Downwell",
  "Cadence of Hyrule",
  "Moonlighter",
  "Children of Morta",
  "Shovel Knight Dig",
  "Path of Achra",
  "Atomicrops",

  // === SHOOTER ROGUELIKES ===
  "SYNTHETIK",
  "Everspace",
  "Jupiter Hell",
  "Ziggurat",
  "Monolith",

  // === 2024-2026 ===
  "Megabonk",
  "Absolum",
  "Ball X Pit",
  "Slay the Spire 2",
  "Monster Train 2",
  "Rift Wizard 2",

  // === MORE ESSENTIALS ===
  "One Step from Eden",
  "Vampire Survivors",
  "Super Auto Pets",
  "Dungeon of the Endless",
  "Necropolis",
  "Ship of Fools",
  "Hero Siege",
  "Death's Door",
];

async function getToken() {
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
  return (await res.json()).access_token;
}
async function igdbQuery(token, endpoint, query) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, { method: 'POST', headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, body: query });
  return res.json();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const token = await getToken();
  const found = [];
  const notFound = [];
  const seen = new Set();

  console.log(`Searching IGDB for ${ROGUELIKE_GAMES.length} roguelike games...\n`);

  for (let i = 0; i < ROGUELIKE_GAMES.length; i++) {
    const name = ROGUELIKE_GAMES[i];
    const results = await igdbQuery(token, 'games',
      `search "${name}";
       fields name,total_rating,total_rating_count,first_release_date,parent_game,version_parent;
       where parent_game = null & version_parent = null;
       limit 5;`
    );

    let match = results.find(g => g.name.toLowerCase() === name.toLowerCase());
    if (!match) match = results.find(g => g.name.toLowerCase().startsWith(name.toLowerCase().split(':')[0].split(' - ')[0]));
    if (!match && results.length > 0) match = results[0];

    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      const yr = match.first_release_date ? new Date(match.first_release_date * 1000).getFullYear() : '?';
      const rat = match.total_rating ? match.total_rating.toFixed(1) : '?';
      found.push({ id: match.id, name: match.name, year: yr, rating: rat });
      console.log(`  ✓ [${match.id}] ${match.name} (${yr}) — ${rat}/100`);
    } else if (match && seen.has(match.id)) {
      console.log(`  ~ DUPE: ${name} -> [${match.id}] ${match.name}`);
    } else {
      notFound.push(name);
      console.log(`  ✗ NOT FOUND: ${name}`);
    }
    if (i % 3 === 2) await sleep(1000);
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Found: ${found.length} unique games`);
  console.log(`Not found: ${notFound.length}`);
  if (notFound.length > 0) { console.log(`\nMissing:`); notFound.forEach(n => console.log(`  - ${n}`)); }

  const ids = found.map(g => g.id);
  console.log(`\n=== FULL LIST ===`);
  found.forEach((g, i) => console.log(`${(i+1).toString().padStart(3)}. [${g.id}] ${g.name} (${g.year}) — ${g.rating}/100`));
  console.log(`\nID list: ${ids.join(',')}`);
}
main().catch(console.error);
