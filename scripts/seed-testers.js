#!/usr/bin/env node
/**
 * Seed Tester Accounts for Sweaty
 *
 * Creates 20 test accounts with realistic data: game logs, reviews,
 * follows, review likes, and comments.
 *
 * Usage:
 *   node scripts/seed-testers.js              # Create accounts + seed data
 *   node scripts/seed-testers.js --teardown   # Delete all tester accounts
 *   node scripts/seed-testers.js --status     # Check existing testers
 *
 * Credentials are saved to scripts/tester-credentials.json
 */

const fs = require('fs');
const path = require('path');

// Resolve supabase-js from web/node_modules since scripts/ has no own node_modules
const { createClient } = require(path.join(__dirname, '..', 'web', 'node_modules', '@supabase', 'supabase-js'));

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://onsmlscqlhpvltuwedzi.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD;

if (!SERVICE_ROLE_KEY || !PASSWORD) {
  console.error('Missing env vars. Run with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... SEED_PASSWORD=... node scripts/seed-testers.js');
  process.exit(1);
}
const TESTER_COUNT = 20;
const EMAIL_DOMAIN = 'sweaty.test';
const CREDENTIALS_FILE = path.join(__dirname, 'tester-credentials.json');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Tester Profiles ───────────────────────────────────────────────────────

const TESTERS = [
  { username: 'tester_alex',     display_name: 'Alex Rivera',      bio: 'RPG addict. 100% completionist.',                    platforms: ['playstation', 'pc'] },
  { username: 'tester_sam',      display_name: 'Sam Chen',         bio: 'Speedrunner and indie lover.',                        platforms: ['pc', 'nintendo'] },
  { username: 'tester_jordan',   display_name: 'Jordan Blake',     bio: 'Casual gamer, big on story.',                         platforms: ['playstation'] },
  { username: 'tester_morgan',   display_name: 'Morgan Hayes',     bio: 'FPS and battle royale tryhard.',                      platforms: ['pc', 'xbox'] },
  { username: 'tester_riley',    display_name: 'Riley Park',       bio: 'Nintendo fan since day one.',                         platforms: ['nintendo'] },
  { username: 'tester_casey',    display_name: 'Casey Nguyen',     bio: 'Souls-like enjoyer. I never rage quit.',              platforms: ['playstation', 'pc'] },
  { username: 'tester_drew',     display_name: 'Drew Martinez',    bio: 'Co-op gaming is the only way.',                       platforms: ['xbox', 'pc'] },
  { username: 'tester_taylor',   display_name: 'Taylor Kim',       bio: 'Visual novels and JRPGs.',                            platforms: ['pc', 'nintendo'] },
  { username: 'tester_jamie',    display_name: 'Jamie O\'Connor',  bio: 'Trophy hunter. Platinums or nothing.',                platforms: ['playstation'] },
  { username: 'tester_avery',    display_name: 'Avery Singh',      bio: 'Open world explorer. No fast travel.',                platforms: ['xbox', 'pc'] },
  { username: 'tester_quinn',    display_name: 'Quinn Frost',      bio: 'Horror games at 3am.',                                platforms: ['pc'] },
  { username: 'tester_reese',    display_name: 'Reese Tanaka',     bio: 'Fighting games and rhythm games.',                    platforms: ['playstation', 'nintendo'] },
  { username: 'tester_skyler',   display_name: 'Skyler Adams',     bio: 'Retro gaming collector.',                             platforms: ['nintendo', 'pc'] },
  { username: 'tester_harper',   display_name: 'Harper Lee',       bio: 'Strategy and simulation nerd.',                       platforms: ['pc'] },
  { username: 'tester_dakota',   display_name: 'Dakota Ruiz',      bio: 'I play everything on the hardest difficulty.',        platforms: ['playstation', 'xbox', 'pc'] },
  { username: 'tester_emery',    display_name: 'Emery Watts',      bio: 'Cozy games and farming sims.',                        platforms: ['nintendo', 'pc'] },
  { username: 'tester_rowan',    display_name: 'Rowan Patel',      bio: 'MMO veteran. Thousands of hours logged.',             platforms: ['pc'] },
  { username: 'tester_sage',     display_name: 'Sage Moreau',      bio: 'Narrative design student. I overanalyse everything.', platforms: ['playstation', 'pc'] },
  { username: 'tester_finley',   display_name: 'Finley Brooks',    bio: 'Sports games and racing.',                            platforms: ['xbox', 'playstation'] },
  { username: 'tester_lake',     display_name: 'Lake Anderson',    bio: 'Backlog bigger than my bookshelf.',                   platforms: ['pc', 'playstation', 'nintendo'] },
];

// ─── Review Text Templates ─────────────────────────────────────────────────

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
];

const STATUSES = ['playing', 'completed', 'played', 'want_to_play', 'on_hold', 'dropped'];
const STATUS_WEIGHTS = [0.15, 0.30, 0.20, 0.15, 0.10, 0.10]; // probability distribution
const PLATFORMS_LOG = ['PlayStation 5', 'Xbox Series X', 'PC', 'Nintendo Switch', 'PlayStation 4', 'Xbox One'];

// ─── Helpers ───────────────────────────────────────────────────────────────

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
  // Skew towards higher ratings (more realistic)
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

// ─── Step 1: Create Auth Users ─────────────────────────────────────────────

async function createTesters() {
  header('Creating 20 tester accounts');
  const credentials = [];

  for (let i = 0; i < TESTER_COUNT; i++) {
    const tester = TESTERS[i];
    const email = `${tester.username}@${EMAIL_DOMAIN}`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', tester.username)
      .single();

    if (existing) {
      log(`[${i + 1}/20] ${tester.username} already exists, skipping`);
      credentials.push({ email, username: tester.username, password: PASSWORD, id: existing.id });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true, // bypass email verification
      user_metadata: {
        username: tester.username,
        display_name: tester.display_name,
      }
    });

    if (error) {
      console.error(`  FAILED ${tester.username}: ${error.message}`);
      continue;
    }

    // Wait for the auto-create trigger to fire, then update profile
    await sleep(500);

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username: tester.username,
        display_name: tester.display_name,
        bio: tester.bio,
        gaming_platforms: tester.platforms,
      })
      .eq('id', data.user.id);

    if (updateErr) {
      console.error(`  FAILED updating profile for ${tester.username}: ${updateErr.message}`);
    }

    credentials.push({ email, username: tester.username, password: PASSWORD, id: data.user.id });
    log(`[${i + 1}/20] Created ${tester.username} (${tester.display_name})`);
  }

  // Save credentials
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  log(`\nCredentials saved to ${CREDENTIALS_FILE}`);

  return credentials;
}

// ─── Step 2: Seed Game Logs ────────────────────────────────────────────────

async function seedGameLogs(testers) {
  header('Seeding game logs and reviews');

  // Fetch available games from cache
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

  for (const tester of testers) {
    // Each tester logs 5-15 games
    const numGames = 5 + Math.floor(Math.random() * 11);
    const selectedGames = pickN(games, numGames);

    const logs = selectedGames.map((game, idx) => {
      const status = weightedPick(STATUSES, STATUS_WEIGHTS);
      const hasRating = status !== 'want_to_play' && Math.random() > 0.2;
      const hasReview = hasRating && Math.random() > 0.6; // ~40% of rated games get a review

      const log = {
        user_id: tester.id,
        game_id: game.id,
        status,
        platform: pick(PLATFORMS_LOG),
        rating: hasRating ? randomRating() : null,
        review: hasReview ? pick(REVIEWS) : null,
        hours_played: status === 'want_to_play' ? null : Math.floor(Math.random() * 200) + 1,
        started_at: status !== 'want_to_play' ? randomDate(180) : null,
        completed_at: status === 'completed' ? randomDate(30) : null,
      };

      return log;
    });

    // Batch insert
    const { data: inserted, error: insertErr } = await supabase
      .from('game_logs')
      .insert(logs)
      .select('id, user_id, game_id, review');

    if (insertErr) {
      console.error(`  FAILED logs for ${tester.username}: ${insertErr.message}`);
      continue;
    }

    allLogs.push(...(inserted || []));
    const reviewCount = logs.filter(l => l.review).length;
    log(`${tester.username}: ${logs.length} games logged, ${reviewCount} reviews`);
  }

  return allLogs;
}

// ─── Step 3: Seed Follow Relationships ─────────────────────────────────────

async function seedFollows(testers) {
  header('Seeding follow relationships');

  const follows = [];

  for (const tester of testers) {
    // Each tester follows 3-10 other testers
    const numFollows = 3 + Math.floor(Math.random() * 8);
    const others = testers.filter(t => t.id !== tester.id);
    const toFollow = pickN(others, Math.min(numFollows, others.length));

    for (const target of toFollow) {
      follows.push({
        follower_id: tester.id,
        following_id: target.id,
      });
    }
  }

  // Insert in batches to avoid duplicates
  const { error } = await supabase.from('follows').insert(follows);

  if (error) {
    // Some may already exist, try one by one
    let success = 0;
    for (const f of follows) {
      const { error: e } = await supabase.from('follows').insert(f);
      if (!e) success++;
    }
    log(`${success}/${follows.length} follow relationships created`);
  } else {
    log(`${follows.length} follow relationships created`);
  }
}

// ─── Step 4: Seed Review Likes ─────────────────────────────────────────────

async function seedReviewLikes(testers, gameLogs) {
  header('Seeding review likes');

  // Find logs that have reviews
  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to like');
    return;
  }

  const likes = [];

  for (const tester of testers) {
    // Each tester likes 2-8 reviews from other users
    const otherReviews = logsWithReviews.filter(l => l.user_id !== tester.id);
    if (!otherReviews.length) continue;

    const numLikes = 2 + Math.floor(Math.random() * 7);
    const toLike = pickN(otherReviews, Math.min(numLikes, otherReviews.length));

    for (const review of toLike) {
      likes.push({
        user_id: tester.id,
        game_log_id: review.id,
      });
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

// ─── Step 5: Seed Review Comments ──────────────────────────────────────────

async function seedReviewComments(testers, gameLogs) {
  header('Seeding review comments');

  const logsWithReviews = gameLogs.filter(l => l.review);
  if (!logsWithReviews.length) {
    log('No reviews to comment on');
    return;
  }

  const comments = [];

  for (const tester of testers) {
    // Each tester comments on 1-4 reviews
    const otherReviews = logsWithReviews.filter(l => l.user_id !== tester.id);
    if (!otherReviews.length) continue;

    const numComments = 1 + Math.floor(Math.random() * 4);
    const toComment = pickN(otherReviews, Math.min(numComments, otherReviews.length));

    for (const review of toComment) {
      comments.push({
        user_id: tester.id,
        game_log_id: review.id,
        content: pick(COMMENT_TEXTS),
      });
    }
  }

  const { error } = await supabase.from('review_comments').insert(comments);
  if (error) {
    console.error(`  FAILED inserting comments: ${error.message}`);
    // Try one by one
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

// ─── Teardown ──────────────────────────────────────────────────────────────

async function teardown() {
  header('Tearing down all tester accounts');

  // Find all tester profiles
  const usernames = TESTERS.map(t => t.username);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', usernames);

  if (error) {
    console.error('Failed to find testers:', error.message);
    return;
  }

  if (!profiles?.length) {
    log('No tester accounts found');
    return;
  }

  log(`Found ${profiles.length} tester accounts to delete`);
  const ids = profiles.map(p => p.id);

  // Delete related data first (in case cascades are not set up)
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

  // Delete auth users (this also deletes profiles via cascade/trigger)
  log('Deleting auth users...');
  for (const profile of profiles) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(profile.id);
    if (delErr) {
      console.error(`  FAILED to delete ${profile.username}: ${delErr.message}`);
    } else {
      log(`Deleted ${profile.username}`);
    }
  }

  // Clean up credentials file
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
    log('Removed credentials file');
  }

  log('\nTeardown complete');
}

// ─── Status Check ──────────────────────────────────────────────────────────

async function status() {
  header('Tester account status');

  const usernames = TESTERS.map(t => t.username);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('username', usernames);

  if (!profiles?.length) {
    log('No tester accounts found');
    return;
  }

  log(`${profiles.length}/20 tester accounts exist:\n`);

  const ids = profiles.map(p => p.id);

  const { count: logCount } = await supabase
    .from('game_logs')
    .select('*', { count: 'exact', head: true })
    .in('user_id', ids);

  const { count: followCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .in('follower_id', ids);

  const { count: likeCount } = await supabase
    .from('review_likes')
    .select('*', { count: 'exact', head: true })
    .in('user_id', ids);

  const { count: commentCount } = await supabase
    .from('review_comments')
    .select('*', { count: 'exact', head: true })
    .in('user_id', ids);

  for (const p of profiles) {
    log(`  ${p.username} (${p.display_name})`);
  }

  log(`\nGame logs:   ${logCount || 0}`);
  log(`Follows:     ${followCount || 0}`);
  log(`Likes:       ${likeCount || 0}`);
  log(`Comments:    ${commentCount || 0}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];

  if (arg === '--teardown') {
    await teardown();
    return;
  }

  if (arg === '--status') {
    await status();
    return;
  }

  console.log('\n  Sweaty Tester Seeder');
  console.log('  Password for all accounts: ' + PASSWORD);

  // Step 1: Create users
  const testers = await createTesters();
  if (!testers.length) {
    console.error('No testers created. Aborting.');
    return;
  }

  // Step 2: Seed game logs + reviews
  const gameLogs = await seedGameLogs(testers);

  // Step 3: Seed follows
  await seedFollows(testers);

  // Step 4: Seed review likes
  await seedReviewLikes(testers, gameLogs);

  // Step 5: Seed comments
  await seedReviewComments(testers, gameLogs);

  header('Done!');
  log(`20 tester accounts created with:`);
  log(`  - ${gameLogs.length} total game logs`);
  log(`  - Reviews, likes, comments, and follows`);
  log(`  - Password: ${PASSWORD}`);
  log(`  - Credentials: ${CREDENTIALS_FILE}`);
  log(`\nTo log in as any tester, use their email:`);
  log(`  e.g. tester_alex@sweaty.test / ${PASSWORD}`);
  log(`\nTo tear down: node scripts/seed-testers.js --teardown`);
}

main().catch(console.error);
