---
name: rawg-api
description: >
  Reference skill for integrating the RAWG Video Games Database API into Sweaty (or any video game app).
  Use this skill whenever you need to work with the RAWG API — fetching game data, building discovery feeds,
  displaying store links, showing screenshots, querying developers/creators/tags, or caching RAWG responses.
  Also use when the user mentions RAWG, game metadata enrichment, "where to buy" links, average playtime data,
  Metacritic scores from RAWG, game series lookups, achievement lists, or tag-based game filtering.
  If the task involves RAWG data in any way — reading, writing, displaying, caching, or mapping to IGDB — consult this skill first.
---

# RAWG Video Games Database API — Integration Skill

## Overview

RAWG (https://rawg.io) is a video game database with 500,000+ games. This skill covers how to integrate it into Sweaty alongside the existing IGDB + OpenCritic stack.

**Before writing any RAWG integration code, read `references/endpoints.md` for the full endpoint reference, query parameters, response shapes, and platform/store ID tables.**

For the raw OpenAPI spec, see `references/openapi-spec.json`.

---

## Quick Start

Base URL: `https://api.rawg.io/api`
Auth: API key as query param `?key=YOUR_API_KEY`
Format: JSON
Rate limit: 20,000 requests/month (free tier)

```typescript
// Example: fetch game details
const res = await fetch(
  `https://api.rawg.io/api/games/${slug}?key=${process.env.RAWG_API_KEY}`
);
const game = await res.json();
```

---

## Data Source Hierarchy for Sweaty

Sweaty uses three APIs. Each has a primary role — never duplicate data across sources when one already provides it well.

| Data | Primary Source | Fallback |
|------|---------------|----------|
| Game search & core metadata (name, genres, platforms, cover art, release date) | **IGDB** | RAWG |
| Critic review scores | **OpenCritic** | RAWG `metacritic` field |
| Community ratings (1-5 scale with breakdown) | **RAWG** | — |
| Average playtime (hours) | **RAWG** (`playtime` field, from Steam) | — |
| Player status breakdown (playing/beaten/dropped) | **RAWG** (`added_by_status`) | — |
| Store links / "Where to Buy" | **RAWG** (`/games/{id}/stores`) | — |
| Screenshots (supplementary) | **RAWG** (`/games/{id}/screenshots`) | IGDB |
| Game series / franchise info | **RAWG** (`/games/{id}/game-series`) | IGDB |
| DLCs & editions | **RAWG** (`/games/{id}/additions`) | IGDB |
| Achievements | **RAWG** (`/games/{id}/achievements`) | — |
| Development team / individual creators | **RAWG** (`/games/{id}/development-team`, `/creators/{id}`) | — |
| Tags (granular: "souls-like", "couch-co-op") | **RAWG** (`/api/tags`) | — |
| Game trailers | **RAWG** (`/games/{id}/movies`) | IGDB |
| Reddit community posts | **RAWG** (`/games/{id}/reddit`) | — |
| ESRB / age ratings | **RAWG** (`esrb_rating` field) | IGDB |

### ID Mapping Between IGDB and RAWG

RAWG and IGDB use different IDs for the same game. Map between them using the game **slug** — both APIs support slug-based lookups.

```typescript
// IGDB stores games with their own IDs
// RAWG also accepts slugs: GET /api/games/elden-ring
// Strategy: store the RAWG slug alongside the IGDB ID in your Supabase games table
```

**Recommended schema addition:**
```sql
ALTER TABLE games ADD COLUMN rawg_slug TEXT;
ALTER TABLE games ADD COLUMN rawg_id INTEGER;
```

When a user views a game detail page, if `rawg_slug` is null, look it up by searching RAWG with the game name and cache the mapping.

---

## Caching Strategy

With 20K requests/month, caching is critical.

### What to Cache in Supabase

| Data | Cache Duration | Reason |
|------|---------------|--------|
| Game details (playtime, ratings, metacritic) | 7 days | Changes slowly |
| Store links | 30 days | Rarely changes |
| Screenshots | 30 days | Static |
| Achievements | 30 days | Static after launch |
| Game series | 30 days | Rarely changes |
| Tags/genres/platforms lists | 30 days | Nearly static |
| Search results | Do NOT cache | Dynamic, user-specific |

### Cache Table Schema

```sql
CREATE TABLE rawg_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,        -- e.g. "game:elden-ring" or "stores:elden-ring"
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_rawg_cache_expires ON rawg_cache(expires_at);
```

### Cache Wrapper Pattern

```typescript
async function rawgFetch<T>(
  endpoint: string,
  cacheKey: string,
  cacheDurationDays: number = 7
): Promise<T> {
  // 1. Check cache
  const { data: cached } = await supabase
    .from('rawg_cache')
    .select('data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) return cached.data as T;

  // 2. Fetch from RAWG
  const res = await fetch(
    `https://api.rawg.io/api${endpoint}?key=${process.env.RAWG_API_KEY}`
  );
  const data = await res.json();

  // 3. Store in cache
  await supabase.from('rawg_cache').upsert({
    cache_key: cacheKey,
    data,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + cacheDurationDays * 86400000).toISOString(),
  }, { onConflict: 'cache_key' });

  return data as T;
}
```

---

## Feature Implementation Patterns

### 1. "Where to Buy" Section

On the game detail page, show store links with platform icons.

```typescript
// Fetch store links
const stores = await rawgFetch(
  `/games/${rawgSlug}/stores`,
  `stores:${rawgSlug}`,
  30
);
// Returns: { count, results: [{ id, game_id, store_id, url }] }
// Map store_id to store name using the Store IDs table in endpoints.md
```

Store ID → name mapping:
```typescript
const STORE_NAMES: Record<number, string> = {
  1: 'Steam', 2: 'Xbox Store', 3: 'PlayStation Store',
  4: 'App Store', 5: 'GOG', 6: 'Nintendo Store',
  8: 'Google Play', 9: 'itch.io', 11: 'Epic Games',
};
```

### 2. Playtime Badge on Game Cards

The `playtime` field (in hours) from the games list endpoint works without an extra API call.

```typescript
// Already available in game list/detail responses
<Badge>{game.playtime}h avg</Badge>
```

### 3. Community Rating Breakdown

RAWG provides a 4-tier rating breakdown (exceptional/recommended/meh/skip) which maps well to a visual bar or pie chart.

```typescript
// From game detail or list response
game.ratings = [
  { id: 5, title: "exceptional", count: 3941, percent: 58.92 },
  { id: 4, title: "recommended", count: 2168, percent: 32.41 },
  { id: 3, title: "meh", count: 420, percent: 6.28 },
  { id: 1, title: "skip", count: 160, percent: 2.39 }
];
```

### 4. Tag-Based Discovery Feeds

Tags are more specific than genres. Use them for curated feeds.

```typescript
// "Souls-like games rated 80+ on Metacritic"
const feed = await rawgFetch(
  `/games?tags=souls-like&metacritic=80,100&ordering=-rating&page_size=10`,
  `feed:souls-like-top`,
  7
);
```

### 5. Game Series / "More in this Franchise"

```typescript
const series = await rawgFetch(
  `/games/${rawgSlug}/game-series`,
  `series:${rawgSlug}`,
  30
);
// Returns a list of Game objects — render as a horizontal carousel
```

### 6. Developer / Creator Pages

```typescript
// Get games by developer
const devGames = await rawgFetch(
  `/games?developers=${devSlug}&ordering=-rating`,
  `dev-games:${devSlug}`,
  7
);

// Get individual creator profile
const creator = await rawgFetch(
  `/creators/${creatorId}`,
  `creator:${creatorId}`,
  14
);
```

### 7. Achievements List

```typescript
const achievements = await rawgFetch(
  `/games/${gameId}/achievements`,
  `achievements:${gameId}`,
  30
);
// Returns: [{ id, name, description, image, percent }]
// percent = % of players who earned it
```

---

## Terms of Service — MUST Follow

1. **Attribution required**: Add a visible "Powered by RAWG" link (`https://rawg.io`) on every page that displays RAWG data.
2. **Free for commercial use** if under 100K MAU or 500K page views/month.
3. **No data redistribution**: Do not resell or make RAWG data available to third parties.
4. **No cloning**: Do not build a RAWG competitor using their API.

---

## Common Pitfalls

- **Slug mismatches**: IGDB and RAWG slugs for the same game may differ slightly (e.g. hyphens vs underscores). Always verify with a search first before caching the mapping.
- **Playtime = 0**: Many non-Steam games have `playtime: 0` because the data comes from Steam. Don't show "0h avg" — hide the badge when playtime is 0.
- **HTML in descriptions**: The `description` field from game details contains HTML. Sanitize it before rendering.
- **Rate limits**: 20K/month = ~667/day. With aggressive caching, this is plenty for a growing app. Monitor usage.
- **Business-only endpoints**: `suggested` (similar games), `twitch`, and `youtube` endpoints require the $149/month Business plan. Do not use these on the free tier.
- **Empty store links**: Not all games have store links. Handle the empty array case gracefully.
- **ESRB can be null**: Some games don't have an ESRB rating. Always null-check.
