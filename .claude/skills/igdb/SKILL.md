---
name: igdb
description: IGDB API v4 reference for building game recommendation lists and algorithms
disable-model-invocation: true
---

# IGDB API v4 -- Complete Reference for Game Recommendation Algorithms

This skill provides the full IGDB API v4 documentation needed to build game recommendation lists. It covers every endpoint, field, and enum relevant to querying, filtering, and ranking games.

**Source:** IGDB API documentation (api-docs.igdb.com), April 2026.

---

## 1. API Basics

**Base URL:** `https://api.igdb.com/v4/`

**Authentication headers (every request):**

```
-H 'Client-ID: <Client ID>'
-H 'Authorization: Bearer <access_token>'
-H 'Accept: application/json'
```

**Request format:** POST with an Apicalypse query string in the body (`-d`).

```bash
curl 'https://api.igdb.com/v4/games' \
  -d 'fields name,genres,themes,total_rating; where category = 0; sort total_rating desc; limit 50;' \
  -H 'Client-ID: Client ID' \
  -H 'Authorization: Bearer access_token' \
  -H 'Accept: application/json'
```

**Rate limits (expected):** 4 requests/second, max 500 results per query. Paginate with `offset` + `limit`.

---

## 2. All Available Endpoints

Endpoints marked **[REC]** are relevant to recommendation algorithms.

| Endpoint | Path (`/v4/...`) | Relevance |
|---|---|---|
| **Game** | `games` | **[REC] CRITICAL** |
| **Genre** | `genres` | **[REC]** |
| **Theme** | `themes` | **[REC]** |
| **Keyword** | `keywords` | **[REC]** |
| **Franchise** | `franchises` | **[REC]** |
| **Collection** | `collections` | **[REC]** |
| Collection Membership | `collection_memberships` | [REC] |
| Collection Relation | `collection_relations` | [REC] |
| Collection Type | `collection_types` | [REC] |
| Collection Membership Type | `collection_membership_types` | |
| Collection Relation Type | `collection_relation_types` | |
| **Involved Company** | `involved_companies` | **[REC]** |
| **Company** | `companies` | **[REC]** |
| **Game Mode** | `game_modes` | **[REC]** |
| **Player Perspective** | `player_perspectives` | **[REC]** |
| **Platform** | `platforms` | **[REC]** |
| **Platform Family** | `platform_families` | **[REC]** |
| **Popularity Primitive** | `popularity_primitives` | **[REC]** |
| **Popularity Type** | `popularity_types` | **[REC]** |
| **Game Type** | `game_types` | **[REC]** |
| **Game Status** | `game_statuses` | **[REC]** |
| **Game Time To Beat** | `game_time_to_beats` | **[REC]** |
| **Game Version** | `game_versions` | **[REC]** |
| **Release Date** | `release_dates` | **[REC]** |
| **External Game** | `external_games` | **[REC]** |
| **Search** | `search` | **[REC]** |
| **Multiplayer Mode** | `multiplayer_modes` | **[REC]** |
| Age Rating | `age_ratings` | |
| Age Rating Category | `age_rating_categories` | |
| Age Rating Content Description V2 | `age_rating_content_descriptions_v2` | |
| Age Rating Organization | `age_rating_organizations` | |
| Alternative Name | `alternative_names` | |
| Artwork | `artworks` | |
| Character | `characters` | |
| Cover | `covers` | |
| Game Engine | `game_engines` | |
| Game Video | `game_videos` | |
| Game Version Feature | `game_version_features` | |
| Screenshot | `screenshots` | |
| Website | `websites` | |

---

## 3. Game Endpoint

**Request Path:** `https://api.igdb.com/v4/games`

**Deprecated fields:** `category` (use `game_type`), `collection` singular (use `collections` plural), `follows` (being removed), `status` (use `game_status`).

### 3.1 Complete Field List

| Field | Type | Description | Rec. Use |
|---|---|---|---|
| `age_ratings` | Array of Age Rating IDs | The PEGI rating | Content filtering |
| `aggregated_rating` | Double | Rating based on external critic scores | Quality signal |
| `aggregated_rating_count` | Integer | Number of external critic scores | Confidence |
| `alternative_names` | Array of Alternative Name IDs | Alternative names for this game | |
| `artworks` | Array of Artwork IDs | Artworks of this game | |
| `bundles` | Array of Game IDs | The bundles this game is a part of | Filtering |
| `category` | Category Enum | **DEPRECATED** -- use `game_type` | Filtering (still works) |
| `checksum` | uuid | Hash of the object | |
| `collection` | Reference ID for Collection | **DEPRECATED** -- use `collections` | |
| `collections` | Array of Collection IDs | The collections that this game is in | **Series grouping** |
| `cover` | Reference ID for Cover | The cover of this game | Display |
| `created_at` | datetime | Date initially added to IGDB | |
| `dlcs` | Array of Game IDs | DLCs for this game | Inverse relationship |
| `expanded_games` | Array of Game IDs | Expanded games of this game | Inverse relationship |
| `expansions` | Array of Game IDs | Expansions of this game | Inverse relationship |
| `external_games` | Array of External Game IDs | External IDs on other services | Cross-platform links |
| `first_release_date` | Unix Time Stamp | The first release date for this game | **Recency filtering** |
| `follows` | Integer | **DEPRECATED** -- to be removed | |
| `forks` | Array of Game IDs | Forks of this game | Inverse relationship |
| `franchise` | Reference ID for Franchise | **The main franchise** | **Franchise matching** |
| `franchises` | Array of Franchise IDs | **Other franchises** the game belongs to | **Franchise matching** |
| `game_engines` | Array of Game Engine IDs | The game engine used in this game | |
| `game_localizations` | Array of Game Localization IDs | Supported localizations | |
| `game_modes` | Array of Game Mode IDs | Modes of gameplay | **Mode filtering** |
| `game_status` | Reference ID for Game Status | The status of the game's release | **Filter unreleased** |
| `game_type` | Reference ID for Game Type | The type of game | **Filter non-base games** |
| `genres` | Array of Genre IDs | Genres of the game | **Genre matching** |
| `hypes` | Integer | Number of follows before release | Hype signal |
| `involved_companies` | Array of Involved Company IDs | Companies who developed this game | **Dev/pub matching** |
| `keywords` | Array of Keyword IDs | Associated keywords | **Tag matching** |
| `language_supports` | Array of Language Support IDs | Supported languages | |
| `multiplayer_modes` | Array of Multiplayer Mode IDs | Multiplayer modes for this game | Mode detail |
| `name` | String | | Display |
| `parent_game` | Reference ID for Game | If a DLC, expansion, or part of a bundle, this is the main game or bundle | **DLC filtering** |
| `platforms` | Array of Platform IDs | Platforms released on | **Platform filtering** |
| `player_perspectives` | Array of Player Perspective IDs | The main perspective of the player | **Perspective matching** |
| `ports` | Array of Game IDs | Ports of this game | Inverse relationship |
| `rating` | Double | Average IGDB user rating | Quality signal |
| `rating_count` | Integer | Total number of IGDB user ratings | Confidence |
| `release_dates` | Array of Release Date IDs | Release dates of this game | |
| `remakes` | Array of Game IDs | Remakes of this game | Inverse relationship |
| `remasters` | Array of Game IDs | Remasters of this game | Inverse relationship |
| `screenshots` | Array of Screenshot IDs | Screenshots of this game | |
| `similar_games` | Array of Game IDs | Similar games (population method undocumented) | **Direct rec signal** |
| `slug` | String | URL-safe, unique, lower-case name | |
| `standalone_expansions` | Array of Game IDs | Standalone expansions of this game | Inverse relationship |
| `status` | Status Enum | **DEPRECATED** -- use `game_status` | |
| `storyline` | String | A short description of a game's story | NLP matching |
| `summary` | String | A description of the game | NLP matching |
| `tags` | Array of Tag Numbers | Related entities in the IGDB API | Composite tags |
| `themes` | Array of Theme IDs | Themes of the game | **Theme matching** |
| `total_rating` | Double | Average of IGDB user + external critic scores | **Best quality signal** |
| `total_rating_count` | Integer | Total number of user + external critic scores | Confidence |
| `updated_at` | datetime | Last update date in IGDB | |
| `url` | String | The website address (URL) of the item | |
| `version_parent` | Reference ID for Game | If a version, this is the main game | **Edition filtering** |
| `version_title` | String | Title of this version (e.g. Gold edition) | Display |
| `videos` | Array of Game Video IDs | Videos of this game | |
| `websites` | Array of Website IDs | Websites associated with this game | |

### 3.2 Key Design Decisions for Recommendation Logic

#### `parent_game` vs `version_parent`

| Field | Set when... | Example |
|---|---|---|
| `parent_game` | The game is a **DLC, expansion, or part of a bundle** | "The Witcher 3: Blood and Wine" -> parent_game = The Witcher 3 |
| `version_parent` | The game is a **version/edition** of another game | "The Witcher 3: GOTY Edition" -> version_parent = The Witcher 3 |

**To filter base games only:** exclude rows where `parent_game != null` (DLCs/expansions/bundle-parts) AND `version_parent != null` (editions). Combine with `category` filtering for best results.

#### `franchise` vs `franchises` vs `collections`

| Field | Type | Semantics |
|---|---|---|
| `franchise` (singular) | Reference ID for Franchise | **The main franchise** this game belongs to |
| `franchises` (plural) | Array of Franchise IDs | **Additional franchises** the game belongs to |
| `collections` (plural) | Array of Collection IDs | **Series/collections** this game is in |

- A game has ONE main franchise + MULTIPLE additional franchises.
- `franchise` = broad umbrella (e.g. "Star Wars"), `collections` = specific series (e.g. "Jedi Knight series").
- `collection` (singular) is deprecated; always use `collections` (plural).

#### `game_type` vs `category`

- `category` is a **deprecated enum** on Game (values 0--14). Still works and is simpler for filtering.
- `game_type` is a **Reference ID for Game Type** (separate endpoint with String `type` field).
- **Recommendation:** keep using `category` for filtering until you need the normalised approach.

#### Inverse relationship fields (base game -> derivatives)

| Field | Points to |
|---|---|
| `dlcs` | DLC games |
| `expansions` | Expansion games |
| `expanded_games` | Expanded editions |
| `standalone_expansions` | Standalone expansion games |
| `remakes` | Remakes |
| `remasters` | Remasters |
| `ports` | Ports |
| `forks` | Forks |
| `bundles` | Bundles containing this game |

---

## 4. Franchise Endpoint

A list of video game franchises such as Star Wars.

**Request Path:** `https://api.igdb.com/v4/franchises`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash of the object |
| `created_at` | datetime | Date initially added to IGDB |
| `games` | Array of Game IDs | The games associated with this franchise |
| `name` | String | The name of the franchise |
| `slug` | String | URL-safe name |
| `updated_at` | datetime | Last update date |
| `url` | String | IGDB URL |

> **Usage:** Given a game's `franchise`/`franchises` IDs, fetch the Franchise and read `games` to find siblings. Filter by genre/theme for broad franchises.

---

## 5. Collection Endpoints

Collections are "AKA Series" -- umbrella groupings. IGDB v4 uses a normalised multi-table model.

### 5.1 Collection

**Request Path:** `https://api.igdb.com/v4/collections`

| Field | Type | Description |
|---|---|---|
| `as_child_relations` | Array of Collection Relation IDs | Relations where this is the child |
| `as_parent_relations` | Array of Collection Relation IDs | Relations where this is the parent |
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `games` | Array of Game IDs | Games in this collection |
| `name` | String | Umbrella term for the collection |
| `slug` | String | URL-safe name |
| `type` | Reference ID for Collection Type | The type of collection |
| `updated_at` | datetime | Last update |
| `url` | String | IGDB URL |

### 5.2 Collection Membership

**Request Path:** `https://api.igdb.com/v4/collection_memberships`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `collection` | Reference ID for Collection | The collection |
| `created_at` | datetime | Date added |
| `game` | Reference ID for Game | The game |
| `type` | Reference ID for Collection Membership Type | Membership type |
| `updated_at` | datetime | Last update |

### 5.3 Collection Relation

**Request Path:** `https://api.igdb.com/v4/collection_relations`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `child_collection` | Reference ID for Collection | The child collection |
| `created_at` | datetime | Date added |
| `parent_collection` | Reference ID for Collection | The parent collection |
| `type` | Reference ID for Collection Relation Type | Relationship type |
| `updated_at` | datetime | Last update |

### 5.4 Practical Usage

For most recommendation use cases, the **simple path** is sufficient:

```
1. Fetch game -> get `collections` array (e.g. [42, 87])
2. Fetch /v4/collections where id = (42,87) -> get `games` arrays
3. Those game IDs are the siblings in the same series
```

The Membership/Relation tables add granularity (e.g. distinguishing "main entry" from "spin-off") but are optional for basic recommendations.

---

## 6. Involved Companies / Company

### 6.1 Involved Company

Join table between Game and Company. Tells you which company played which role.

**Request Path:** `https://api.igdb.com/v4/involved_companies`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `company` | Reference ID for Company | The company |
| `created_at` | datetime | Date added |
| `developer` | boolean | Was this company the developer? |
| `game` | Reference ID for Game | The game |
| `porting` | boolean | Responsible for porting? |
| `publisher` | boolean | Was this the publisher? |
| `supporting` | boolean | Supporting role? |
| `updated_at` | datetime | Last update |

### 6.2 Company

**Request Path:** `https://api.igdb.com/v4/companies`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `country` | Integer | ISO 3166-1 country code |
| `created_at` | datetime | Date added |
| `description` | String | Free text description |
| `developed` | Array of Game IDs | Games this company developed |
| `name` | String | Company name |
| `parent` | Reference ID for Company | Parent company |
| `published` | Array of Game IDs | Games this company published |
| `slug` | String | URL-safe name |
| `status` | Reference ID for Company Status | Company status |
| `updated_at` | datetime | Last update |
| `url` | String | IGDB URL |

> **Usage:** Given a game's `involved_companies`, filter for `developer = true`, fetch the Company, then use `developed` array for "more by this developer" lists.

---

## 7. Popularity Primitives & Popularity Type

### 7.1 Popularity Primitive

**Request Path:** `https://api.igdb.com/v4/popularity_primitives`

| Field | Type | Description |
|---|---|---|
| `calculated_at` | datetime | When this value was calculated |
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `external_popularity_source` | Reference ID for External Game Source | Source of popularity data |
| `game_id` | Integer | The game this value belongs to |
| `popularity_type` | Reference ID for Popularity Type | Type of popularity metric |
| `updated_at` | datetime | Last update |
| `value` | bigdecimal | The popularity value |

### 7.2 Popularity Type

**Request Path:** `https://api.igdb.com/v4/popularity_types`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `external_popularity_source` | Reference ID for External Game Source | Source |
| `name` | String | Type name (e.g. "Want to Play") |
| `updated_at` | datetime | Last update |

**Popularity Source Enum** (deprecated -- use `external_popularity_source`): steam = 1, igdb = 121.

> **Usage:** Fetch all popularity types to discover available metrics. Query pattern:
> ```bash
> curl 'https://api.igdb.com/v4/popularity_primitives' \
>   -d 'fields game_id,value,popularity_type; where popularity_type = 2; sort value desc; limit 50;'
> ```

---

## 8. Other Recommendation-Relevant Endpoints

### Game Mode

Single player, Multiplayer, etc.

**Request Path:** `https://api.igdb.com/v4/game_modes`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `name` | String | Mode name |
| `slug` | String | URL-safe name |
| `updated_at` | datetime | Last update |
| `url` | String | IGDB URL |

### Game Status

**Request Path:** `https://api.igdb.com/v4/game_statuses`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `status` | String | Status name (e.g. "Released") |
| `updated_at` | datetime | Last update |

### Game Type

Replacement for deprecated `category` enum.

**Request Path:** `https://api.igdb.com/v4/game_types`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `type` | String | Type name (e.g. "Main Game", "DLC") |
| `updated_at` | datetime | Last update |

### Game Time To Beat

**Request Path:** `https://api.igdb.com/v4/game_time_to_beats`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `completely` | Integer | Seconds to 100% completion |
| `count` | Integer | Number of submissions |
| `created_at` | datetime | Date added |
| `game_id` | Integer | The game ID |
| `hastily` | Integer | Seconds for main story rush |
| `normally` | Integer | Seconds for main story + some extras |
| `updated_at` | datetime | Last update |

> Use `normally` as the default length signal. All values in seconds.

### Game Version

**Request Path:** `https://api.igdb.com/v4/game_versions`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `features` | Array of Game Version Feature IDs | What makes this edition different |
| `game` | Reference ID for Game | The base game |
| `games` | Array of Game IDs | All versions/editions |
| `updated_at` | datetime | Last update |
| `url` | String | IGDB URL |

### Genre

**Request Path:** `https://api.igdb.com/v4/genres`

Fields: `checksum`, `created_at`, `name` (String), `slug` (String), `updated_at`, `url`. Fetch all with `fields name; limit 500;` to build lookup.

### Theme

**Request Path:** `https://api.igdb.com/v4/themes`

Same structure as Genre. Fetch all with `fields name; limit 500;`.

### Keyword

**Request Path:** `https://api.igdb.com/v4/keywords`

Words or phrases tagged to games (e.g. "steampunk", "world war 2"). Same name/slug structure. More granular and numerous than genres/themes.

### Player Perspective

**Request Path:** `https://api.igdb.com/v4/player_perspectives`

Same name/slug structure. Expected values: First Person, Third Person, Bird's Eye / Isometric, Side View, Text, Auditory, Virtual Reality.

### Platform

**Request Path:** `https://api.igdb.com/v4/platforms`

| Field | Type | Description |
|---|---|---|
| `abbreviation` | String | Abbreviation |
| `alternative_name` | String | Alternative name |
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `generation` | Integer | Platform generation |
| `name` | String | Platform name |
| `platform_family` | Reference ID for Platform Family | Family grouping |
| `platform_type` | Reference ID for Platform Type | Type of platform |
| `slug` | String | URL-safe name |
| `summary` | String | Description |
| `updated_at` | datetime | Last update |
| `url` | String | IGDB URL |

**Platform category enum** (deprecated -- use `platform_type`): console = 1, arcade = 2, platform = 3, operating_system = 4, portable_console = 5, computer = 6.

> Fetch with `fields name,abbreviation,platform_family; limit 500;` to build a lookup.

### Release Date

**Request Path:** `https://api.igdb.com/v4/release_dates`

| Field | Type | Description |
|---|---|---|
| `checksum` | uuid | Hash |
| `created_at` | datetime | Date added |
| `d` | Integer | Day of month |
| `date` | datetime | Release date |
| `date_format` | Reference ID for Date Format | Precision of date |
| `game` | Reference ID for Game | The game |
| `human` | String | Human-readable date string |
| `m` | Integer | Month (1 = January) |
| `platform` | Reference ID for Platform | Release platform |
| `release_region` | Reference ID for Release Date Region | Region |
| `status` | Reference ID for Release Date Status | Release status |
| `updated_at` | datetime | Last update |
| `y` | integer | Year (e.g. 2018) |

**Region enum** (deprecated): europe = 1, north_america = 2, australia = 3, new_zealand = 4, japan = 5, china = 6, asia = 7, worldwide = 8, korea = 9, brazil = 10.

> Use `game.first_release_date` for simple recency filtering. Use this endpoint for per-platform/per-region info.

---

## 9. Enums Reference

### 9.1 Game Category Enum (deprecated but functional)

| Name | Value | Include in base-game results? |
|---|---|---|
| main_game | 0 | YES |
| dlc_addon | 1 | NO |
| expansion | 2 | NO |
| bundle | 3 | NO |
| standalone_expansion | 4 | MAYBE (playable without base) |
| mod | 5 | NO |
| episode | 6 | NO |
| season | 7 | NO |
| remake | 8 | YES (new game in its own right) |
| remaster | 9 | YES (but may duplicate) |
| expanded_game | 10 | MAYBE (expanded re-release) |
| port | 11 | NO (duplicate of original) |
| fork | 12 | MAYBE |
| pack | 13 | NO |
| update | 14 | NO |

**Recommended base-game filter:** `where category = (0,4,8,9,10);` or more conservatively `where category = 0;`.

### 9.2 Game Status Enum (deprecated but functional)

| Name | Value |
|---|---|
| released | 0 |
| *(skipped)* | 1 |
| alpha | 2 |
| beta | 3 |
| early_access | 4 |
| offline | 5 |
| cancelled | 6 |
| rumored | 7 |
| delisted | 8 |

**Recommended filter:** `where status = (0,4);` for released + early access.

### 9.3 Lookup Endpoints (no hardcoded IDs)

Genre, Theme, Keyword, Game Mode, Player Perspective, Platform IDs are not enumerated in the docs. Fetch all records from each endpoint at startup to build local lookup tables:

```bash
# Example: fetch all genres
curl 'https://api.igdb.com/v4/genres' \
  -d 'fields name,slug; limit 500;' \
  -H 'Client-ID: Client ID' \
  -H 'Authorization: Bearer access_token' \
  -H 'Accept: application/json'
```

---

## 10. Query Syntax (Apicalypse)

### Basic structure

```
fields <field1>,<field2>,...;
where <condition>;
sort <field> asc|desc;
limit <n>;
offset <n>;
search "<query>";
```

### Example queries

```apicalypse
# Get base games only, sorted by rating
fields name,genres,themes,total_rating;
where category = 0;
sort total_rating desc;
limit 50;

# Exclude DLCs by checking parent_game is null
fields name,genres;
where parent_game = null;
limit 50;

# Filter by genre (array contains)
fields name;
where genres = (12,31);
limit 10;

# Search by name
search "zelda";
fields name,category,total_rating;
where category = 0;
limit 10;

# Expand sub-resources inline
fields name,genres.name,involved_companies.company.name,involved_companies.developer;
where category = 0;
limit 10;

# Get popular games
# (via popularity_primitives endpoint)
fields game_id,value;
where popularity_type = 2;
sort value desc;
limit 50;
```

### Pagination

```apicalypse
# Page 1
fields name; limit 500; offset 0;
# Page 2
fields name; limit 500; offset 500;
```

---

## 11. Remaining Gaps

These items are not in the docs and should be tested empirically:

| Item | Notes |
|---|---|
| `similar_games` population method | Docs just say "Similar games" -- likely curated/community-contributed |
| Null filtering syntax | `where parent_game = null` -- verify this works |
| Exact rate limits | Expected 4 req/sec, 500 max results -- verify |
| Popularity type ID mappings | Fetch from `/v4/popularity_types` to discover all available types |
