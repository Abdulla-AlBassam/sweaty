#!/usr/bin/env node
/**
 * Seed Community Accounts for Sweaty
 *
 * Creates 30 accounts that all follow @abdulla and each other,
 * log games, leave reviews/comments, and set favourite games.
 *
 * Usage:
 *   node scripts/seed-community.js              # Create accounts + seed data
 *   node scripts/seed-community.js --teardown   # Delete all community accounts
 *   node scripts/seed-community.js --status     # Check existing accounts
 *
 * Credentials are saved to scripts/community-credentials.json
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
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... SEED_PASSWORD=... node scripts/seed-community.js');
  process.exit(1);
}

const ABDULLA_USERNAME = 'abdulla';
const ACCOUNT_COUNT = 30;
const EMAIL_DOMAIN = 'sweaty.community';
const CREDENTIALS_FILE = path.join(__dirname, 'community-credentials.json');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── 30 Community Profiles ────────────────────────────────────────────────

const COMMUNITY = [
  { username: 'noura_gamer',      display_name: 'Noura Al-Rashid',    bio: 'Completionist. If it has trophies, I am playing it.',      platforms: ['playstation', 'pc'] },
  { username: 'khalid_plays',     display_name: 'Khalid Hassan',      bio: 'Late night gaming sessions only.',                         platforms: ['pc', 'xbox'] },
  { username: 'maya_ctrl',        display_name: 'Maya Torres',        bio: 'Indie games are my whole personality.',                    platforms: ['pc', 'nintendo'] },
  { username: 'omar_gg',          display_name: 'Omar Farouk',        bio: 'Fighting game community rep. Evo dreamer.',                platforms: ['playstation'] },
  { username: 'lina_8bit',        display_name: 'Lina Park',          bio: 'Retro collector. SNES to PS5.',                            platforms: ['nintendo', 'playstation'] },
  { username: 'rami_online',      display_name: 'Rami Khoury',        bio: 'If it has online co-op, count me in.',                     platforms: ['xbox', 'pc'] },
  { username: 'zara_quest',       display_name: 'Zara Malik',         bio: 'Open world wanderer. Never using fast travel.',            platforms: ['playstation', 'pc'] },
  { username: 'faisal_fps',       display_name: 'Faisal Nasser',      bio: 'FPS main. Valorant and CS2 grinder.',                      platforms: ['pc'] },
  { username: 'hana_cozy',        display_name: 'Hana Yoshida',       bio: 'Cozy games and lo-fi beats.',                              platforms: ['nintendo', 'pc'] },
  { username: 'tariq_souls',      display_name: 'Tariq Osman',        bio: 'Souls veteran. No summons, no shields.',                   platforms: ['playstation', 'pc'] },
  { username: 'sara_rpg',         display_name: 'Sara Andersen',      bio: 'JRPG enthusiast. 200 hours is a short game.',              platforms: ['playstation', 'nintendo'] },
  { username: 'adam_clutch',      display_name: 'Adam Reeves',        bio: 'Competitive by nature. Ranked only.',                      platforms: ['pc', 'xbox'] },
  { username: 'dina_pixel',       display_name: 'Dina Barakat',       bio: 'Pixel art lover. Gameplay over graphics.',                 platforms: ['pc', 'nintendo'] },
  { username: 'youssef_legend',   display_name: 'Youssef Karim',      bio: 'Been gaming since the PS1 days.',                          platforms: ['playstation'] },
  { username: 'emma_streams',     display_name: 'Emma Liu',           bio: 'Part-time streamer, full-time backlog ignorer.',           platforms: ['pc'] },
  { username: 'nabil_irl',        display_name: 'Nabil Shamsi',       bio: 'Sports games and racing sims.',                            platforms: ['xbox', 'playstation'] },
  { username: 'amira_nights',     display_name: 'Amira Zahran',       bio: 'Horror games at midnight. No lights.',                     platforms: ['playstation', 'pc'] },
  { username: 'kai_wanderer',     display_name: 'Kai Nakamura',       bio: 'Exploration over combat. Always.',                         platforms: ['nintendo', 'pc'] },
  { username: 'layla_lvlup',      display_name: 'Layla Haddad',       bio: 'Grinding levels while everyone sleeps.',                   platforms: ['pc', 'playstation'] },
  { username: 'musa_chill',       display_name: 'Musa Diallo',        bio: 'Casual vibes. No rush, no rage.',                          platforms: ['nintendo'] },
  { username: 'rana_boss',        display_name: 'Rana Elbaz',         bio: 'Boss fights are the best part of any game.',               platforms: ['playstation', 'pc'] },
  { username: 'hassan_grind',     display_name: 'Hassan Jaber',       bio: 'MMO main. Guild leader energy.',                           platforms: ['pc'] },
  { username: 'chloe_narrative',  display_name: 'Chloe Martin',       bio: 'Story first, always. Walking sims welcome.',               platforms: ['playstation', 'pc'] },
  { username: 'ali_combo',        display_name: 'Ali Mansour',        bio: 'If it has a combo system, I am learning it.',              platforms: ['playstation', 'xbox'] },
  { username: 'jasmine_farm',     display_name: 'Jasmine Pham',       bio: 'Stardew Valley changed my life.',                          platforms: ['nintendo', 'pc'] },
  { username: 'saeed_tactical',   display_name: 'Saeed Ibrahim',      bio: 'Strategy and tactics. Every move counts.',                 platforms: ['pc'] },
  { username: 'nina_loot',        display_name: 'Nina Petrova',       bio: 'Looter shooters and ARPGs. Loot goblin.',                  platforms: ['pc', 'xbox'] },
  { username: 'waleed_score',     display_name: 'Waleed Abdallah',    bio: 'Soundtrack enjoyer. OSTs on repeat.',                      platforms: ['playstation', 'pc'] },
  { username: 'ivy_dash',         display_name: 'Ivy Chen',           bio: 'Platformers and speedruns. Sub-hour or bust.',             platforms: ['nintendo', 'pc'] },
  { username: 'badr_endgame',     display_name: 'Badr Al-Otaibi',     bio: 'Endgame content is where the real game starts.',           platforms: ['playstation', 'xbox', 'pc'] },
];

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
  'Playing this right now because of your review lol.',
  'The ending caught me off guard too. Wild.',
];

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

// ─── Step 1: Create Auth Users ────────────────────────────────────────────

async function createAccounts() {
  header(`Creating ${ACCOUNT_COUNT} community accounts`);
  const credentials = [];

  for (let i = 0; i < ACCOUNT_COUNT; i++) {
    const member = COMMUNITY[i];
    const email = `${member.username}@${EMAIL_DOMAIN}`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', member.username)
      .single();

    if (existing) {
      log(`[${i + 1}/${ACCOUNT_COUNT}] ${member.username} already exists, skipping`);
      credentials.push({ email, username: member.username, password: PASSWORD, id: existing.id });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: member.username,
        display_name: member.display_name,
      }
    });

    if (error) {
      console.error(`  FAILED ${member.username}: ${error.message}`);
      continue;
    }

    await sleep(500);

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username: member.username,
        display_name: member.display_name,
        bio: member.bio,
        gaming_platforms: member.platforms,
      })
      .eq('id', data.user.id);

    if (updateErr) {
      console.error(`  FAILED updating profile for ${member.username}: ${updateErr.message}`);
    }

    credentials.push({ email, username: member.username, password: PASSWORD, id: data.user.id });
    log(`[${i + 1}/${ACCOUNT_COUNT}] Created ${member.username} (${member.display_name})`);
  }

  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  log(`\nCredentials saved to ${CREDENTIALS_FILE}`);

  return credentials;
}

// ─── Step 2: Seed Game Logs + Reviews ─────────────────────────────────────

async function seedGameLogs(members) {
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

  for (const member of members) {
    const numGames = 8 + Math.floor(Math.random() * 13); // 8-20 games each
    const selectedGames = pickN(games, numGames);

    const logs = selectedGames.map((game) => {
      const status = weightedPick(STATUSES, STATUS_WEIGHTS);
      const hasRating = status !== 'want_to_play' && Math.random() > 0.15;
      const hasReview = hasRating && Math.random() > 0.5; // 50% of rated games get a review

      return {
        user_id: member.id,
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
      console.error(`  FAILED logs for ${member.username}: ${insertErr.message}`);
      continue;
    }

    allLogs.push(...(inserted || []));
    const reviewCount = logs.filter(l => l.review).length;
    log(`${member.username}: ${numGames} games logged, ${reviewCount} reviews`);
  }

  return allLogs;
}

// ─── Step 3: Seed Follows (all follow @abdulla + each other) ──────────────

async function seedFollows(members) {
  header('Seeding follow relationships (all follow @abdulla + each other)');

  // Find abdulla's profile
  const { data: abdulla } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', ABDULLA_USERNAME)
    .single();

  if (!abdulla) {
    console.error(`Could not find @${ABDULLA_USERNAME} profile!`);
    return;
  }

  log(`Found @${ABDULLA_USERNAME} (${abdulla.id})`);

  const follows = [];

  // Every member follows abdulla
  for (const member of members) {
    follows.push({ follower_id: member.id, following_id: abdulla.id });
  }

  // Every member follows every other member
  for (const member of members) {
    for (const other of members) {
      if (member.id !== other.id) {
        follows.push({ follower_id: member.id, following_id: other.id });
      }
    }
  }

  log(`Inserting ${follows.length} follow relationships...`);

  // Insert in batches of 500 to avoid timeouts
  const BATCH_SIZE = 500;
  let success = 0;

  for (let i = 0; i < follows.length; i += BATCH_SIZE) {
    const batch = follows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('follows').insert(batch);

    if (error) {
      // Try one by one for this batch (some may already exist)
      for (const f of batch) {
        const { error: e } = await supabase.from('follows').insert(f);
        if (!e) success++;
      }
    } else {
      success += batch.length;
    }
  }

  log(`${success}/${follows.length} follow relationships created`);
}

// ─── Step 4: Seed Favourite Games ─────────────────────────────────────────

async function seedFavourites(members) {
  header('Seeding favourite games');

  const { data: games } = await supabase
    .from('games_cache')
    .select('id')
    .order('name');

  if (!games?.length) {
    log('No games in cache, skipping favourites');
    return;
  }

  let success = 0;

  for (const member of members) {
    // Each member gets 1-3 favourite games
    const numFavs = 1 + Math.floor(Math.random() * 3);
    const favGames = pickN(games, numFavs).map(g => g.id);

    const { error } = await supabase
      .from('profiles')
      .update({ favorite_games: favGames })
      .eq('id', member.id);

    if (!error) {
      success++;
    } else {
      console.error(`  FAILED favourites for ${member.username}: ${error.message}`);
    }
  }

  log(`${success}/${members.length} members got favourite games`);
}

// ─── Step 5: Seed Review Likes ────────────────────────────────────────────

async function seedReviewLikes(members, gameLogs) {
  header('Seeding review likes');

  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to like');
    return;
  }

  const likes = [];

  for (const member of members) {
    const otherReviews = logsWithReviews.filter(l => l.user_id !== member.id);
    if (!otherReviews.length) continue;

    const numLikes = 3 + Math.floor(Math.random() * 10); // 3-12 likes each
    const toLike = pickN(otherReviews, Math.min(numLikes, otherReviews.length));

    for (const review of toLike) {
      likes.push({ user_id: member.id, game_log_id: review.id });
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

  const { error } = await supabase.from('review_likes').insert(uniqueLikes);
  if (error) {
    let success = 0;
    for (const l of uniqueLikes) {
      const { error: e } = await supabase.from('review_likes').insert(l);
      if (!e) success++;
    }
    log(`${success}/${uniqueLikes.length} review likes created`);
  } else {
    log(`${uniqueLikes.length} review likes created`);
  }
}

// ─── Step 6: Seed Review Comments ─────────────────────────────────────────

async function seedReviewComments(members, gameLogs) {
  header('Seeding review comments');

  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to comment on');
    return;
  }

  const comments = [];

  for (const member of members) {
    const otherReviews = logsWithReviews.filter(l => l.user_id !== member.id);
    if (!otherReviews.length) continue;

    const numComments = 1 + Math.floor(Math.random() * 5); // 1-5 comments each
    const toComment = pickN(otherReviews, Math.min(numComments, otherReviews.length));

    for (const review of toComment) {
      comments.push({
        user_id: member.id,
        game_log_id: review.id,
        content: pick(COMMENT_TEXTS),
      });
    }
  }

  const { error } = await supabase.from('review_comments').insert(comments);
  if (error) {
    let success = 0;
    for (const c of comments) {
      const { error: e } = await supabase.from('review_comments').insert(c);
      if (!e) success++;
    }
    log(`${success}/${comments.length} comments created`);
  } else {
    log(`${comments.length} comments created`);
  }
}

// ─── Teardown ─────────────────────────────────────────────────────────────

async function teardown() {
  header('Tearing down all community accounts');

  const usernames = COMMUNITY.map(t => t.username);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  if (error) {
    console.error('Failed to find accounts:', error.message);
    return;
  }

  if (!profiles?.length) {
    log('No community accounts found');
    return;
  }

  log(`Found ${profiles.length} accounts to delete`);
  const ids = profiles.map(p => p.id);

  log('Deleting review comments...');
  await supabase.from('review_comments').delete().in('user_id', ids);

  log('Deleting review likes...');
  await supabase.from('review_likes').delete().in('user_id', ids);

  log('Deleting follows...');
  await supabase.from('follows').delete().in('follower_id', ids);
  await supabase.from('follows').delete().in('following_id', ids);

  log('Deleting game logs...');
  await supabase.from('game_logs').delete().in('user_id', ids);

  log('Deleting lists and list items...');
  const { data: lists } = await supabase.from('lists').select('id').in('user_id', ids);
  if (lists?.length) {
    const listIds = lists.map(l => l.id);
    await supabase.from('list_items').delete().in('list_id', listIds);
    await supabase.from('lists').delete().in('user_id', ids);
  }

  log('Resetting favourite games...');
  await supabase.from('profiles').update({ favorite_games: null }).in('id', ids);

  log('Deleting auth users...');
  for (const profile of profiles) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(profile.id);
    if (delErr) {
      console.error(`  FAILED to delete ${profile.username}: ${delErr.message}`);
    } else {
      log(`Deleted ${profile.username}`);
    }
  }

  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
    log('Removed credentials file');
  }

  log('\nTeardown complete');
}

// ─── Status Check ─────────────────────────────────────────────────────────

async function status() {
  header('Community account status');

  const usernames = COMMUNITY.map(t => t.username);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('username', usernames);

  if (!profiles?.length) {
    log('No community accounts found');
    return;
  }

  log(`${profiles.length}/${ACCOUNT_COUNT} accounts exist:\n`);

  const ids = profiles.map(p => p.id);

  const { count: logCount } = await supabase.from('game_logs').select('*', { count: 'exact', head: true }).in('user_id', ids);
  const { count: followCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).in('follower_id', ids);
  const { count: likeCount } = await supabase.from('review_likes').select('*', { count: 'exact', head: true }).in('user_id', ids);
  const { count: commentCount } = await supabase.from('review_comments').select('*', { count: 'exact', head: true }).in('user_id', ids);

  for (const p of profiles) {
    log(`  ${p.username} (${p.display_name})`);
  }

  log(`\nGame logs:   ${logCount || 0}`);
  log(`Follows:     ${followCount || 0}`);
  log(`Likes:       ${likeCount || 0}`);
  log(`Comments:    ${commentCount || 0}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];

  if (arg === '--teardown') { await teardown(); return; }
  if (arg === '--status') { await status(); return; }

  console.log('\n  Sweaty Community Seeder');
  console.log(`  Creating ${ACCOUNT_COUNT} accounts, all following @${ABDULLA_USERNAME}`);
  console.log('  Password for all accounts: ' + PASSWORD);

  const members = await createAccounts();
  if (!members.length) { console.error('No accounts created. Aborting.'); return; }

  const gameLogs = await seedGameLogs(members);
  await seedFollows(members);
  await seedFavourites(members);
  await seedReviewLikes(members, gameLogs);
  await seedReviewComments(members, gameLogs);

  header('Done!');
  log(`${ACCOUNT_COUNT} community accounts created with:`);
  log(`  - All following @${ABDULLA_USERNAME}`);
  log(`  - All following each other (${ACCOUNT_COUNT * (ACCOUNT_COUNT - 1)} mutual follows)`);
  log(`  - ${gameLogs.length} total game logs`);
  log(`  - Reviews, likes, comments, and favourite games`);
  log(`  - Password: ${PASSWORD}`);
  log(`  - Credentials: ${CREDENTIALS_FILE}`);
  log(`\nTo tear down: node scripts/seed-community.js --teardown`);
}

main().catch(console.error);
