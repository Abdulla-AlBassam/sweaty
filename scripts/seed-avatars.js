#!/usr/bin/env node
/**
 * Seed Avatars for Sweaty
 *
 * Assigns DiceBear avatars to every seeded account (users, community, testers)
 * that currently has a null avatar_url. Deterministic: same username always
 * maps to the same avatar, so re-running is idempotent.
 *
 * Uses a rotation of refined DiceBear styles for visual variety while keeping
 * the cohesive illustrated aesthetic.
 *
 * Usage:
 *   node scripts/seed-avatars.js              # Assign avatars to seeded users
 *   node scripts/seed-avatars.js --all        # Assign to every seeded user, overwriting existing
 *   node scripts/seed-avatars.js --teardown   # Null avatar_url for all seeded users
 *   node scripts/seed-avatars.js --status     # How many seeded users have avatars
 *   node scripts/seed-avatars.js --preview    # Print first 10 URLs, no DB writes
 */

const fs = require('fs');
const path = require('path');

require('./_env');

const { createClient } = require(path.join(__dirname, '..', 'web', 'node_modules', '@supabase', 'supabase-js'));

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://onsmlscqlhpvltuwedzi.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var. Run with:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-avatars.js');
  process.exit(1);
}

const CREDENTIALS_FILES = [
  path.join(__dirname, 'user-credentials.json'),
  path.join(__dirname, 'community-credentials.json'),
  path.join(__dirname, 'tester-credentials.json'),
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Avatar Styles ────────────────────────────────────────────────────────
// Rotate through these for variety. All are illustrated-portrait styles that
// feel refined and match the "cool, refined, chill" brand.

const STYLES = [
  'notionists',
  'personas',
  'lorelei',
  'micah',
  'adventurer-neutral',
];

function avatarUrlFor(username) {
  // Deterministic style choice from username hash.
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash |= 0;
  }
  const style = STYLES[Math.abs(hash) % STYLES.length];
  const seed = encodeURIComponent(username);
  return `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function log(msg) { console.log(`  ${msg}`); }
function header(msg) { console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`); }

function loadSeededIds() {
  const ids = new Set();
  let loaded = 0;
  for (const file of CREDENTIALS_FILES) {
    if (!fs.existsSync(file)) {
      log(`(skip) ${path.basename(file)} — not found`);
      continue;
    }
    const creds = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const c of creds) if (c.id) ids.add(c.id);
    loaded += creds.length;
    log(`Loaded ${creds.length} from ${path.basename(file)}`);
  }
  return { ids: [...ids], total: loaded };
}

// ─── Apply ────────────────────────────────────────────────────────────────

async function apply(force) {
  header('Assigning avatars to seeded accounts');

  const { ids } = loadSeededIds();
  if (!ids.length) {
    log('No credentials files found. Run the seed scripts first.');
    return;
  }

  log(`${ids.length} unique seeded user IDs loaded`);

  // Fetch current username + avatar_url so we can skip users that already have
  // one (unless --all) and build the URL from the real username.
  const profiles = [];
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', batch);
    if (error) {
      console.error(`  FAILED to fetch profiles: ${error.message}`);
      return;
    }
    if (data) profiles.push(...data);
  }

  const targets = force ? profiles : profiles.filter(p => !p.avatar_url);
  log(`${targets.length} profiles need avatars${force ? ' (forcing overwrite)' : ''}`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    if (!p.username) { failed++; continue; }

    const url = avatarUrlFor(p.username);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', p.id);

    if (error) {
      console.error(`  FAILED ${p.username}: ${error.message}`);
      failed++;
    } else {
      success++;
    }

    if ((i + 1) % 25 === 0) log(`[${i + 1}/${targets.length}] processed`);
  }

  log(`\n${success} avatars assigned, ${failed} failed`);
}

// ─── Teardown ─────────────────────────────────────────────────────────────

async function teardown() {
  header('Clearing avatars for seeded accounts');

  const { ids } = loadSeededIds();
  if (!ids.length) {
    log('No credentials files found, nothing to clear.');
    return;
  }

  let success = 0;
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .in('id', batch);
    if (!error) success += batch.length;
    else console.error(`  FAILED batch: ${error.message}`);
  }

  log(`${success}/${ids.length} avatars cleared`);
}

// ─── Status ───────────────────────────────────────────────────────────────

async function status() {
  header('Seeded avatar status');

  const { ids } = loadSeededIds();
  if (!ids.length) {
    log('No credentials files found.');
    return;
  }

  let withAvatar = 0;
  let without = 0;
  const BATCH = 100;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .in('id', batch);
    if (data) {
      for (const p of data) {
        if (p.avatar_url) withAvatar++;
        else without++;
      }
    }
  }

  log(`\nTotal seeded:  ${ids.length}`);
  log(`With avatar:   ${withAvatar}`);
  log(`No avatar:     ${without}`);
}

// ─── Preview ──────────────────────────────────────────────────────────────

async function preview() {
  header('Preview (no DB writes)');

  const { ids } = loadSeededIds();
  if (!ids.length) {
    log('No credentials files found.');
    return;
  }

  const { data } = await supabase
    .from('profiles')
    .select('username')
    .in('id', ids.slice(0, 10));

  if (!data) return;

  for (const p of data) {
    if (!p.username) continue;
    log(`${p.username.padEnd(24)} → ${avatarUrlFor(p.username)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const arg = process.argv[2];
  if (arg === '--teardown') return teardown();
  if (arg === '--status') return status();
  if (arg === '--preview') return preview();
  return apply(arg === '--all');
}

main().catch(console.error);
