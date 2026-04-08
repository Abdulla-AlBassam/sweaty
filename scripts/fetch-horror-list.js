#!/usr/bin/env node
/**
 * Fetch IGDB IDs for curated horror games list
 * Compiled from GamesRadar, TechRadar, Insider Gaming, Infinity Retro,
 * Gameranx, GameRant, Eneba, GamingBible + notable additions
 *
 * Usage: node scripts/fetch-horror-list.js
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

const HORROR_GAMES = [
  // === RESIDENT EVIL ===
  "Resident Evil",
  "Resident Evil 2",
  "Resident Evil 3: Nemesis",
  "Resident Evil 4",
  "Resident Evil 7: Biohazard",
  "Resident Evil Village",
  "Resident Evil Code: Veronica",
  "Resident Evil 0",
  "Resident Evil: Revelations",
  "Resident Evil 2 Remake",
  "Resident Evil 4 Remake",
  "Dead Space Remake",
  "Resident Evil Requiem",

  // === SILENT HILL ===
  "Silent Hill",
  "Silent Hill 2",
  "Silent Hill 3",
  "Silent Hill 4: The Room",
  "Silent Hill 2 Remake",
  "Silent Hill f",
  "Silent Hill: Shattered Memories",

  // === DEAD SPACE ===
  "Dead Space",
  "Dead Space 2",

  // === SCI-FI / COSMIC HORROR ===
  "Alien: Isolation",
  "The Callisto Protocol",
  "SOMA",
  "System Shock 2",
  "Returnal",
  "Prey",
  "SIGNALIS",
  "Observer",

  // === OUTLAST ===
  "Outlast",
  "Outlast 2",
  "The Outlast Trials",

  // === ALAN WAKE ===
  "Alan Wake",
  "Alan Wake 2",

  // === AMNESIA ===
  "Amnesia: The Dark Descent",
  "Amnesia: Rebirth",
  "Penumbra: Overture",

  // === FATAL FRAME ===
  "Fatal Frame",
  "Fatal Frame II: Crimson Butterfly",
  "Fatal Frame III: The Tormented",

  // === THE EVIL WITHIN ===
  "The Evil Within",
  "The Evil Within 2",

  // === LITTLE NIGHTMARES ===
  "Little Nightmares",
  "Little Nightmares II",

  // === METRO ===
  "Metro 2033",
  "Metro: Last Light",
  "Metro Exodus",

  // === FNAF ===
  "Five Nights at Freddy's",
  "Five Nights at Freddy's: Security Breach",

  // === LEFT 4 DEAD ===
  "Left 4 Dead",
  "Left 4 Dead 2",

  // === CLASSIC HORROR ===
  "Alone in the Dark",
  "Clock Tower",
  "Dino Crisis",
  "Parasite Eve",
  "Eternal Darkness: Sanity's Requiem",
  "Rule of Rose",
  "Haunting Ground",
  "Forbidden Siren",
  "Condemned: Criminal Origins",
  "Manhunt",
  "The Suffering",
  "D",
  "Clock Tower 3",

  // === MODERN AAA HORROR ===
  "Until Dawn",
  "The Last of Us",
  "The Last of Us Part II",
  "Dying Light",
  "Dead by Daylight",
  "The Quarry",
  "The Dark Pictures Anthology: Man of Medan",
  "The Dark Pictures Anthology: House of Ashes",
  "Dead Rising",
  "Resident Evil Village",

  // === INDIE HORROR (ACCLAIMED) ===
  "Darkwood",
  "Visage",
  "Layers of Fear",
  "The Medium",
  "Devotion",
  "Mundaun",
  "Mouthwashing",
  "The Mortuary Assistant",
  "Carrion",
  "Limbo",
  "Inside",
  "Tormented Souls",
  "Phasmophobia",
  "The Forest",
  "Sons of the Forest",
  "Slender: The Arrival",
  "Corpse Party",
  "Cry of Fear",
  "Among the Sleep",
  "Blair Witch",
  "Detention",
  "Martha Is Dead",
  "MADiSON",
  "Poppy Playtime",

  // === ACTION HORROR ===
  "F.E.A.R.",
  "The Thing",
  "S.T.A.L.K.E.R.: Shadow of Chernobyl",
  "S.T.A.L.K.E.R. 2: Heart of Chornobyl",
  "Bloodborne",

  // === 2024-2026 HORROR ===
  "Still Wakes the Deep",
  "Dredge",
  "The Texas Chain Saw Massacre",
  "Content Warning",
  "Chernobylite",

  // === MULTIPLAYER HORROR ===
  "DEVOUR",
  "Lethal Company",

  // === MORE ESSENTIALS ===
  "BioShock",
  "Dead Island",
  "Dying Light 2: Stay Human",
  "White Day: A Labyrinth Named School",
  "Darkest Dungeon",
  "Soma",
  "Half-Life: Alyx",
  "Resident Evil: Revelations 2",
  "The Walking Dead",
  "REPO",
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
  const seen = new Set(); // deduplicate IDs

  console.log(`Searching IGDB for ${HORROR_GAMES.length} horror games...\n`);

  for (let i = 0; i < HORROR_GAMES.length; i++) {
    const name = HORROR_GAMES[i];

    const results = await igdbQuery(token, 'games',
      `search "${name}";
       fields name,total_rating,total_rating_count,first_release_date,parent_game,version_parent;
       where parent_game = null & version_parent = null;
       limit 5;`
    );

    let match = results.find(g => g.name.toLowerCase() === name.toLowerCase());
    if (!match) match = results.find(g => g.name.toLowerCase().startsWith(name.toLowerCase().split(':')[0]));
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

  if (notFound.length > 0) {
    console.log(`\nMissing:`);
    notFound.forEach(n => console.log(`  - ${n}`));
  }

  const ids = found.map(g => g.id);
  console.log(`\n=== GAME IDS ===`);
  console.log(`{${ids.join(',')}}`);

  console.log(`\n=== FULL LIST ===`);
  found.forEach((g, i) => {
    console.log(`${(i+1).toString().padStart(3)}. [${g.id}] ${g.name} (${g.year}) — ${g.rating}/100`);
  });
}

main().catch(console.error);
