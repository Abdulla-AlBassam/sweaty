#!/usr/bin/env node
/**
 * Curated Lists Population Script
 *
 * This script searches for games via the API, caches them, and outputs
 * SQL UPDATE statements to populate the curated_lists table.
 *
 * Usage:
 *   node scripts/populate-curated-lists.js
 *
 * Make sure your web app is running locally (npm run dev in /web)
 * or set API_URL to your deployed URL.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

// All 10 curated lists with games in ranked order
const CURATED_LISTS = {
  '2025-essentials': [
    'Clair Obscur: Expedition 33',
    'Hades II',
    'Hollow Knight: Silksong',
    'Donkey Kong Bananza',
    'Kingdom Come: Deliverance II',
    'Death Stranding 2: On the Beach',
    'Ghost of Yotei',
    'Split Fiction',
    'Blue Prince',
    'Arc Raiders',
    'Battlefield 6',
    'Monster Hunter Wilds',
    'DOOM: The Dark Ages',
    'Assassin\'s Creed Shadows',
    'Mario Kart World',
    'Metroid Prime 4: Beyond',
    'Indiana Jones and the Great Circle',
    'Silent Hill f',
    'The Outer Worlds 2',
    'Elden Ring Nightreign',
    'Borderlands 4',
    'Call of Duty: Black Ops 7',
    'Avowed',
    'Ninja Gaiden 4',
    'Oblivion Remastered',
    'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: Tears of the Kingdom',
    'Pokemon Legends: Z-A',
    'The Talos Principle: Reawakening',
    'Two Point Museum',
    'The Hundred Line: Last Defense Academy',
    'Citizen Sleeper 2: Starward Vector',
    'Dynasty Warriors: Origins',
    'Fatal Fury: City of the Wolves',
    'Metal Gear Solid Delta: Snake Eater',
    'Sektori',
    'Dying Light: The Beast',
    'Despelote',
    'The Roottrees Are Dead',
    'Final Fantasy Tactics Remaster',
    'Absolum',
    'The Alters',
    'South of Midnight',
    'Lost Records: Bloom & Rage',
    'Dragon Quest I & II HD-2D Remake',
    'The Legend of Heroes: Trails in the Sky',
    'Deltarune',
    'Dispatch',
    'Mafia: The Old Country',
    'Octopath Traveler'
  ],

  'playstation-exclusives': [
    'God of War',
    'God of War Ragnarok',
    'The Last of Us Remastered',
    'Astro Bot',
    'Bloodborne',
    'Uncharted 4: A Thief\'s End',
    'The Last of Us Part II',
    'Marvel\'s Spider-Man 2',
    'Demon\'s Souls',
    'Final Fantasy VII Rebirth',
    'Shadow of the Colossus',
    'Silent Hill 2',
    'Horizon Zero Dawn',
    'The Last of Us Part I',
    'Horizon Forbidden West',
    'Ratchet & Clank: Rift Apart',
    'Ghost of Tsushima',
    'Marvel\'s Spider-Man',
    'Final Fantasy VII Remake',
    'Gran Turismo 7',
    'Returnal',
    'Death Stranding Director\'s Cut',
    'Uncharted: The Lost Legacy',
    'Dreams',
    'Spider-Man: Miles Morales',
    'Astro\'s Playroom',
    'Final Fantasy XVI',
    'Stellar Blade',
    'Persona 5 Royal',
    'Nioh 2',
    'Kena: Bridge of Spirits',
    'Stray',
    'Sifu',
    'Helldivers 2',
    'inFamous Second Son',
    'Until Dawn',
    'Concrete Genie',
    'Gravity Rush 2',
    'Ratchet & Clank',
    'Detroit: Become Human',
    'Days Gone'
  ],

  'pc-exclusive': [
    'Disco Elysium',
    'Half-Life 2',
    'Half-Life',
    'League of Legends',
    'Dota 2',
    'World of Warcraft',
    'Counter-Strike 2',
    'StarCraft II: Wings of Liberty',
    'Crusader Kings III',
    'RimWorld',
    'Europa Universalis IV',
    'Stellaris',
    'Hearts of Iron IV',
    'Dwarf Fortress',
    'Factorio',
    'Cities: Skylines',
    'Oxygen Not Included',
    'Anno 1800',
    'Euro Truck Simulator 2',
    'Kerbal Space Program',
    'Total War: Warhammer III',
    'Age of Empires II: Definitive Edition',
    'Age of Empires IV',
    'Baldur\'s Gate II: Shadows of Amn',
    'Planescape: Torment',
    'Pillars of Eternity',
    'Path of Exile 2',
    'EVE Online',
    'Guild Wars 2',
    'Old School RuneScape',
    'Valheim',
    'Project Zomboid',
    'UFO 50',
    'Starsector',
    'Manor Lords',
    'Escape from Tarkov',
    'ARMA 3',
    'ULTRAKILL',
    'GTFO',
    'Squad',
    'Hell Let Loose',
    'Hunt: Showdown',
    'Black Mesa',
    'Satisfactory',
    'Dyson Sphere Program'
  ],

  'goated-remakes': [
    'Metroid Prime Remastered',
    'The Legend of Zelda: Ocarina of Time 3D',
    'Resident Evil 4',
    'Resident Evil 2',
    'Final Fantasy VII Rebirth',
    'Demon\'s Souls',
    'Resident Evil',
    'Shadow of the Colossus',
    'Tony Hawk\'s Pro Skater 1 + 2',
    'Dead Space',
    'The Legend of Zelda: The Wind Waker HD',
    'Paper Mario: The Thousand-Year Door',
    'Pokemon HeartGold',
    'Mass Effect Legendary Edition',
    'Persona 3 Reload',
    'Final Fantasy VII Remake',
    'The Legend of Zelda: Link\'s Awakening',
    'The Legend of Zelda: Majora\'s Mask 3D',
    'Silent Hill 2',
    'Black Mesa',
    'Spyro Reignited Trilogy',
    'Crash Bandicoot N. Sane Trilogy',
    'Ratchet & Clank',
    'Crisis Core: Final Fantasy VII Reunion',
    'Halo: The Master Chief Collection',
    'The Last of Us Part I',
    'Final Fantasy XII: The Zodiac Age',
    'Dragon Quest III HD-2D Remake',
    'Live A Live',
    'Yakuza Kiwami 2',
    'System Shock',
    'Mafia: Definitive Edition',
    'Oddworld: New \'n\' Tasty',
    'Metal Gear Solid: The Twin Snakes',
    'XCOM: Enemy Unknown',
    'The Legend of Zelda: Twilight Princess HD',
    'BioShock: The Collection',
    'Super Mario RPG',
    'Star Ocean: The Second Story R',
    'Sonic X Shadow Generations'
  ],

  'co-op-must-haves': [
    'Portal 2',
    'Baldur\'s Gate 3',
    'It Takes Two',
    'Left 4 Dead 2',
    'Terraria',
    'Deep Rock Galactic',
    'Minecraft',
    'Divinity: Original Sin 2',
    'Monster Hunter: World',
    'Stardew Valley',
    'Helldivers 2',
    'Split Fiction',
    'Lethal Company',
    'Valheim',
    'Halo: The Master Chief Collection',
    'Cuphead',
    'Overcooked! 2',
    'Borderlands 2',
    'Sea of Thieves',
    'Don\'t Starve Together',
    'A Way Out',
    'Phasmophobia',
    'Diablo IV',
    'Satisfactory',
    'Monster Hunter Wilds',
    'Factorio',
    'Castle Crashers',
    'Dark Souls III',
    'Elden Ring',
    'Warhammer: Vermintide 2',
    'Destiny 2',
    'Borderlands 3',
    'Risk of Rain 2',
    'Remnant 2',
    'GTFO',
    'Dying Light 2: Stay Human',
    'Gears 5',
    'Trine 4: The Nightmare Prince',
    'Human Fall Flat',
    'Teenage Mutant Ninja Turtles: Shredder\'s Revenge',
    'Streets of Rage 4',
    'Warhammer 40,000: Space Marine 2'
  ],

  'short-and-sweet': [
    'Portal',
    'Portal 2',
    'Inside',
    'Celeste',
    'Journey',
    'Undertale',
    'What Remains of Edith Finch',
    'Braid',
    'Limbo',
    'Cocoon',
    'Return of the Obra Dinn',
    'Ori and the Blind Forest',
    'Firewatch',
    'The Stanley Parable',
    'Bastion',
    'Shovel Knight',
    'Gone Home',
    'A Short Hike',
    'Little Nightmares',
    'Brothers: A Tale of Two Sons',
    'Stray',
    'GRIS',
    'Abzu',
    'Oxenfree',
    'The Witness',
    'Titanfall 2',
    'Resident Evil 2',
    'Resident Evil 7: Biohazard',
    'Florence',
    'Katamari Damacy Reroll',
    'Untitled Goose Game',
    'Before Your Eyes',
    'Gorogoa',
    'Dear Esther',
    'The Beginner\'s Guide',
    'Tacoma',
    'Unpacking',
    'Planet of Lana',
    'Neva',
    'Signalis',
    'Tinykin',
    'Jusant',
    'Tunic',
    'Hotline Miami',
    'Cave Story'
  ],

  'new-releases': [
    'Hades II',
    'Astro Bot',
    'Elden Ring: Shadow of the Erdtree',
    'Metaphor: ReFantazio',
    'Final Fantasy VII Rebirth',
    'Clair Obscur: Expedition 33',
    'Blue Prince',
    'UFO 50',
    'Satisfactory',
    'Split Fiction',
    'Balatro',
    'Animal Well',
    'The Last of Us Part II Remastered',
    'Tekken 8',
    'Hollow Knight: Silksong',
    'Like a Dragon: Infinite Wealth',
    'Destiny 2: The Final Shape',
    'Thank Goodness You\'re Here!',
    'Kingdom Come: Deliverance II',
    'Monster Hunter Wilds',
    'DOOM: The Dark Ages',
    'Persona 3 Reload',
    'Prince of Persia: The Lost Crown',
    'Dragon\'s Dogma 2',
    'Paper Mario: The Thousand-Year Door',
    'Nine Sols',
    'Unicorn Overlord',
    'Mario Kart World',
    'Silent Hill 2',
    'Indiana Jones and the Great Circle',
    'Pacific Drive',
    'Helldivers 2',
    'Stellar Blade',
    'Black Myth: Wukong',
    'Warhammer 40,000: Space Marine 2'
  ],

  'coming-soon': [
    'Grand Theft Auto VI',
    'Resident Evil Requiem',
    'Nioh 3',
    'Crimson Desert',
    '007',
    'Phantom Blade Zero',
    'Saros',
    'Hytale',
    'Reanimal',
    'Monster Hunter Stories 3',
    'Marvel\'s Wolverine',
    'Fable',
    'The Duskbloods',
    'Tomb Raider',
    'Marathon',
    'Skate',
    'Fire Emblem',
    'Gothic',
    'Prince of Persia: The Sands of Time',
    'The Elder Scrolls VI',
    'Exodus',
    'BioShock 4',
    'Mass Effect 5',
    'Fallout 5'
  ],

  'timeless-classics': [
    'The Legend of Zelda: Ocarina of Time',
    'Super Mario Bros.',
    'The Legend of Zelda: Breath of the Wild',
    'Half-Life 2',
    'Grand Theft Auto V',
    'Tetris',
    'Super Mario 64',
    'Dark Souls',
    'The Witcher 3: Wild Hunt',
    'Red Dead Redemption 2',
    'Minecraft',
    'Portal',
    'Elden Ring',
    'Final Fantasy VII',
    'Metal Gear Solid',
    'Super Mario World',
    'The Last of Us',
    'Chrono Trigger',
    'World of Warcraft',
    'Resident Evil 4',
    'Halo: Combat Evolved',
    'Mass Effect 2',
    'BioShock',
    'The Elder Scrolls V: Skyrim',
    'Super Smash Bros. Ultimate',
    'Baldur\'s Gate 3',
    'Street Fighter II',
    'DOOM',
    'Pokemon Red',
    'God of War',
    'Uncharted 2: Among Thieves',
    'Grand Theft Auto: San Andreas',
    'The Legend of Zelda: A Link to the Past',
    'Super Mario Galaxy',
    'Super Metroid',
    'GoldenEye 007',
    'Grand Theft Auto IV',
    'Portal 2',
    'Shadow of the Colossus',
    'Castlevania: Symphony of the Night',
    'Pac-Man',
    'Space Invaders',
    'StarCraft',
    'Diablo II',
    'Counter-Strike',
    'Metroid Prime',
    'Final Fantasy VI',
    'Silent Hill 2',
    'Star Wars: Knights of the Old Republic',
    'Deus Ex',
    'Civilization IV',
    'Tekken 3',
    'Mario Kart 64',
    'Tony Hawk\'s Pro Skater 2',
    'Persona 5',
    'Sonic the Hedgehog 2',
    'Call of Duty 4: Modern Warfare',
    'Fallout 3',
    'Baldur\'s Gate II: Shadows of Amn',
    'Animal Crossing: New Horizons',
    'Hades',
    'Dark Souls III',
    'The Legend of Zelda: The Wind Waker',
    'Red Dead Redemption',
    'Bloodborne',
    'Half-Life',
    'Wolfenstein 3D',
    'The Sims',
    'Warcraft III: Reign of Chaos',
    'Quake',
    'Planescape: Torment',
    'Dishonored',
    'Horizon Zero Dawn',
    'The Last of Us Part II',
    'Undertale',
    'Celeste',
    'Hollow Knight',
    'Dead Space',
    'Spelunky',
    'Braid',
    'Monster Hunter: World',
    'Devil May Cry 3: Dante\'s Awakening',
    'Journey',
    'Ico',
    'Okami',
    'Cuphead',
    'Super Mario Odyssey',
    'Ghost of Tsushima',
    'Pong'
  ],

  'story-driven': [
    'Red Dead Redemption 2',
    'The Last of Us',
    'The Witcher 3: Wild Hunt',
    'Baldur\'s Gate 3',
    'Mass Effect 2',
    'Disco Elysium',
    'Planescape: Torment',
    'BioShock',
    'Red Dead Redemption',
    'God of War',
    'The Last of Us Part II',
    'BioShock Infinite',
    'Mass Effect',
    'Chrono Trigger',
    'Final Fantasy VI',
    'The Walking Dead',
    'Final Fantasy VII',
    'Star Wars: Knights of the Old Republic',
    'Portal 2',
    'NieR: Automata',
    'Silent Hill 2',
    'Metal Gear Solid 3: Snake Eater',
    'Dragon Age: Origins',
    'Baldur\'s Gate II: Shadows of Amn',
    'What Remains of Edith Finch',
    'Life is Strange',
    'Persona 4 Golden',
    'Alan Wake 2',
    'Undertale',
    'Half-Life 2',
    'Kentucky Route Zero',
    'Persona 5 Royal',
    'SOMA',
    'Spec Ops: The Line',
    'Fallout: New Vegas',
    'Firewatch',
    'Hades',
    'Heavy Rain',
    'Divinity: Original Sin 2',
    'Final Fantasy X',
    'Gone Home',
    'Brothers: A Tale of Two Sons',
    'Ghost of Tsushima',
    'Horizon Zero Dawn',
    'Outer Wilds',
    'To the Moon',
    'Yakuza 0',
    'Cyberpunk 2077',
    'Hellblade: Senua\'s Sacrifice',
    'Death Stranding',
    'Deus Ex',
    'Shadow of the Colossus',
    'Inside',
    'Xenoblade Chronicles',
    'Batman: Arkham City',
    'Yakuza: Like a Dragon',
    'Until Dawn',
    'Steins;Gate',
    'The Wolf Among Us',
    'The Legend of Zelda: Majora\'s Mask',
    'Uncharted 4: A Thief\'s End',
    'Celeste',
    'The Stanley Parable',
    'Doki Doki Literature Club',
    'Night in the Woods',
    'Detroit: Become Human',
    'Oxenfree',
    'Before Your Eyes',
    'Phoenix Wright: Ace Attorney',
    'Final Fantasy IX',
    'Elden Ring',
    'The House in Fata Morgana',
    'Papers, Please',
    'Return of the Obra Dinn',
    'Vampire: The Masquerade - Bloodlines',
    'System Shock 2',
    'Pillars of Eternity',
    'Omori',
    '13 Sentinels: Aegis Rim',
    'Subnautica',
    'Danganronpa: Trigger Happy Havoc',
    'Pathologic 2',
    'Tacoma',
    'The Beginner\'s Guide',
    'Pyre',
    'Inscryption',
    'Signalis',
    'Citizen Sleeper',
    'Slay the Princess',
    'A Plague Tale: Innocence',
    'Pentiment'
  ]
};

// Helper to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Search for a game and return the best match
async function searchGame(gameName) {
  try {
    const response = await fetch(`${API_URL}/api/games/search?q=${encodeURIComponent(gameName)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();

    if (data.games && data.games.length > 0) {
      // Return the first (best) match
      return {
        id: data.games[0].id,
        name: data.games[0].name,
        searchedFor: gameName
      };
    }
    return null;
  } catch (error) {
    console.error(`Error searching for "${gameName}":`, error.message);
    return null;
  }
}

// Process all lists
async function processLists() {
  console.log('🎮 Curated Lists Population Script');
  console.log('===================================\n');
  console.log(`Using API: ${API_URL}\n`);

  const results = {};
  const notFound = {};

  for (const [listSlug, games] of Object.entries(CURATED_LISTS)) {
    console.log(`\n📋 Processing: ${listSlug} (${games.length} games)`);
    console.log('-'.repeat(50));

    results[listSlug] = [];
    notFound[listSlug] = [];

    for (let i = 0; i < games.length; i++) {
      const gameName = games[i];
      process.stdout.write(`  [${i + 1}/${games.length}] ${gameName}... `);

      const result = await searchGame(gameName);

      if (result) {
        results[listSlug].push(result.id);
        console.log(`✓ Found (ID: ${result.id})`);
      } else {
        notFound[listSlug].push(gameName);
        console.log('✗ Not found');
      }

      // Small delay to avoid rate limiting
      await delay(200);
    }
  }

  // Output SQL statements
  console.log('\n\n========================================');
  console.log('📝 SQL UPDATE STATEMENTS');
  console.log('========================================\n');
  console.log('-- Copy and paste these into Supabase SQL Editor:\n');

  for (const [listSlug, gameIds] of Object.entries(results)) {
    if (gameIds.length > 0) {
      console.log(`-- ${listSlug} (${gameIds.length} games)`);
      console.log(`UPDATE curated_lists SET game_ids = ARRAY[${gameIds.join(', ')}]::BIGINT[] WHERE slug = '${listSlug}';\n`);
    }
  }

  // Report not found games
  console.log('\n========================================');
  console.log('⚠️  GAMES NOT FOUND');
  console.log('========================================\n');

  let totalNotFound = 0;
  for (const [listSlug, games] of Object.entries(notFound)) {
    if (games.length > 0) {
      console.log(`${listSlug}:`);
      games.forEach(g => console.log(`  - ${g}`));
      totalNotFound += games.length;
    }
  }

  if (totalNotFound === 0) {
    console.log('All games found! 🎉');
  } else {
    console.log(`\nTotal not found: ${totalNotFound}`);
    console.log('These games may not exist in IGDB yet or have different names.');
  }
}

// Run the script
processLists().catch(console.error);
