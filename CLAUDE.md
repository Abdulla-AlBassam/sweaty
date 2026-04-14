# Sweaty

A video game tracking app, like Letterboxd but for games. Track what you're playing, rate games, write reviews, and share your gaming journey.

## Current Development Focus

> **Mobile-first.** Active development happens in `/mobile` (React Native/Expo). The `/web` workspace is kept around for:
> - Vercel deployment of API routes consumed by the mobile app (https://sweaty-v1.vercel.app)
> - IGDB / Twitch / OpenCritic / RAWG / YouTube proxy endpoints
> - Steam and PlayStation import flows
> - Admin endpoints for bulk content operations
>
> All new product features ship in the mobile app first.

## Tech Stack

**Mobile (`/mobile`) — primary product:**
- Expo SDK 54, React Native 0.81, React 19
- TypeScript
- React Navigation v7 (bottom tabs + native stack)
- Supabase JS SDK with `@react-native-async-storage/async-storage`
- `expo-notifications`, `expo-haptics`, `expo-apple-authentication`, `expo-image-picker`, `expo-linear-gradient`, `expo-dynamic-app-icon`
- `react-native-svg`, `react-native-webview`, `react-native-youtube-iframe`, `react-native-toast-message`
- EAS Build for iOS / Android binaries

**Web (`/web`) — API + thin marketing site:**
- Next.js 16 (App Router) on Node 24 / Fluid Compute
- React 19, TypeScript, Tailwind CSS v4
- Supabase SSR (`@supabase/ssr`)
- `@vercel/speed-insights`
- `cheerio` for news scraping
- `lucide-react` icons, `sonner` toasts

**Backend / data:**
- Supabase (PostgreSQL) — auth, storage, RLS, cron jobs
- IGDB API via Twitch OAuth (game data)
- OpenCritic via RapidAPI (critic scores)
- Twitch Helix (live streams)
- YouTube Data API (game trailers / videos)
- News scraping (gaming outlets)

## Project Structure (Monorepo)

```
sweaty/
├── mobile/                          # Expo / React Native app (PRIMARY)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── DashboardScreen.tsx        # Home: hero carousel, curated lists, recommendations
│   │   │   ├── SearchScreen.tsx           # Search + dynamic discovery rows
│   │   │   ├── ActivityScreen.tsx         # Following activity feed
│   │   │   ├── ProfileScreen.tsx          # Own profile
│   │   │   ├── UserProfileScreen.tsx      # Other users' profiles
│   │   │   ├── GameDetailScreen.tsx       # Game page (OpenCritic, Twitch, friends, similar)
│   │   │   ├── LibraryStatusScreen.tsx    # Library filtered by status
│   │   │   ├── CuratedListDetailScreen.tsx
│   │   │   ├── ListDetailScreen.tsx       # Custom user list view
│   │   │   ├── AllReviewsScreen.tsx
│   │   │   ├── ReviewDetailScreen.tsx
│   │   │   ├── RankProgressScreen.tsx
│   │   │   ├── AIRecommendScreen.tsx      # AI-powered recommendations
│   │   │   ├── NewsScreen.tsx
│   │   │   ├── WatchScreen.tsx            # YouTube + news feed
│   │   │   ├── WebViewScreen.tsx
│   │   │   ├── PlatformConnectionsScreen.tsx
│   │   │   ├── PlayStationImportScreen.tsx
│   │   │   ├── QuickLogScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── LoginScreen.tsx, SignupScreen.tsx
│   │   │   ├── AdminCuratedListsScreen.tsx
│   │   │   └── AdminHeroBannersScreen.tsx
│   │   ├── components/                    # ~45 components incl.
│   │   │   ├── AnimatedTabBar.tsx, GlitchAddButton.tsx, GlitchLogo.tsx, GlitchText.tsx
│   │   │   ├── HeroBannerCarousel.tsx, CuratedListRow.tsx, HorizontalGameList.tsx
│   │   │   ├── GameCard.tsx, ListCard.tsx, ActivityItem.tsx, StackedAvatars.tsx
│   │   │   ├── LogGameModal.tsx, QuickLogModal.tsx, ReviewEditorModal.tsx
│   │   │   ├── ReviewComments.tsx, ReviewLikeButton.tsx, GameReviews.tsx
│   │   │   ├── TwitchStreamsSection.tsx, TrailerSection.tsx, NewsSection.tsx, WatchSection.tsx
│   │   │   ├── PlatformBadges.tsx, PremiumBadge.tsx, StreakBadge.tsx, XPProgressBar.tsx
│   │   │   ├── CreateListModal.tsx, AddToListModal.tsx, EditFavoritesModal.tsx
│   │   │   ├── BannerSelector.tsx, LibraryFilterModal.tsx, FollowersModal.tsx
│   │   │   ├── Confetti.tsx, PressableScale.tsx, StarRating.tsx, FormattedText.tsx
│   │   │   └── skeletons/                 # Specialised skeleton loaders
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx            # Supabase session, Apple sign-in
│   │   │   ├── QuickLogContext.tsx        # Global quick-log modal state
│   │   │   └── CelebrationContext.tsx     # Confetti / level-up overlays
│   │   ├── hooks/
│   │   │   ├── useSupabase.ts             # useCuratedLists, useOpenCritic, useFriendsWhoPlayed, useCommunityStats, ...
│   │   │   ├── useRecommendations.ts      # Because-you-loved, friends'-favorites, more-from-studio
│   │   │   ├── useLists.ts                # Custom user lists CRUD
│   │   │   ├── useHeroBanners.ts          # Dashboard hero carousel
│   │   │   ├── useNews.ts, useYouTube.ts  # Watch feed sources
│   │   │   ├── useTwitchStreams.ts, useFriendsPlaying.ts
│   │   │   ├── useStreak.ts, usePremium.ts
│   │   │   ├── useNotifications.ts        # expo-notifications registration + prefs
│   │   │   ├── usePlatformImport.ts, usePlatformFilter.ts
│   │   │   └── useHaptics.ts
│   │   ├── navigation/
│   │   │   ├── index.tsx                  # Root stack (auth + main)
│   │   │   └── MainTabs.tsx               # Home / Search / Add / Activity / Profile
│   │   ├── lib/
│   │   │   ├── supabase.ts                # Supabase client (AsyncStorage)
│   │   │   └── xp.ts                      # XP / level math
│   │   ├── constants/                     # colors, fonts, platforms, IGDB image helpers
│   │   └── types/index.ts                 # Profile, GameLog, GameList, PlatformConnection, NewsArticle, ...
│   ├── assets/brand/                      # Glitch logo SVG variants
│   ├── App.tsx, app.json, eas.json
│   └── package.json
│
├── web/                             # Next.js 16 (App Router) — API + marketing
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── games/{search,browse,[id],[id]/details,[id]/screenshots}/route.ts
│   │   │   │   ├── users/search/route.ts
│   │   │   │   ├── auth/lookup-email/route.ts
│   │   │   │   ├── twitch/streams/route.ts
│   │   │   │   ├── opencritic/[gameId]/route.ts
│   │   │   │   ├── youtube/route.ts
│   │   │   │   ├── news/route.ts
│   │   │   │   ├── popular-games/route.ts
│   │   │   │   ├── community/popular/route.ts
│   │   │   │   ├── recommendations/friends-favorites/route.ts
│   │   │   │   ├── ai/{recommend,personalized-recommendations}/route.ts
│   │   │   │   ├── notifications/send/route.ts
│   │   │   │   ├── import/steam/{auth,callback,status,sync}/route.ts
│   │   │   │   ├── import/playstation/{username,csv,status}/route.ts
│   │   │   │   └── admin/{cache-curated-games,list-cached-games,update-curated-list,backfill-screenshots}/route.ts
│   │   │   ├── dashboard/, game/[id]/, profile/[username]/, search/, settings/
│   │   │   ├── login/, signup/, setup-profile/
│   │   │   ├── error.tsx, not-found.tsx, layout.tsx, page.tsx, globals.css
│   │   ├── components/                    # Web counterparts (Navbar, GameCard, modals, install prompt, ...)
│   │   ├── lib/
│   │   │   ├── igdb.ts                    # IGDB helpers + smart similar-games
│   │   │   ├── xp.ts
│   │   │   └── supabase/{client,server}.ts
│   │   └── middleware.ts                  # Auth session refresh
│   ├── public/                            # PWA icons, hero-bg, sw.js, manifest
│   └── package.json, next.config.ts, tsconfig.json
│
├── database/                        # SQL migrations / seed data
│   ├── auto_create_profile.sql
│   ├── curated_lists / final_curated_lists.sql + per-list SQL files
│   ├── custom_lists.sql                   # User-created lists
│   ├── hero_banners.sql, premium_banners.sql
│   ├── opencritic_cache.sql
│   ├── platform_connections.sql           # Steam / PSN / Xbox links
│   ├── push_notifications.sql, notification_triggers.sql
│   ├── review_likes_comments.sql
│   ├── ai_recommendations.sql
│   ├── sweaty_curated_lists.csv           # Source data for curated rows
│   └── igdb_api_reference_complete.csv
│
├── scripts/                         # Node utilities (run locally)
│   ├── populate-curated-lists.js, process-curated-csv.js
│   ├── fetch-{fps,horror,open-world,roguelike,whodunit}-list.js
│   ├── fetch-{rawg,steamgrid}-banners.js, fetch-banner-artworks.js
│   ├── seed-{community,lists,testers}.js
│   └── *-credentials.json (gitignored)
│
├── logo-exports/                    # Exported brand assets
├── CLAUDE.md                        # This file
├── README.md
└── UI-ENHANCEMENT.md
```

## Database Schema (Supabase)

### Core tables

**`profiles`** — extends `auth.users`
| Column | Type |
|---|---|
| id | uuid (PK → auth.users) |
| username, display_name | text |
| avatar_url, banner_url, bio | text |
| favorite_games | bigint[] (max 3) |
| gaming_platforms | text[] (`playstation` / `xbox` / `pc` / `nintendo`) |
| exclude_pc_only | boolean |
| subscription_tier | `free` / `trial` / `monthly` / `yearly` / `lifetime` |
| subscription_expires_at, trial_started_at | timestamptz |
| current_streak, longest_streak | int |
| last_activity_at | timestamptz |
| notification_preferences | jsonb (`new_followers`, `friend_activity`, `streak_reminders`) |
| created_at, updated_at | timestamptz |

**`games_cache`** — local mirror of IGDB game data (id is the IGDB game id).

**`game_logs`** — user library entries.
Status enum: `playing`, `completed`, `played`, `want_to_play`, `on_hold`, `dropped`.
Includes `rating numeric(2,1)`, `platform`, `review`, `hours_played`, `started_at`, `completed_at`, `cover_variant`.

**`follows`** — `follower_id` / `following_id` with unique constraint and no self-follow.

### Discovery / content

- **`curated_lists`** — admin-curated discovery rows shown on the dashboard. Columns: `slug`, `title`, `description`, `game_ids bigint[]`, `display_order`, `is_active`.
- **`hero_banners`** / **`premium_banners`** — dashboard hero carousel artwork.
- **`opencritic_cache`** — 7-day TTL cache of OpenCritic scores keyed by IGDB id (`score`, `tier`, `num_reviews`).

### Social

- **`custom_lists`** + **`list_items`** — user-created game lists, public/private, ranked or unranked, with ordered items.
- **`review_likes`** + **`review_comments`** — likes and threaded comments on game-log reviews (`parent_id` enables replies).

### Platforms & notifications

- **`platform_connections`** — Steam / PSN / Xbox account links per user, with `access_token`, `refresh_token`, `last_synced_at`.
- **`platform_games`** — imported library entries from external platforms with playtime and achievement counts, optionally matched to an IGDB id.
- **`push_notifications`** — Expo push tokens and delivery log.
- **`notification_triggers`** — pg trigger functions that enqueue notifications on follows / activity.

All tables have RLS enabled. Public read for profiles / logs / lists; writes restricted to the owner.

## Key Features (current state)

**Library & social**
- Game logging with status, half-star ratings, platform, review (max 2000 chars), hours played, dates
- Profiles with favorites (max 3), gaming platforms, streaks, ranks, library by status
- Follow system with activity feed, followers / following modals
- Review likes and threaded comments
- Custom user lists (ranked or unranked, public or private)

**Discovery**
- Admin-curated dashboard rows (10+ lists, ~800 games)
- Hero banner carousel on the dashboard
- Three personalised recommendation rails: "Because you loved …", "Friends' favorites", "More from [studio]"
- AI recommendations screen
- Search across games and users; recent searches; pull-to-refresh dynamic lists on the Search tab (Trending, Popular in Community, Friends Playing)

**Game detail page**
- IGDB metadata, cover art, screenshots, similar games
- OpenCritic score (tier-coloured) + Sweaty community rating
- Live Twitch streams row (handles sequel numerals, romanisations, edition suffixes)
- Friends-who-played avatar row
- YouTube trailer section

**Watch / news**
- WatchScreen + dashboard WatchSection combine YouTube videos and scraped news articles
- News categorisation pills (Review, News, Trailer, Guide, List, Opinion, Analysis, General)

**Platforms & imports**
- Steam OAuth import (auth → callback → sync)
- PlayStation import via username lookup or CSV upload
- Per-platform sync status

**Gamification**
- Dual XP (Gamer XP + Social XP), 11 ranks each, level-up celebrations
- Streak tracking with daily activity check + reset logic
- Premium / Developer badge variants

**Notifications**
- `expo-notifications` registration with per-user preferences (followers, friend activity, streak reminders)
- Server-side `/api/notifications/send` triggered by Postgres triggers

**Auth**
- Email / password sign-up and sign-in (login accepts username or email)
- Apple Sign-In (`expo-apple-authentication`) on iOS
- Setup-profile flow on web after OAuth

**Admin (mobile)**
- AdminCuratedListsScreen and AdminHeroBannersScreen for live content edits
- Backfill endpoints for screenshots and curated game caching

## Key Decisions

1. **Mobile-first.** New product work happens in `/mobile`; the web app is intentionally minimal and only ships API routes plus a marketing surface.
2. **Supabase over Firebase.** PostgreSQL + RLS gives the relational power needed for follows, lists, comments, and aggregations.
3. **IGDB as the canonical game source**, with `games_cache` to avoid re-querying and to allow `bigint[]` joins from curated and custom lists.
4. **Caching tiers.** OpenCritic (7 days), Twitch streams (5 minutes in-memory), IGDB Twitch token cached on the server.
5. **Public-by-default game logs.** Like Letterboxd, logs and reviews are public to enable feeds and social discovery; RLS still restricts mutations.
6. **API proxying through `/web`.** Mobile never holds Twitch / RapidAPI / RAWG / YouTube secrets; everything sensitive lives behind Vercel functions.

## Deployment & Configuration

### Vercel
- **URL:** https://sweaty-v1.vercel.app
- **Project:** sweaty-v1
- **Root directory:** `/web` (configured in the Vercel dashboard)
- **Branch:** deploys from `main`

### GitHub
- **Repo:** https://github.com/Abdulla-AlBassam/sweaty
- **Default branch:** `main`

### Environment variables

**Web (`web/.env.local`)**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # admin endpoints, bypasses RLS
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
RAPIDAPI_KEY=                     # OpenCritic
YOUTUBE_API_KEY=
RAWG_API_KEY=                     # banner artwork (optional)
STEAM_API_KEY=                    # Steam import
```

**Mobile (`mobile/.env`)**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://sweaty-v1.vercel.app
```

### Running the mobile app
```bash
cd mobile
npm install
npx expo start          # opens dev menu; use the EAS dev build on iPhone
```
Native module changes require a fresh EAS dev build; JS-only changes hot-reload over `expo start`.

### Running the web app
```bash
cd web
npm install
npm run dev
```

## Conventions & Notes

- **British English** in copy and documentation. No em dashes.
- **Brand accent `Colors.cream` (`#C0C8D0`)** is cool silver, reserved for uppercase letter-spaced section headers and active/emphasis states. Not used on the SearchScreen for content labels.
- **Theme:** dark only. Warm dark greys (`#1A1A1C` / `#2A2A2E`), off-white accent (`#E0E0E0`), cool silver brand (`#C0C8D0`), gold reserved for ratings and achievements.
- **Typography:** Montserrat for display/headlines and glitch logo, Geist for body (all weights).
- **IGDB image URLs** must be built with `getIGDBImageUrl(idOrUrl, size)` from `mobile/src/constants` -- it normalises any input to the desired size.
- **Curated lists** require their games to be present in `games_cache` first. Use the admin endpoint or `scripts/populate-curated-lists.js` to backfill.
- **Streak logic** lives in `useStreak.recordActivity()` and is called from `LogGameModal` after a successful save.
- **Notifications** require an EAS dev build (push tokens are unavailable in Expo Go).
- **Design system details** are in `.impeccable.md` at the project root. That file is the source of truth for colours, typography, spacing, and visual patterns.

## Design Context

### Users
Gamers who want to track, rate, review, and share their gaming journey. They range from casual players to dedicated collectors who take pride in their library. They use Sweaty on mobile (primary) and web (landing page + API) to log games, discover new titles through curated lists and friend activity, and express their gaming identity. The core job: organise a personal gaming history and connect with others who share their taste.

### Brand Personality
**Cool, Refined, Chill.** Sweaty should feel like a sleek, premium space for gamers who care about their collection, not a competitive leaderboard or a sterile database. The tone is confident and understated, encouraging exploration over obligation. Despite the name's playful edge, the experience is calm, sophisticated, and intentionally restrained.

### Emotional Goals
- **Belonging and connection.** Being part of a community, seeing what friends play, shared discovery.
- **Pride and accomplishment.** Showing off a curated collection, feeling ownership over your gaming identity.
- **Excitement and discovery.** Finding new games through curated lists, recommendations, and friend activity.

### Aesthetic Direction
- **Visual tone:** dark, minimal, and refined. Letterboxd is the north star -- social, review-focused, strong personal identity, dark palette with purposeful accents.
- **Theme:** dark mode only. Warm dark backgrounds (#1A1A1C / #2A2A2E) with off-white text (#E0E0E0) and cool silver brand accent (#C0C8D0). Gold (#FFD700) reserved for ratings and achievements. A single intentional forest green (#2D6B4A) for the "Currently Playing" pulsing indicator only.
- **Typography:** Montserrat for display/headlines and glitch logo (bold personality), Geist for body in all weights (clean readability).
- **Colour usage:** restrained and monochromatic. Off-white for primary text and actions. Cool silver for branded headers, active states, and stat emphasis. Grays for secondary interactive elements. Colour should feel earned, not everywhere.

### Anti-References
- **No generic app store UI.** Sweaty must have distinct personality and feel handcrafted, never template-like.
- **No overly gamified or neon aesthetic.** Avoid badge overload, garish colours, XP bars dominating the UI, or Twitch-chat energy. Gamification (XP, streaks, ranks) should be subtle and feel like quiet rewards, not the main event.

### Design Principles
1. **Quiet confidence over loud decoration.** Let game artwork and user content be the visual centrepiece. UI elements should recede, not compete. Accents are purposeful signals, not decoration.
2. **Warmth through restraint.** A chill atmosphere comes from breathing room, not from adding cosy elements. Generous spacing, muted secondary text, and unhurried layouts create comfort.
3. **Community without clutter.** Social features (activity feeds, friend activity, follows) should feel like gentle ambient awareness, not a noisy feed. Show connections, do not shout them.
4. **Collection as identity.** A user's library, ratings, and reviews are self-expression. Treat them with the same care a gallery gives artwork: clean presentation, consistent sizing, intentional hierarchy.
5. **Earn every pixel.** Every element must justify its presence. If removing something doesn't hurt the experience, remove it. Prefer fewer, better-crafted screens over feature-packed ones.
