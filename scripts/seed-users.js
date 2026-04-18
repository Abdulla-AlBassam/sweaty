#!/usr/bin/env node
/**
 * Seed 200 User Accounts for Sweaty
 *
 * Creates 200 realistic accounts with full activity: game logs, reviews,
 * follows, favourites, custom lists, review likes, and comments.
 *
 * Usage:
 *   node scripts/seed-users.js              # Create accounts + seed data
 *   node scripts/seed-users.js --teardown   # Delete all seeded accounts
 *   node scripts/seed-users.js --status     # Check existing accounts
 *
 * Credentials are saved to scripts/user-credentials.json
 */

const fs = require('fs');
const path = require('path');

require('./_env');

const { createClient } = require(path.join(__dirname, '..', 'web', 'node_modules', '@supabase', 'supabase-js'));

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://onsmlscqlhpvltuwedzi.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD;

if (!SERVICE_ROLE_KEY || !PASSWORD) {
  console.error('Missing env vars. Run with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... SEED_PASSWORD=... node scripts/seed-users.js');
  process.exit(1);
}

const ABDULLA_USERNAME = 'abdulla';
const USER_COUNT = 200;
const EMAIL_DOMAIN = 'sweaty.users';
const CREDENTIALS_FILE = path.join(__dirname, 'user-credentials.json');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Profile Generation ───────────────────────────────────────────────────
// LCM(50, 40) = 200, so FIRST[i % 50] + LAST[i % 40] gives 200 unique combos.

const FIRST_NAMES = [
  'Aiden',  'Yuki',    'Carlos',  'Priya',   'Marcus',
  'Leila',  'Jin',     'Sofia',   'Kwame',   'Elena',
  'Riku',   'Amara',   'Leo',     'Fatima',  'Owen',
  'Mei',    'Ibrahim', 'Luna',    'Dante',   'Sana',
  'Felix',  'Noor',    'Mateo',   'Anya',    'Theo',
  'Zara',   'Renzo',   'Isla',    'Kian',    'Mila',
  'Axel',   'Nia',     'Soren',   'Vera',    'Hugo',
  'Ayla',   'Ezra',    'Nadia',   'Ren',     'Rosa',
  'Luka',   'Hina',    'Nico',    'Dara',    'Abel',
  'Yara',   'Finn',    'Cleo',    'Zayn',    'Iris',
];

const LAST_NAMES = [
  'Nakamura',  'Rivera',    'Chen',      'Okafor',    'Schmidt',
  'Hassan',    'Park',      'Morales',   'Volkov',    'Tanaka',
  'Silva',     'Ansari',    'Kim',       'Osei',      'Larsson',
  'Gupta',     'Reyes',     'Sato',      'Diallo',    'Petrov',
  'Santos',    'Ahmed',     'Novak',     'Torres',    'Ali',
  'Berg',      'Cho',       'Fernandez', 'Takahashi', 'Kowalski',
  'Huang',     'Dubois',    'Yamamoto',  'Cruz',      'Nguyen',
  'Fischer',   'Mendez',    'Kimura',    'Andersen',  'Malik',
];

const BIOS = [
  'RPG addict. 100% completionist or bust.',
  'Speedrunner at heart. Always chasing PBs.',
  'Story first, gameplay second. Always.',
  'FPS main since the Quake days.',
  'Cozy games and lo-fi beats. That is the whole personality.',
  'Souls veteran. Every death is a lesson.',
  'Fighting game lab rat. Frame data is poetry.',
  'Open world wanderer. Fast travel is for quitters.',
  'Horror games at 2am with headphones on.',
  'Retro collector. If it is pre-2000, I am interested.',
  'Competitive by nature. Ranked only.',
  'Indie game evangelist. Triple A is overrated.',
  'Stealth player. If they saw me, I restart.',
  'Co-op or no-op. Everything is better with friends.',
  'JRPG enthusiast. 200 hours is a tutorial.',
  'Platinum hunter. No trophy left behind.',
  'Strategy nerd. Every move counts.',
  'Backlog bigger than my will to live.',
  'Soundtrack enjoyer. Half my playlists are OSTs.',
  'Roguelike addict. One more run.',
  'Narrative designer in training. I overanalyse everything.',
  'Casual vibes only. No rush, no rage.',
  'Sim builder. Cities, farms, parks. I build it all.',
  'Metroidvania connoisseur. Map completion or nothing.',
  'Esports watcher, ranked grinder, copium inhaler.',
  'Pixel art lover. Gameplay over graphics always.',
  'MMO veteran. Thousands of hours across dozens of worlds.',
  'Handheld gaming supremacy. Deck and Switch everywhere.',
  'Racing sim enthusiast. Manual gears, cockpit view, no assists.',
  'Lore hunter. I read every codex entry.',
  'Party game champion. Undefeated at game night.',
  'Puzzle game brain. Portal changed my life.',
  'Platformer purist. Tight controls or I am out.',
  'Tactical shooter main. Communication is key.',
  'Sports games and career modes. Been playing since the 90s.',
  'Survival game enthusiast. Day one of every early access.',
  'Achievement hunter. Gamerscore is a lifestyle.',
  'Modding community regular. Vanilla is just the beginning.',
  'Game Pass is the greatest deal in gaming history.',
  'Late night sessions and bad decisions. Would not change a thing.',
];

const PLATFORM_COMBOS = [
  ['playstation', 'pc'],
  ['pc'],
  ['xbox', 'pc'],
  ['playstation'],
  ['nintendo', 'pc'],
  ['playstation', 'xbox', 'pc'],
  ['nintendo'],
  ['xbox'],
  ['pc', 'nintendo'],
  ['playstation', 'nintendo'],
  ['xbox', 'playstation'],
  ['pc', 'xbox', 'nintendo'],
  ['playstation', 'pc', 'nintendo'],
  ['xbox', 'nintendo'],
  ['playstation', 'xbox'],
];

function generateProfiles() {
  const profiles = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    profiles.push({
      username: `${first.toLowerCase()}_${last.toLowerCase()}`,
      display_name: `${first} ${last}`,
      bio: BIOS[i % BIOS.length],
      platforms: PLATFORM_COMBOS[i % PLATFORM_COMBOS.length],
    });
  }
  return profiles;
}

const USERS = generateProfiles();

// ─── Review Text Templates ────────────────────────────────────────────────

const REVIEWS = [
  'One of the best games I have ever played. The world design is incredible and every detail feels intentional.',
  'Solid gameplay loop but the story fell flat for me. Still worth playing for the mechanics alone.',
  'This game absolutely nails the atmosphere. I was hooked from the first hour.',
  'Took me a while to get into it, but once it clicked I could not put it down. The late-game content is phenomenal.',
  'Beautiful art direction and soundtrack. The gameplay is simple but satisfying.',
  'Overhyped in my opinion. It is good, not great. The combat gets repetitive after a while.',
  'A masterclass in level design. Every area feels unique and rewarding to explore.',
  'The multiplayer is where this game really shines. Single player is just okay.',
  'Short but sweet. Perfect for a weekend playthrough. Wish there was more content though.',
  'Genuinely surprised by how much I enjoyed this. Went in with zero expectations and came out impressed.',
  'The attention to detail in this game is unreal. Little things like NPC routines and dynamic weather make the world feel alive.',
  'Incredible first half, but the pacing falls off after the midpoint. Still a great experience overall.',
  'Played this three times already and found something new each run. Replay value is off the charts.',
  'The boss fights are the highlight. Each one feels like a puzzle that rewards patience and observation.',
  'Not for everyone, but if you enjoy slow-burn narratives, this is essential.',
  'Perfect blend of challenge and accessibility. Hard enough to feel rewarding, never unfair.',
  'The soundtrack alone is worth the price of admission. Every track is a banger.',
  'Camera issues and some jank aside, the core experience is fantastic.',
  'I cannot believe this was made by such a small team. Punches way above its weight.',
  'A love letter to the genre. You can tell the developers genuinely care about this kind of game.',
  'Finished it in one sitting. Could not stop playing. That ending hit hard.',
  'Great foundation but needs more content. Hoping for DLC or a sequel.',
  'The writing is sharp and funny. Characters feel like real people, not video game NPCs.',
  'Went from "I will try it for an hour" to 60 hours logged. Send help.',
  'Technically impressive but emotionally hollow. Pretty game, empty soul.',
  'This is the game I have been waiting years for. It delivered on every promise.',
  'Challenging in the best way. Every death taught me something and every victory felt earned.',
  'The open world is massive but never feels empty. Always something interesting around the corner.',
  'A quiet, reflective experience. Not every game needs to be an adrenaline rush.',
  'The co-op experience is unmatched. Playing this with friends is pure joy.',
  'Absolute gem. This deserves way more attention than it got.',
  'The first few hours are slow but stick with it. The payoff is worth it.',
  'Easily my game of the year. Nothing else even comes close.',
  'Really solid remake. They kept what worked and improved everything else.',
  'The DLC is better than most full games. Incredible value.',
  'Finally a game that respects my time. No padding, no filler, just quality.',
  'I was not ready for that ending. Still thinking about it days later.',
  'Perfect comfort game. I keep coming back to it whenever I need to unwind.',
  'The art style carries this hard. Gameplay is mid but it is gorgeous.',
  'Honestly one of the most creative games I have played in years.',
  'This game has no business being this good. Absolutely floored.',
  'The world building is second to none. Every detail tells a story.',
  'Bought it on a whim. Now it is in my top five of all time.',
  'Perfect pacing from start to finish. Not a single wasted moment.',
  'The kind of game that makes you sit in silence after the credits roll.',
  'Proof that games are art. If you disagree, play this.',
  'Every system in this game feeds into every other system. Brilliant design.',
  'I have recommended this to everyone I know. Nobody has been disappointed.',
  'The difficulty curve is immaculate. Always challenging, never frustrating.',
  'Replayed it on three different platforms. Still finding new details.',
];

const COMMENT_TEXTS = [
  'Completely agree with this review.',
  'You nailed it. The late-game content is where it really shines.',
  'Interesting take. I had the opposite experience actually.',
  'This convinced me to finally give it a try.',
  'Great review. The soundtrack point is so true.',
  'I respect the opinion but I could not disagree more.',
  'Spot on. This is exactly how I felt playing it.',
  'Adding this to my backlog based on this review.',
  'The boss fights really are the highlight. Well said.',
  'Underrated game for sure. Glad someone is talking about it.',
  'How long did it take you to finish?',
  'I need to replay this. Your review reminded me how good it is.',
  'Hard agree. This game deserves more love.',
  'W review. Could not have said it better.',
  'Playing this right now because of your review.',
  'The ending caught me off guard too. Wild.',
  'Finally someone who gets it.',
  'This is going straight to the top of my backlog.',
  'Wish I could experience this for the first time again.',
  'The attention to detail you mentioned is exactly what hooked me.',
  'Fair review. I think I would rate it slightly higher though.',
  'This game is so underappreciated it hurts.',
  'You described exactly why I love this game.',
  'Genuinely curious what you would rate this out of five.',
  'My experience was completely different but I see where you are coming from.',
];

// ─── List Templates ───────────────────────────────────────────────────────

const LIST_TEMPLATES = [
  { title: 'All-Time Favourites',           desc: 'The games that define my taste.' },
  { title: 'Underrated Gems',               desc: 'Games that deserved way more attention than they got.' },
  { title: 'Games That Changed My Life',    desc: 'These games left a permanent mark.' },
  { title: 'Perfect 10s',                   desc: 'Games I consider absolutely flawless.' },
  { title: 'Cozy Weekend Games',            desc: 'Perfect for a lazy Saturday.' },
  { title: 'Best Boss Fights',              desc: 'Games with unforgettable boss encounters.' },
  { title: 'Games I Replay Every Year',     desc: 'Annual traditions at this point.' },
  { title: 'Hidden Indie Gems',             desc: 'Small games with big hearts.' },
  { title: 'Best Multiplayer Experiences',  desc: 'Games that are better with friends.' },
  { title: 'Solo Adventures',               desc: 'Best single-player experiences.' },
  { title: 'Incredible Soundtracks',        desc: 'Games I play just to hear the music.' },
  { title: 'Most Beautiful Games',          desc: 'Visual masterpieces.' },
  { title: 'Hardest Games I Have Beaten',   desc: 'Pain and glory.' },
  { title: 'Best Story-Driven Games',       desc: 'Narrative excellence.' },
  { title: 'Games Everyone Should Play',    desc: 'Essential gaming experiences.' },
  { title: 'Childhood Classics',            desc: 'The games that made me a gamer.' },
  { title: 'Short But Sweet',               desc: 'Brilliant games you can finish in a weekend.' },
  { title: 'Games That Surprised Me',       desc: 'Went in blind, came out impressed.' },
  { title: 'Most Addictive Games',          desc: 'Just one more turn. One more run. One more hour.' },
  { title: 'Best Art Direction',            desc: 'Games where every frame is a painting.' },
  { title: 'Play This Blind',               desc: 'Go in knowing nothing. Trust me.' },
  { title: 'Comfort Games',                 desc: 'Where I go when the world is too much.' },
  { title: 'Best Open Worlds',              desc: 'Worlds worth getting lost in.' },
  { title: 'Overlooked Masterpieces',        desc: 'Criminally underappreciated.' },
  { title: 'Best Horror Games',             desc: 'Games that actually scared me.' },
  { title: 'Games With The Best Endings',   desc: 'Stuck the landing.' },
  { title: 'Best Sequels',                  desc: 'Sequels that topped the original.' },
  { title: 'Living In My Head Rent Free',   desc: 'Games I cannot stop thinking about.' },
  { title: 'Best RPGs',                     desc: 'The genre that owns my free time.' },
  { title: 'Best of 2025',                  desc: 'My picks from last year.' },
  { title: 'Most Anticipated',              desc: 'Games I am counting down the days for.' },
  { title: 'Best Remakes and Remasters',    desc: 'Old games made new again.' },
  { title: 'Worth Full Price',              desc: 'Worth every penny on day one.' },
  { title: 'Best Atmosphere',               desc: 'Games that absolutely nail the vibe.' },
  { title: 'Best Combat Systems',           desc: 'Games where the fighting just feels right.' },
];

// ─── Constants ────────────────────────────────────────────────────────────

const STATUSES = ['playing', 'completed', 'played', 'want_to_play', 'on_hold', 'dropped'];
const STATUS_WEIGHTS = [0.15, 0.30, 0.20, 0.15, 0.10, 0.10];
const PLATFORMS_LOG = ['PlayStation 5', 'Xbox Series X', 'PC', 'Nintendo Switch', 'PlayStation 4', 'Xbox One'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function weightedPick(items, weights) {
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (r <= sum) return items[i];
  }
  return items[items.length - 1];
}
function randomRating() {
  const ratings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const weights = [0.02, 0.03, 0.05, 0.08, 0.12, 0.15, 0.25, 0.20, 0.10];
  return weightedPick(ratings, weights);
}
function randomDate(daysBack = 90) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().split('T')[0];
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function log(msg) { console.log(`  ${msg}`); }
function header(msg) { console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`); }

// Batch helper for .in() queries with large ID arrays (avoid URL length limits)
async function batchIn(table, column, ids, operation) {
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    await operation(supabase.from(table), column, batch);
  }
}

async function batchDelete(table, column, ids) {
  await batchIn(table, column, ids, (query, col, batch) =>
    query.delete().in(col, batch)
  );
}

// ─── Step 1: Create Auth Users ────────────────────────────────────────────

async function createAccounts() {
  header(`Creating ${USER_COUNT} user accounts`);
  const credentials = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const user = USERS[i];
    const email = `${user.username}@${EMAIL_DOMAIN}`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', user.username)
      .single();

    if (existing) {
      credentials.push({ email, username: user.username, password: PASSWORD, id: existing.id });
      if ((i + 1) % 20 === 0) log(`[${i + 1}/${USER_COUNT}] ... (skipping existing)`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: user.username,
        display_name: user.display_name,
      }
    });

    if (error) {
      console.error(`  FAILED ${user.username}: ${error.message}`);
      continue;
    }

    await sleep(500);

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        gaming_platforms: user.platforms,
      })
      .eq('id', data.user.id);

    if (updateErr) {
      console.error(`  FAILED updating profile for ${user.username}: ${updateErr.message}`);
    }

    credentials.push({ email, username: user.username, password: PASSWORD, id: data.user.id });

    if ((i + 1) % 10 === 0) {
      log(`[${i + 1}/${USER_COUNT}] Created ${user.username} (${user.display_name})`);
    }
  }

  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  log(`\n${credentials.length} accounts ready. Credentials saved to ${CREDENTIALS_FILE}`);

  return credentials;
}

// ─── Step 2: Seed Game Logs + Reviews ─────────────────────────────────────

async function seedGameLogs(users) {
  header('Seeding game logs and reviews');

  const { data: games, error } = await supabase
    .from('games_cache')
    .select('id, name')
    .order('name');

  if (error || !games?.length) {
    console.error('Failed to fetch games:', error?.message);
    return [];
  }

  log(`${games.length} games available in cache`);

  const allLogs = [];
  let totalReviews = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const numGames = 10 + Math.floor(Math.random() * 16); // 10-25
    const selectedGames = pickN(games, Math.min(numGames, games.length));

    const logs = selectedGames.map((game) => {
      const status = weightedPick(STATUSES, STATUS_WEIGHTS);
      const hasRating = status !== 'want_to_play' && Math.random() > 0.2;
      const hasReview = hasRating && Math.random() > 0.6; // ~40% of rated

      return {
        user_id: user.id,
        game_id: game.id,
        status,
        platform: pick(PLATFORMS_LOG),
        rating: hasRating ? randomRating() : null,
        review: hasReview ? pick(REVIEWS) : null,
        hours_played: status === 'want_to_play' ? null : Math.floor(Math.random() * 200) + 1,
        started_at: status !== 'want_to_play' ? randomDate(180) : null,
        completed_at: status === 'completed' ? randomDate(30) : null,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from('game_logs')
      .insert(logs)
      .select('id, user_id, game_id, review');

    if (insertErr) {
      console.error(`  FAILED logs for ${user.username}: ${insertErr.message}`);
      continue;
    }

    allLogs.push(...(inserted || []));
    const reviewCount = logs.filter(l => l.review).length;
    totalReviews += reviewCount;

    if ((i + 1) % 20 === 0) {
      log(`[${i + 1}/${users.length}] ${allLogs.length} logs, ${totalReviews} reviews so far`);
    }
  }

  log(`\nTotal: ${allLogs.length} game logs, ${totalReviews} reviews`);
  return allLogs;
}

// ─── Step 3: Seed Follows ────────────────────────────────────────────────

async function seedFollows(users) {
  header('Seeding follow relationships (all follow @abdulla + 20-40 random)');

  // Find abdulla
  const { data: abdulla } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', ABDULLA_USERNAME)
    .single();

  if (!abdulla) {
    console.error(`Could not find @${ABDULLA_USERNAME}!`);
    return;
  }

  log(`Found @${ABDULLA_USERNAME} (${abdulla.id})`);

  const follows = [];

  for (const user of users) {
    // Follow abdulla
    follows.push({ follower_id: user.id, following_id: abdulla.id });

    // Follow 20-40 random others
    const numFollows = 20 + Math.floor(Math.random() * 21);
    const others = users.filter(u => u.id !== user.id);
    const toFollow = pickN(others, Math.min(numFollows, others.length));

    for (const target of toFollow) {
      follows.push({ follower_id: user.id, following_id: target.id });
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueFollows = follows.filter(f => {
    const key = `${f.follower_id}-${f.following_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  log(`Inserting ${uniqueFollows.length} follow relationships...`);

  const BATCH_SIZE = 500;
  let success = 0;

  for (let i = 0; i < uniqueFollows.length; i += BATCH_SIZE) {
    const batch = uniqueFollows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('follows').insert(batch);

    if (error) {
      for (const f of batch) {
        const { error: e } = await supabase.from('follows').insert(f);
        if (!e) success++;
      }
    } else {
      success += batch.length;
    }

    if ((i + BATCH_SIZE) % 2000 < BATCH_SIZE) {
      log(`  ${Math.min(i + BATCH_SIZE, uniqueFollows.length)}/${uniqueFollows.length} processed`);
    }
  }

  log(`${success}/${uniqueFollows.length} follow relationships created`);
}

// ─── Step 4: Seed Favourite Games ─────────────────────────────────────────

async function seedFavourites(users) {
  header('Seeding favourite games');

  const { data: games } = await supabase
    .from('games_cache')
    .select('id')
    .order('name');

  if (!games?.length) {
    log('No games in cache, skipping');
    return;
  }

  let success = 0;

  for (const user of users) {
    const numFavs = 1 + Math.floor(Math.random() * 3); // 1-3
    const favGames = pickN(games, numFavs).map(g => g.id);

    const { error } = await supabase
      .from('profiles')
      .update({ favorite_games: favGames })
      .eq('id', user.id);

    if (!error) success++;
  }

  log(`${success}/${users.length} users got favourite games`);
}

// ─── Step 5: Seed Custom Lists ────────────────────────────────────────────

async function seedLists(users) {
  header('Seeding custom lists (~30% of users)');

  const { data: allGames } = await supabase
    .from('games_cache')
    .select('id, name')
    .order('name');

  if (!allGames?.length) {
    log('No games in cache, skipping');
    return;
  }

  // ~30% of users create lists
  const listCreators = pickN(users, Math.floor(users.length * 0.3));
  let listsCreated = 0;
  let itemsCreated = 0;

  for (const user of listCreators) {
    const numLists = 1 + Math.floor(Math.random() * 3); // 1-3 lists each
    const templates = pickN(LIST_TEMPLATES, numLists);

    for (const template of templates) {
      const { data: list, error: listErr } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          title: template.title,
          description: template.desc,
          is_public: true,
          is_ranked: Math.random() > 0.5,
        })
        .select('id')
        .single();

      if (listErr) {
        console.error(`  FAILED list "${template.title}" for ${user.username}: ${listErr.message}`);
        continue;
      }

      const numGames = 5 + Math.floor(Math.random() * 8); // 5-12 games
      const games = pickN(allGames, numGames);
      const items = games.map((game, idx) => ({
        list_id: list.id,
        game_id: game.id,
        position: idx,
      }));

      const { error: itemsErr } = await supabase.from('list_items').insert(items);

      if (itemsErr) {
        console.error(`  FAILED items for "${template.title}": ${itemsErr.message}`);
        continue;
      }

      listsCreated++;
      itemsCreated += items.length;
    }
  }

  log(`${listsCreated} lists created with ${itemsCreated} total items`);
}

// ─── Step 6: Seed Review Likes ────────────────────────────────────────────

async function seedReviewLikes(users, gameLogs) {
  header('Seeding review likes');

  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to like');
    return;
  }

  log(`${logsWithReviews.length} reviews available to like`);

  const likes = [];

  for (const user of users) {
    const otherReviews = logsWithReviews.filter(l => l.user_id !== user.id);
    if (!otherReviews.length) continue;

    const numLikes = 5 + Math.floor(Math.random() * 11); // 5-15
    const toLike = pickN(otherReviews, Math.min(numLikes, otherReviews.length));

    for (const review of toLike) {
      likes.push({ user_id: user.id, game_log_id: review.id });
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueLikes = likes.filter(l => {
    const key = `${l.user_id}-${l.game_log_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  log(`Inserting ${uniqueLikes.length} review likes...`);

  const BATCH_SIZE = 500;
  let success = 0;

  for (let i = 0; i < uniqueLikes.length; i += BATCH_SIZE) {
    const batch = uniqueLikes.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('review_likes').insert(batch);

    if (error) {
      for (const l of batch) {
        const { error: e } = await supabase.from('review_likes').insert(l);
        if (!e) success++;
      }
    } else {
      success += batch.length;
    }
  }

  log(`${success}/${uniqueLikes.length} review likes created`);
}

// ─── Step 7: Seed Review Comments ─────────────────────────────────────────

async function seedReviewComments(users, gameLogs) {
  header('Seeding review comments');

  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to comment on');
    return;
  }

  const comments = [];

  for (const user of users) {
    const otherReviews = logsWithReviews.filter(l => l.user_id !== user.id);
    if (!otherReviews.length) continue;

    const numComments = 2 + Math.floor(Math.random() * 7); // 2-8
    const toComment = pickN(otherReviews, Math.min(numComments, otherReviews.length));

    for (const review of toComment) {
      comments.push({
        user_id: user.id,
        game_log_id: review.id,
        content: pick(COMMENT_TEXTS),
      });
    }
  }

  log(`Inserting ${comments.length} comments...`);

  const BATCH_SIZE = 500;
  let success = 0;

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('review_comments').insert(batch);

    if (error) {
      for (const c of batch) {
        const { error: e } = await supabase.from('review_comments').insert(c);
        if (!e) success++;
      }
    } else {
      success += batch.length;
    }
  }

  log(`${success}/${comments.length} comments created`);
}

// ─── Teardown ─────────────────────────────────────────────────────────────

async function teardown() {
  header('Tearing down all 200 user accounts');

  // Find all seeded profiles by username
  const usernames = USERS.map(u => u.username);
  const allProfiles = [];

  // Batch username lookups (100 at a time to avoid URL limits)
  for (let i = 0; i < usernames.length; i += 100) {
    const batch = usernames.slice(i, i + 100);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', batch);

    if (error) {
      console.error(`Failed to find accounts (batch ${i}):`, error.message);
      continue;
    }
    if (data) allProfiles.push(...data);
  }

  if (!allProfiles.length) {
    log('No user accounts found');
    return;
  }

  log(`Found ${allProfiles.length} accounts to delete`);
  const ids = allProfiles.map(p => p.id);

  log('Deleting review comments...');
  await batchDelete('review_comments', 'user_id', ids);

  log('Deleting review likes...');
  await batchDelete('review_likes', 'user_id', ids);

  log('Deleting follows (as follower)...');
  await batchDelete('follows', 'follower_id', ids);

  log('Deleting follows (as following)...');
  await batchDelete('follows', 'following_id', ids);

  log('Deleting lists and list items...');
  const allListIds = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data: lists } = await supabase.from('lists').select('id').in('user_id', batch);
    if (lists) allListIds.push(...lists.map(l => l.id));
  }
  if (allListIds.length) {
    await batchDelete('list_items', 'list_id', allListIds);
    await batchDelete('lists', 'user_id', ids);
  }

  log('Deleting game logs...');
  await batchDelete('game_logs', 'user_id', ids);

  log('Resetting favourite games...');
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await supabase.from('profiles').update({ favorite_games: null }).in('id', batch);
  }

  log('Deleting auth users...');
  let deleted = 0;
  for (const profile of allProfiles) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(profile.id);
    if (delErr) {
      console.error(`  FAILED to delete ${profile.username}: ${delErr.message}`);
    } else {
      deleted++;
      if (deleted % 20 === 0) log(`  ${deleted}/${allProfiles.length} deleted`);
    }
  }

  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
    log('Removed credentials file');
  }

  log(`\nTeardown complete. ${deleted} accounts deleted.`);
}

// ─── Status Check ─────────────────────────────────────────────────────────

async function status() {
  header('User account status');

  const usernames = USERS.map(u => u.username);
  const allProfiles = [];

  for (let i = 0; i < usernames.length; i += 100) {
    const batch = usernames.slice(i, i + 100);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('username', batch);
    if (data) allProfiles.push(...data);
  }

  if (!allProfiles.length) {
    log('No user accounts found');
    return;
  }

  log(`${allProfiles.length}/${USER_COUNT} accounts exist\n`);

  const ids = allProfiles.map(p => p.id);

  // Count all data in batches
  let logCount = 0, followCount = 0, likeCount = 0, commentCount = 0, listCount = 0;

  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);

    const [logs, follows, likes, comments, lists] = await Promise.all([
      supabase.from('game_logs').select('*', { count: 'exact', head: true }).in('user_id', batch),
      supabase.from('follows').select('*', { count: 'exact', head: true }).in('follower_id', batch),
      supabase.from('review_likes').select('*', { count: 'exact', head: true }).in('user_id', batch),
      supabase.from('review_comments').select('*', { count: 'exact', head: true }).in('user_id', batch),
      supabase.from('lists').select('*', { count: 'exact', head: true }).in('user_id', batch),
    ]);

    logCount += logs.count || 0;
    followCount += follows.count || 0;
    likeCount += likes.count || 0;
    commentCount += comments.count || 0;
    listCount += lists.count || 0;
  }

  // Count favourites
  let favCount = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data } = await supabase.from('profiles').select('favorite_games').in('id', batch);
    if (data) favCount += data.filter(p => p.favorite_games?.length).length;
  }

  log(`Accounts:    ${allProfiles.length}`);
  log(`Game logs:   ${logCount}`);
  log(`Follows:     ${followCount}`);
  log(`Likes:       ${likeCount}`);
  log(`Comments:    ${commentCount}`);
  log(`Lists:       ${listCount}`);
  log(`Favourites:  ${favCount} users with favourites set`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];
  const startTime = Date.now();

  if (arg === '--teardown') { await teardown(); return; }
  if (arg === '--status') { await status(); return; }

  console.log('\n  Sweaty User Seeder');
  console.log(`  Creating ${USER_COUNT} accounts with full activity`);
  console.log('  Password for all accounts: ' + PASSWORD);

  const users = await createAccounts();
  if (!users.length) { console.error('No accounts created. Aborting.'); return; }

  const gameLogs = await seedGameLogs(users);
  await seedFollows(users);
  await seedFavourites(users);
  await seedLists(users);
  await seedReviewLikes(users, gameLogs);
  await seedReviewComments(users, gameLogs);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  header('Done!');
  log(`${USER_COUNT} user accounts created in ${elapsed}s with:`);
  log(`  - All following @${ABDULLA_USERNAME}`);
  log(`  - ${gameLogs.length} total game logs`);
  log(`  - Reviews, likes, comments, follows, lists, and favourites`);
  log(`  - Password: ${PASSWORD}`);
  log(`  - Credentials: ${CREDENTIALS_FILE}`);
  log(`\nTo check status:  node scripts/seed-users.js --status`);
  log(`To tear down:     node scripts/seed-users.js --teardown`);
}

main().catch(console.error);
