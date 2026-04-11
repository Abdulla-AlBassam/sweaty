#!/usr/bin/env node
/**
 * Seed public lists for community accounts.
 * Uses service role to bypass RLS.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(__dirname, '..', 'web', 'node_modules', '@supabase', 'supabase-js'));

const SUPABASE_URL = 'https://onsmlscqlhpvltuwedzi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uc21sc2NxbGhwdmx0dXdlZHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgyODA0NSwiZXhwIjoyMDgxNDA0MDQ1fQ.fKD3SOtaJEDh93e8m_fdowKPboQBa3S7phpSjfqByFw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Lists to create: [username, title, description, numGames]
const LIST_DEFS = [
  ['tariq_souls',      'Soulsborne Essentials',         'Every Souls fan needs to play these.',                    12],
  ['tariq_souls',      'Hardest Bosses I Have Fought',  'Ranked by how many times I died.',                        8],
  ['hana_cozy',        'Cozy Night In',                 'Perfect games for a relaxing evening.',                   10],
  ['hana_cozy',        'Games That Made Me Cry',        'Emotionally devastating in the best way.',                6],
  ['sara_rpg',         'Top JRPGs of All Time',         'My definitive ranking. Fight me.',                        15],
  ['chloe_narrative',  'Story Over Everything',          'Games where the narrative carries the whole experience.',  10],
  ['chloe_narrative',  'Walking Sims Worth Your Time',  'Yes, they are real games.',                                7],
  ['maya_ctrl',        'Indie Hidden Gems',             'Games that deserved way more attention.',                  12],
  ['faisal_fps',       'Best Shooters Ever Made',       'From arena classics to modern tactical.',                 10],
  ['badr_endgame',     'Games With The Best Endgame',   'The real game starts after the credits.',                  8],
  ['noura_gamer',      'Platinum Trophy Hall of Fame',  'Every platinum I am proud of.',                           10],
  ['adam_clutch',      'Competitive Bangers',           'Best games for ranked grind.',                             8],
  ['kai_wanderer',     'Beautiful Open Worlds',         'Games I explored every corner of.',                       10],
  ['dina_pixel',       'Pixel Art Masterpieces',        'Proof that pixels can be art.',                            9],
  ['waleed_score',     'Best Soundtracks in Gaming',    'Games I play just to hear the music.',                    12],
];

async function main() {
  console.log('\n  Seeding public lists for community accounts\n');

  // Fetch all games
  const { data: allGames } = await supabase.from('games_cache').select('id, name').order('name');
  if (!allGames?.length) { console.error('No games in cache!'); return; }
  console.log(`  ${allGames.length} games available\n`);

  let listsCreated = 0;
  let itemsCreated = 0;

  for (const [username, title, description, numGames] of LIST_DEFS) {
    // Find user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) {
      console.error(`  Could not find @${username}, skipping "${title}"`);
      continue;
    }

    // Create list
    const { data: list, error: listErr } = await supabase
      .from('lists')
      .insert({
        user_id: profile.id,
        title,
        description,
        is_public: true,
        is_ranked: Math.random() > 0.5,
      })
      .select('id')
      .single();

    if (listErr) {
      console.error(`  FAILED creating "${title}": ${listErr.message}`);
      continue;
    }

    // Pick random games and add as items
    const games = pickN(allGames, numGames);
    const items = games.map((game, i) => ({
      list_id: list.id,
      game_id: game.id,
      position: i,
    }));

    const { error: itemsErr } = await supabase.from('list_items').insert(items);

    if (itemsErr) {
      console.error(`  FAILED adding games to "${title}": ${itemsErr.message}`);
      continue;
    }

    listsCreated++;
    itemsCreated += items.length;
    console.log(`  @${username}: "${title}" (${numGames} games)`);
  }

  console.log(`\n  Done! ${listsCreated} lists created with ${itemsCreated} total games.`);
}

main().catch(console.error);
