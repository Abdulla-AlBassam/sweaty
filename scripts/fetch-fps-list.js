#!/usr/bin/env node
/**
 * Fetch IGDB IDs for FPS Essentials curated list
 * Sources: GamesRadar, Den of Geek, PCGamesN, Gameranx, Eneba + additions
 */

const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', 'web', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});
const CLIENT_ID = env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = env.TWITCH_CLIENT_SECRET;

const FPS_GAMES = [
  // === HALF-LIFE ===
  "Half-Life",
  "Half-Life 2",
  "Half-Life: Alyx",
  "Black Mesa",

  // === DOOM ===
  "Doom",
  "Doom II",
  "Doom 3",
  "Doom",  // 2016 - will need to fix
  "Doom Eternal",
  "Doom: The Dark Ages",

  // === HALO ===
  "Halo: Combat Evolved",
  "Halo 2",
  "Halo 3",
  "Halo: Reach",
  "Halo 3: ODST",
  "Halo Infinite",

  // === CALL OF DUTY ===
  "Call of Duty",
  "Call of Duty 2",
  "Call of Duty 4: Modern Warfare",
  "Call of Duty: Modern Warfare 2",
  "Call of Duty: World at War",
  "Call of Duty: Black Ops",
  "Call of Duty: Black Ops II",
  "Call of Duty: Black Ops 6",

  // === BATTLEFIELD ===
  "Battlefield 1942",
  "Battlefield: Bad Company 2",
  "Battlefield 1",
  "Battlefield V",

  // === COUNTER-STRIKE ===
  "Counter-Strike",
  "Counter-Strike 2",

  // === QUAKE ===
  "Quake",
  "Quake III Arena",

  // === BIOSHOCK ===
  "BioShock",
  "BioShock Infinite",

  // === WOLFENSTEIN ===
  "Wolfenstein 3D",
  "Wolfenstein: The New Order",
  "Wolfenstein II: The New Colossus",

  // === METRO ===
  "Metro 2033",
  "Metro: Last Light",
  "Metro Exodus",

  // === FAR CRY ===
  "Far Cry",
  "Far Cry 2",
  "Far Cry 3",
  "Far Cry 5",

  // === BORDERLANDS ===
  "Borderlands",
  "Borderlands 2",
  "Borderlands 3",

  // === STALKER ===
  "S.T.A.L.K.E.R.: Shadow of Chernobyl",
  "S.T.A.L.K.E.R.: Call of Pripyat",
  "S.T.A.L.K.E.R. 2: Heart of Chornobyl",

  // === LEFT 4 DEAD ===
  "Left 4 Dead",
  "Left 4 Dead 2",

  // === PORTAL ===
  "Portal",
  "Portal 2",

  // === TITANFALL ===
  "Titanfall 2",

  // === COMPETITIVE / MULTIPLAYER ===
  "Team Fortress 2",
  "Rainbow Six Siege",
  "Overwatch",
  "Valorant",
  "Apex Legends",
  "PUBG: Battlegrounds",
  "Destiny 2",
  "Escape from Tarkov",
  "Insurgency: Sandstorm",
  "Hunt: Showdown",
  "The Finals",
  "Deep Rock Galactic",
  "Payday 2",

  // === INDIE / BOOMER SHOOTERS ===
  "DUSK",
  "Superhot",
  "Ultrakill",
  "Neon White",
  "Prodeus",
  "Amid Evil",
  "Ion Fury",
  "Metal: Hellsinger",
  "Warhammer 40,000: Boltgun",
  "Trepang2",
  "Gloomwood",
  "I Am Your Beast",

  // === CLASSIC ===
  "GoldenEye 007",
  "Unreal Tournament",
  "TimeSplitters: Future Perfect",
  "Serious Sam: The First Encounter",
  "No One Lives Forever",
  "Perfect Dark",
  "Duke Nukem 3D",

  // === TACTICAL ===
  "SWAT 4",
  "Ready or Not",
  "Rainbow Six: Vegas 2",
  "Delta Force",
  "Arma 3",

  // === IMMERSIVE SIM / FPS-RPG ===
  "Prey",
  "Dishonored",
  "Dishonored 2",
  "Deathloop",
  "System Shock 2",
  "Deus Ex",
  "Cyberpunk 2077",

  // === MODERN / RECENT ===
  "F.E.A.R.",
  "Bulletstorm",
  "Crysis",
  "Killzone 2",
  "Resistance: Fall of Man",
  "Shadow Warrior",
  "RoboCop: Rogue City",
  "High on Life",
  "Atomic Heart",

  // === 2025-2026 ===
  "Doom: The Dark Ages",
  "Battlefield 6",
  "Call of Duty: Black Ops 6",
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

  console.log(`Searching IGDB for ${FPS_GAMES.length} FPS games...\n`);

  for (let i = 0; i < FPS_GAMES.length; i++) {
    const name = FPS_GAMES[i];
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
