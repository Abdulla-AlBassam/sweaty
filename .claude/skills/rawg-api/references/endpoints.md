# RAWG API Endpoint Reference

## Table of Contents
1. [Authentication](#authentication)
2. [Pagination](#pagination)
3. [Games - List & Search](#games-list)
4. [Games - Details](#games-details)
5. [Games - Sub-resources](#games-sub-resources)
6. [Genres](#genres)
7. [Tags](#tags)
8. [Developers](#developers)
9. [Publishers](#publishers)
10. [Platforms](#platforms)
11. [Stores](#stores)
12. [Creators](#creators)
13. [Data Models](#data-models)
14. [Platform IDs](#platform-ids)
15. [Store IDs](#store-ids)

---

## Authentication

Every request requires an API key as a query parameter:

```
GET https://api.rawg.io/api/games?key=YOUR_API_KEY
```

Store the key in an environment variable (e.g. `RAWG_API_KEY`). Never commit it.

---

## Pagination

All list endpoints return paginated responses:

```json
{
  "count": 43971,
  "next": "https://api.rawg.io/api/games?key=...&page=2",
  "previous": null,
  "results": [...]
}
```

Parameters: `page` (int), `page_size` (int, default 20, max 40).

---

## Games - List & Search {#games-list}

### `GET /api/games`

The most powerful endpoint. Supports search and extensive filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search query |
| `search_precise` | bool | Disable fuzziness |
| `search_exact` | bool | Exact term match |
| `parent_platforms` | string | Filter by parent platform IDs, comma-separated (e.g. `1,2,3`) |
| `platforms` | string | Filter by platform IDs (e.g. `4,5`) |
| `stores` | string | Filter by store IDs (e.g. `1,3`) |
| `developers` | string | Filter by developer IDs or slugs (e.g. `valve-software`) |
| `publishers` | string | Filter by publisher IDs or slugs (e.g. `electronic-arts`) |
| `genres` | string | Filter by genre IDs or slugs (e.g. `action,indie`) |
| `tags` | string | Filter by tag IDs or slugs (e.g. `singleplayer,multiplayer`) |
| `creators` | string | Filter by creator IDs or slugs |
| `dates` | string | Filter by release date range (e.g. `2024-01-01,2024-12-31`) |
| `updated` | string | Filter by update date range |
| `metacritic` | string | Filter by Metacritic range (e.g. `80,100`) |
| `platforms_count` | int | Filter by number of platforms |
| `exclude_collection` | int | Exclude collection by ID |
| `exclude_additions` | bool | Exclude DLCs/editions |
| `exclude_parents` | bool | Exclude games with additions |
| `exclude_game_series` | bool | Exclude games in a series |
| `exclude_stores` | string | Exclude stores by ID |
| `ordering` | string | Sort field: `name`, `released`, `added`, `created`, `updated`, `rating`, `metacritic`. Prefix `-` for descending (e.g. `-rating`) |
| `page` | int | Page number |
| `page_size` | int | Results per page |

**Example — Top rated PS5 RPGs of 2024:**
```
GET /api/games?platforms=187&genres=role-playing-games-rpg&dates=2024-01-01,2024-12-31&ordering=-rating&key=YOUR_KEY
```

**Example — Search by name:**
```
GET /api/games?search=elden+ring&search_exact=true&key=YOUR_KEY
```

**Response `results` item (Game model):**
```json
{
  "id": 3498,
  "slug": "grand-theft-auto-v",
  "name": "Grand Theft Auto V",
  "released": "2013-09-17",
  "tba": false,
  "background_image": "https://media.rawg.io/...",
  "rating": 4.47,
  "rating_top": 5,
  "ratings": [
    { "id": 5, "title": "exceptional", "count": 3941, "percent": 58.92 },
    { "id": 4, "title": "recommended", "count": 2168, "percent": 32.41 },
    { "id": 3, "title": "meh", "count": 420, "percent": 6.28 },
    { "id": 1, "title": "skip", "count": 160, "percent": 2.39 }
  ],
  "ratings_count": 6573,
  "added": 20233,
  "added_by_status": {
    "yet": 511, "owned": 11540, "beaten": 5620, "toplay": 596, "dropped": 1051, "playing": 915
  },
  "metacritic": 92,
  "playtime": 74,
  "suggestions_count": 424,
  "updated": "2024-08-12T15:32:04",
  "esrb_rating": { "id": 4, "name": "Mature", "slug": "mature" },
  "platforms": [
    {
      "platform": { "id": 4, "name": "PC", "slug": "pc" },
      "released_at": "2013-09-17",
      "requirements": { "minimum": "...", "recommended": "..." }
    }
  ]
}
```

**Key fields for Sweaty:**
- `rating` / `ratings` — RAWG community rating (1-5 scale, with breakdown)
- `metacritic` — Metacritic score (0-100)
- `playtime` — Average playtime in hours (from Steam data)
- `added_by_status` — Shows how many users marked it as playing/beaten/dropped/etc.
- `platforms` — Platform availability with release dates and system requirements
- `esrb_rating` — Age rating

---

## Games - Details {#games-details}

### `GET /api/games/{id}`

Accepts game ID (int) or slug (string).

**Returns the full GameSingle model with additional fields beyond the list response:**

| Field | Type | Description |
|-------|------|-------------|
| `name_original` | string | Original name (non-English) |
| `description` | string | HTML description |
| `website` | string | Official website URL |
| `metacritic_url` | string | Link to Metacritic page |
| `metacritic_platforms` | array | Per-platform Metacritic scores: `[{ "metascore": 97, "url": "...", "platform": {...} }]` |
| `background_image_additional` | string | Second background image |
| `screenshots_count` | int | Number of screenshots available |
| `movies_count` | int | Number of trailers |
| `creators_count` | int | Number of individual creators |
| `achievements_count` | int | Number of achievements |
| `reddit_url` | string | Subreddit URL |
| `reddit_name` | string | Subreddit name |
| `reddit_count` | int | Recent Reddit posts count |
| `additions_count` | int | DLCs/editions count |
| `game_series_count` | int | Games in same series |
| `alternative_names` | array | Alternative game names |

---

## Games - Sub-resources {#games-sub-resources}

All sub-resource endpoints use the game's `id` or `slug` as a path parameter.

### `GET /api/games/{game_pk}/screenshots`
Returns: `{ count, results: [{ id, image, hidden, width, height }] }`

### `GET /api/games/{game_pk}/stores`
Returns: `{ count, results: [{ id, game_id, store_id, url }] }`
The `url` field is the direct purchase link.

### `GET /api/games/{game_pk}/game-series`
Returns: `{ count, results: [Game, ...] }` — other games in the franchise.

### `GET /api/games/{game_pk}/additions`
Returns: `{ count, results: [Game, ...] }` — DLCs, GOTY editions, companion apps.

### `GET /api/games/{game_pk}/parent-games`
Returns: `{ count, results: [Game, ...] }` — parent game for DLCs/editions.

### `GET /api/games/{game_pk}/development-team`
Returns: `{ count, results: [{ id, name, slug, image, image_background, games_count, positions: [...] }] }`

### `GET /api/games/{id}/achievements`
Returns: `{ count, results: [{ id, name, description, image, percent }] }`

### `GET /api/games/{id}/movies`
Returns: `{ count, results: [{ id, name, preview, data: { 480: "url", max: "url" } }] }`

### `GET /api/games/{id}/reddit`
Returns: `{ count, results: [{ id, name, text, image, url, username, username_url, created }] }`

### Business/Enterprise only:
- `GET /api/games/{id}/suggested` — Visually similar games
- `GET /api/games/{id}/twitch` — Twitch streams
- `GET /api/games/{id}/youtube` — YouTube videos

---

## Genres

### `GET /api/genres`
Returns: `{ count, results: [{ id, name, slug, games_count, image_background }] }`

### `GET /api/genres/{id}`
Returns genre with `description` field added.

---

## Tags

### `GET /api/tags`
Returns: `{ count, results: [{ id, name, slug, games_count, image_background, language }] }`
Tags are more granular than genres (e.g. "souls-like", "couch-co-op", "base-building").

### `GET /api/tags/{id}`
Returns tag with `description` field added.

---

## Developers

### `GET /api/developers`
Returns: `{ count, results: [{ id, name, slug, games_count, image_background }] }`

### `GET /api/developers/{id}`
Returns developer with `description` field added.

---

## Publishers

### `GET /api/publishers`
Returns: `{ count, results: [{ id, name, slug, games_count, image_background }] }`

### `GET /api/publishers/{id}`
Returns publisher with `description` field added.

---

## Platforms

### `GET /api/platforms`
Returns: `{ count, results: [{ id, name, slug, games_count, image_background, image, year_start, year_end }] }`

### `GET /api/platforms/lists/parents`
Returns parent platform groupings (e.g. "PlayStation" groups PS4, PS5, etc.)

### `GET /api/platforms/{id}`
Returns platform with `description` field added.

---

## Stores

### `GET /api/stores`
Returns: `{ count, results: [{ id, name, domain, slug, games_count, image_background }] }`

### `GET /api/stores/{id}`
Returns store with `description` field added.

---

## Creators

### `GET /api/creators`
Returns: `{ count, results: [{ id, name, slug, image, image_background, games_count }] }`

### `GET /api/creators/{id}`
Returns: `{ id, name, slug, image, image_background, description, games_count, reviews_count, rating, rating_top, updated }`

### `GET /api/creator-roles`
Returns: `{ count, results: [{ id, name, slug }] }` — Job positions (designer, artist, writer, etc.)

---

## Data Models

### Game (list item)
```
id, slug, name, released, tba, background_image, rating, rating_top,
ratings, ratings_count, added, added_by_status, metacritic, playtime,
suggestions_count, updated, esrb_rating, platforms
```

### GameSingle (detail)
All Game fields plus:
```
name_original, description, website, metacritic_url, metacritic_platforms,
background_image_additional, screenshots_count, movies_count, creators_count,
achievements_count, reddit_url, reddit_name, reddit_description, reddit_logo,
reddit_count, additions_count, game_series_count, alternative_names, platforms (with requirements)
```

### ScreenShot
```
id, image, hidden, width, height
```

### GameStoreFull
```
id, game_id, store_id, url
```

---

## Platform IDs {#platform-ids}

Common platform IDs for filtering:

| ID | Platform |
|----|----------|
| 4 | PC |
| 18 | PlayStation 4 |
| 187 | PlayStation 5 |
| 1 | Xbox One |
| 186 | Xbox Series S/X |
| 7 | Nintendo Switch |
| 3 | iOS |
| 21 | Android |

**Parent Platform IDs** (for `parent_platforms` parameter):

| ID | Parent |
|----|--------|
| 1 | PC |
| 2 | PlayStation |
| 3 | Xbox |
| 7 | Nintendo |
| 4 | iOS |
| 8 | Android |

---

## Store IDs {#store-ids}

| ID | Store |
|----|-------|
| 1 | Steam |
| 2 | Xbox Store |
| 3 | PlayStation Store |
| 4 | App Store |
| 5 | GOG |
| 6 | Nintendo Store |
| 7 | Xbox 360 Store |
| 8 | Google Play |
| 9 | itch.io |
| 11 | Epic Games |
