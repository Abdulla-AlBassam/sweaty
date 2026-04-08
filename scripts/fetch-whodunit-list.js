#!/usr/bin/env node
/**
 * Fetch IGDB IDs for Whodunit curated list
 * Mystery, detective, investigation, deduction games
 * Sources: PC Gamer, TheGamer, GameRant, Eneba, PCGamesN, GamesRadar,
 * DualShockers, CBR, GameObserver, PunishedBacklog
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

const WHODUNIT_GAMES = [
  // === ACE ATTORNEY ===
  "Phoenix Wright: Ace Attorney",
  "Phoenix Wright: Ace Attorney - Justice for All",
  "Phoenix Wright: Ace Attorney - Trials and Tribulations",
  "Apollo Justice: Ace Attorney",
  "Ace Attorney Investigations: Miles Edgeworth",
  "Phoenix Wright: Ace Attorney - Dual Destinies",
  "Phoenix Wright: Ace Attorney - Spirit of Justice",
  "The Great Ace Attorney Chronicles",

  // === DANGANRONPA ===
  "Danganronpa: Trigger Happy Havoc",
  "Danganronpa 2: Goodbye Despair",
  "Danganronpa V3: Killing Harmony",

  // === ZERO ESCAPE ===
  "Nine Hours, Nine Persons, Nine Doors",
  "Zero Escape: Virtue's Last Reward",
  "Zero Escape: Zero Time Dilemma",

  // === SHERLOCK HOLMES ===
  "Sherlock Holmes: Crimes & Punishments",
  "Sherlock Holmes: The Devil's Daughter",
  "Sherlock Holmes Chapter One",
  "Sherlock Holmes: The Awakened",

  // === PROFESSOR LAYTON ===
  "Professor Layton and the Curious Village",
  "Professor Layton and the Unwound Future",
  "Professor Layton vs. Phoenix Wright: Ace Attorney",

  // === CONSENSUS TOP TIER ===
  "Disco Elysium",
  "Return of the Obra Dinn",
  "L.A. Noire",
  "The Wolf Among Us",
  "Her Story",
  "Paradise Killer",
  "Heavy Rain",
  "Ghost Trick: Phantom Detective",
  "AI: The Somnium Files",
  "Pentiment",
  "The Case of the Golden Idol",
  "The Rise of the Golden Idol",
  "Hypnospace Outlaw",

  // === CLASSIC ADVENTURE / MYSTERY ===
  "Sam & Max Hit the Road",
  "Grim Fandango",
  "Gabriel Knight: Sins of the Fathers",
  "Myst",
  "Snatcher",
  "Broken Sword: The Shadow of the Templars",
  "The Silver Case",

  // === MODERN INDIE MYSTERY ===
  "The Vanishing of Ethan Carter",
  "Kathy Rain",
  "Duck Detective: The Secret Salami",
  "Tangle Tower",
  "Aviary Attorney",
  "Overboard!",
  "Chinatown Detective Agency",
  "The Forgotten City",
  "Firewatch",
  "What Remains of Edith Finch",
  "Outer Wilds",
  "Nobody Wants to Die",
  "Hotel Dusk: Room 215",
  "The Council",
  "Deadly Premonition",
  "Contradiction: Spot The Liar!",
  "Frog Detective: The Entire Mystery",
  "Jenny LeClue - Detectivu",
  "Backbone",
  "The Sexy Brutale",

  // === SAM BARLOW TRILOGY ===
  "Telling Lies",
  "Immortality",

  // === JAPANESE MYSTERY ===
  "Umineko When They Cry",
  "Higurashi When They Cry",
  "AI: The Somnium Files - nirvanA Initiative",
  "Corpse Party",

  // === TELLTALE / NARRATIVE ===
  "Batman: The Telltale Series",
  "Batman: The Enemy Within",
  "The Walking Dead: The Final Season",

  // === INVESTIGATION-HEAVY ===
  "Shadows of Doubt",
  "The Painscreek Killings",
  "Unheard",
  "Heaven's Vault",
  "Papers, Please",
  "Beholder",
  "The Sinking City",
  "Call of Cthulhu",
  "Murdered: Soul Suspect",
  "Cognition: An Erica Reed Thriller",

  // === DEDUCTION / PUZZLE-MYSTERY ===
  "The Séance of Blake Manor",
  "The Roottrees Are Dead",
  "Best Served Cold",
  "Obra Dinn",
  "Gemini Rue",
  "Detective Pikachu",

  // === ACTION WITH MYSTERY ===
  "Vampyr",
  "Condemned: Criminal Origins",
  "Alan Wake 2",
  "Sherlock Holmes vs. Jack the Ripper",

  // === 2025 RELEASES ===
  "A Case of Fraud",
  "Strange Antiquities",
  "Little Problems",
  "Type Help",
  "Still Wakes the Deep",
  "Emio - The Smiling Man: Famicom Detective Club",

  // === 2026 UPCOMING ===
  "TR-49",
  "The Incident at Galley House",
  "Grave Seasons",
  "Confidential Killings",
  "Trials of Innocence",

  // === MORE ESSENTIALS ===
  "Darkest Dungeon",
  "This Is the Police",
  "Nancy Drew: Shadow at the Water's Edge",
  "The Medium",
  "Sherlock Holmes and The Hound of the Baskervilles",
  "Policenauts",
  "Beyond Good & Evil",
  "Deponia",
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
    headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    body: query,
  });
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const token = await getToken();
  const found = [];
  const notFound = [];
  const seen = new Set();

  console.log(`Searching IGDB for ${WHODUNIT_GAMES.length} mystery/detective games...\n`);

  for (let i = 0; i < WHODUNIT_GAMES.length; i++) {
    const name = WHODUNIT_GAMES[i];
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
  if (notFound.length > 0) {
    console.log(`\nMissing:`);
    notFound.forEach(n => console.log(`  - ${n}`));
  }

  const ids = found.map(g => g.id);
  console.log(`\n=== FULL LIST ===`);
  found.forEach((g, i) => {
    console.log(`${(i+1).toString().padStart(3)}. [${g.id}] ${g.name} (${g.year}) — ${g.rating}/100`);
  });
  console.log(`\nID list: ${ids.join(',')}`);
}

main().catch(console.error);
