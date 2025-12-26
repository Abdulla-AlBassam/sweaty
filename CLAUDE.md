# Sweaty

A video game tracking app — like Letterboxd, but for games. Track what you're playing, rate games, write reviews, and share your gaming journey.

## Current Development Focus

> **⚠️ IMPORTANT:** We are now focused exclusively on building the **mobile app** (React Native/Expo). The web app (`/web`) is maintained only for:
> - Vercel deployment (provides API endpoints at https://sweaty-v1.vercel.app)
> - IGDB API proxy routes
> - Admin endpoints for bulk operations
>
> All new feature development happens in `/mobile`.

## Tech Stack

**Mobile App (Active Development):**
- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation (bottom tabs + stack)
- **Database & Auth:** Supabase (PostgreSQL)
- **Game Data:** IGDB API (via web app proxy)

**Web App (API/Deployment Only):**
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **Game Data:** IGDB API (via Twitch OAuth)

## Project Status

### Completed
- [x] Project setup (Next.js + TypeScript + Tailwind)
- [x] Git repository initialized
- [x] GitHub repository created (https://github.com/Abdulla-AlBassam/sweaty)
- [x] Supabase project configured
- [x] Supabase client libraries installed (@supabase/supabase-js, @supabase/ssr)
- [x] Database tables created (profiles, games_cache, game_logs)
- [x] Row Level Security policies configured
- [x] Auth middleware set up
- [x] IGDB API integration (search games, get game details)
- [x] API routes: `/api/games/search` and `/api/games/[id]`
- [x] Dark mode UI with Letterboxd-inspired color scheme
- [x] Landing page with hero, features, and CTA sections
- [x] Login page with Supabase Auth
- [x] Signup page with Supabase Auth
- [x] Protected dashboard page (redirects if not logged in)
- [x] Navbar with auth state (login/signup or logout)
- [x] Search results page with game grid (`/search?q=`)
- [x] Game detail page (`/game/[id]`)
- [x] Navbar search dropdown with live results
- [x] GameCard component for reusable game display
- [x] Game logging functionality (LogGameModal + GameLogButton)
- [x] Status tracking (Playing, Completed, Want to Play, On Hold, Dropped)
- [x] Star ratings (0.5-5 stars)
- [x] Platform selection
- [x] Completion date tracking
- [x] Login redirect for unauthenticated users
- [x] User profile page (`/profile/[username]`) with game library
- [x] Profile stats (games played, completed, average rating)
- [x] Filtered game views by status (All, Playing, Completed, etc.)
- [x] Settings page (`/settings`) with profile editing
- [x] Avatar upload to Supabase Storage
- [x] Username validation (3-20 chars, alphanumeric + underscore)
- [x] Real-time username availability checking
- [x] Password change functionality
- [x] Account deletion with confirmation
- [x] Enhanced dashboard with welcome message and stats
- [x] "Currently Playing" and "Recently Logged" sections on dashboard
- [x] SEO meta tags (Open Graph, Twitter Cards)
- [x] Dynamic meta tags for game and profile pages
- [x] Custom favicon (SVG) and OG image
- [x] PWA manifest (`site.webmanifest`)
- [x] Mobile-responsive design audit and fixes
- [x] Mobile-optimized LogGameModal (slides from bottom)
- [x] Touch-friendly star ratings (40px touch targets)
- [x] Custom 404 page with navigation options
- [x] Custom error page (500) with retry functionality
- [x] Toast notifications via Sonner library
- [x] Form validation with user-friendly error messages
- [x] Favorite Games feature (up to 3 per profile)
- [x] EditFavoritesModal for managing favorite games
- [x] Green heart styling for favorite games display
- [x] Text reviews in game logging (optional, max 2000 chars)
- [x] Reviews section on game detail page
- [x] Review indicator on profile game cards
- [x] Community ratings on game detail page (aggregated user ratings)
- [x] Randomized gaming-themed dashboard welcome messages
- [x] Follow system database structure (follows table with RLS)
- [x] Follow/Unfollow button on profiles
- [x] Follower and following counts on profiles
- [x] Followers/Following modal with user lists
- [x] Activity feed on dashboard (shows followed users' activity)
- [x] "Played" status option for games (in addition to Playing, Completed, etc.)
- [x] User search API route (`/api/users/search`)
- [x] Unified search in navbar (games and users)
- [x] Login with username or email
- [x] Enhanced PWA setup with service worker
- [x] PNG icons for PWA (192x192, 512x512)
- [x] InstallPrompt component for "Add to Home Screen"
- [x] Mobile-friendly full-screen search overlay
- [x] Landing page hero background image with gradient overlays
- [x] Dual XP system (Gamer XP + Social XP)
- [x] Level/Rank progression with 11 tiers each
- [x] XP toast notifications on game log save
- [x] Level up celebration toasts

## Database Schema

### profiles
Extends Supabase auth.users with app-specific data.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users |
| username | text | Unique username |
| display_name | text | Display name |
| avatar_url | text | Profile picture URL |
| banner_url | text | Profile banner URL |
| bio | text | User bio |
| favorite_games | bigint[] | Array of up to 3 favorite game IDs |
| subscription_tier | text | free, trial, monthly, yearly, lifetime |
| subscription_expires_at | timestamp | When subscription expires |
| current_streak | integer | Current consecutive day streak (default 0) |
| longest_streak | integer | All-time longest streak (default 0) |
| last_activity_at | timestamp | Last activity timestamp for streak calculation |
| created_at | timestamp | Auto-generated |
| updated_at | timestamp | Auto-updated |

### games_cache
Caches game data from IGDB to reduce API calls.
| Column | Type | Description |
|--------|------|-------------|
| id | bigint | IGDB game ID (primary key) |
| name | text | Game title |
| slug | text | URL-friendly name |
| summary | text | Game description |
| cover_url | text | Cover image URL |
| first_release_date | timestamp | Release date |
| genres | text[] | Array of genres |
| platforms | text[] | Array of platforms |
| rating | float | IGDB rating |
| cached_at | timestamp | When cached |

### game_logs
Tracks user's game library and progress.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | References profiles |
| game_id | bigint | References games_cache |
| status | text | playing, completed, played, dropped, want_to_play, on_hold |
| rating | numeric(2,1) | 0.5-5 rating (half stars) |
| platform | text | Platform played on |
| review | text | User's review |
| hours_played | int | Hours played |
| started_at | date | When started |
| completed_at | date | When completed |
| created_at | timestamp | Auto-generated |
| updated_at | timestamp | Auto-updated |

### follows
Tracks user follow relationships.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| follower_id | uuid | User who is following (references profiles) |
| following_id | uuid | User being followed (references profiles) |
| created_at | timestamp | When follow was created |

**Constraints:** UNIQUE(follower_id, following_id), no self-follows
**Indexes:** follower_id, following_id

### curated_lists
Stores curated game lists for the discover/search screen.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| slug | text | Unique URL-friendly identifier |
| title | text | Display title (e.g., "2025 Essentials") |
| description | text | Optional description |
| game_ids | bigint[] | Ordered array of IGDB game IDs |
| display_order | int | Order in which lists appear |
| is_active | boolean | Whether list is visible |
| created_at | timestamp | Auto-generated |
| updated_at | timestamp | Auto-updated |

**The 10 Curated Lists:**
1. 2025 Essentials (`2025-essentials`)
2. PlayStation Exclusives (`playstation-exclusives`)
3. PC Exclusive (`pc-exclusive`)
4. GOATed Remakes (`goated-remakes`)
5. Co-Op Must-Haves (`co-op-must-haves`)
6. Short & Sweet (`short-and-sweet`)
7. New Releases (`new-releases`)
8. Coming Soon (`coming-soon`)
9. Timeless Classics (`timeless-classics`)
10. Story-Driven (`story-driven`)

## Project Structure (Monorepo)

```
sweaty/
├── web/                             # Next.js web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── games/
│   │   │   │   │   ├── search/route.ts  # GET /api/games/search?q=zelda
│   │   │   │   │   └── [id]/route.ts    # GET /api/games/123
│   │   │   │   ├── users/
│   │   │   │   │   └── search/route.ts  # GET /api/users/search?q=john
│   │   │   │   ├── admin/
│   │   │   │   │   └── cache-curated-games/route.ts  # POST - bulk cache curated list games
│   │   │   │   └── auth/
│   │   │   │       └── lookup-email/route.ts  # POST - get email from username
│   │   │   ├── dashboard/page.tsx       # Protected dashboard with stats
│   │   │   ├── game/[id]/page.tsx       # Game detail page (dynamic meta)
│   │   │   ├── login/page.tsx           # Login form
│   │   │   ├── profile/[username]/
│   │   │   │   ├── layout.tsx           # Profile layout (dynamic meta)
│   │   │   │   └── page.tsx             # User profile with game library
│   │   │   ├── search/page.tsx          # Search results grid
│   │   │   ├── settings/page.tsx        # User settings (profile, password)
│   │   │   ├── signup/page.tsx          # Signup form
│   │   │   ├── error.tsx                # Custom 500 error page
│   │   │   ├── not-found.tsx            # Custom 404 page
│   │   │   ├── globals.css              # Global styles + CSS variables
│   │   │   ├── layout.tsx               # Root layout with Navbar + Toaster
│   │   │   └── page.tsx                 # Landing page
│   │   ├── components/
│   │   │   ├── ActivityFeed.tsx         # Activity feed showing followed users' game logs
│   │   │   ├── EditFavoritesModal.tsx   # Modal for editing favorite games
│   │   │   ├── FollowersModal.tsx       # Modal for followers/following lists
│   │   │   ├── GameCard.tsx             # Reusable game card with cover
│   │   │   ├── GameLogButton.tsx        # Log game button with auth handling
│   │   │   ├── GameRatings.tsx          # Aggregated community ratings display
│   │   │   ├── GameReviews.tsx          # Reviews display for game detail page
│   │   │   ├── LogGameModal.tsx         # Modal for logging games (mobile-optimized)
│   │   │   ├── Navbar.tsx               # Navigation with search dropdown
│   │   │   ├── ServiceWorkerRegister.tsx # PWA service worker registration
│   │   │   ├── InstallPrompt.tsx        # PWA install prompt (iOS + Chrome)
│   │   │   ├── MobileSearchOverlay.tsx  # Full-screen mobile search
│   │   │   ├── LevelBadge.tsx           # XP level badge component
│   │   │   └── XPProgressBar.tsx        # XP progress bar component
│   │   ├── lib/
│   │   │   ├── igdb.ts                  # IGDB API helper
│   │   │   ├── xp.ts                    # XP/Level calculation system
│   │   │   └── supabase/
│   │   │       ├── client.ts            # Browser Supabase client
│   │   │       └── server.ts            # Server Supabase client
│   │   └── middleware.ts                # Auth session refresh
│   ├── public/
│   │   ├── icon.svg                 # Favicon (green S on dark bg)
│   │   ├── icon-192.png             # PWA icon 192x192
│   │   ├── icon-512.png             # PWA icon 512x512
│   │   ├── hero-bg.jpg              # Landing page hero background
│   │   ├── og-image.svg             # Open Graph image
│   │   ├── sw.js                    # Service worker for offline caching
│   │   └── site.webmanifest         # PWA manifest
│   ├── .env.local                   # Environment variables (not in git)
│   ├── next.config.ts               # Next.js config (IGDB images)
│   ├── package.json                 # Web app dependencies
│   └── tsconfig.json                # TypeScript config
│
├── mobile/                          # React Native/Expo mobile app (ACTIVE DEVELOPMENT)
│   ├── src/
│   │   ├── screens/                 # Screen components
│   │   │   ├── DashboardScreen.tsx  # Home screen with curated lists
│   │   │   ├── SearchScreen.tsx     # Search + dynamic discovery lists
│   │   │   ├── ProfileScreen.tsx    # User's own profile
│   │   │   ├── UserProfileScreen.tsx # Other users' profiles
│   │   │   ├── GameDetailScreen.tsx # Game detail page
│   │   │   ├── SettingsScreen.tsx   # Settings page
│   │   │   ├── LoginScreen.tsx      # Login (email/password + Google)
│   │   │   ├── SignupScreen.tsx     # Signup
│   │   │   └── CuratedListDetailScreen.tsx # "See All" for curated lists
│   │   ├── components/
│   │   │   ├── AnimatedTabBar.tsx   # Custom bottom tab bar with animations
│   │   │   ├── GameCard.tsx         # Game cover card
│   │   │   ├── CuratedListRow.tsx   # Horizontal scroll curated list
│   │   │   ├── ActivityItem.tsx     # Activity feed item
│   │   │   ├── PremiumBadge.tsx     # Premium/Developer badge (gold/green variants)
│   │   │   ├── StreakBadge.tsx      # Fire icon streak display
│   │   │   ├── LogGameModal.tsx     # Game logging modal
│   │   │   ├── Skeleton.tsx         # Loading skeletons
│   │   │   └── skeletons/           # Specialized skeleton components
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Auth state management + Google OAuth
│   │   │   └── QuickLogContext.tsx  # Quick log modal state
│   │   ├── hooks/
│   │   │   ├── useSupabase.ts       # Data fetching hooks (includes useCuratedLists)
│   │   │   ├── usePremium.ts        # Premium subscription status
│   │   │   ├── useStreak.ts         # Streak tracking logic
│   │   │   └── index.ts             # Hook exports
│   │   ├── navigation/
│   │   │   ├── index.tsx            # Main navigation setup
│   │   │   └── MainTabs.tsx         # Bottom tab navigator
│   │   ├── lib/
│   │   │   ├── supabase.ts          # Supabase client (SecureStore)
│   │   │   └── xp.ts                # XP/Level system (shared logic)
│   │   ├── constants/
│   │   │   ├── colors.ts            # Theme colors (matches web)
│   │   │   ├── fonts.ts             # Font family definitions
│   │   │   └── index.ts             # Status labels, platforms, API config
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript types (Profile, GameLog, etc.)
│   ├── assets/                      # App icons and images
│   ├── App.tsx                      # Root component with AuthProvider
│   ├── app.json                     # Expo configuration
│   ├── eas.json                     # EAS Build configuration
│   ├── .env.example                 # Environment variables template
│   └── package.json                 # Mobile app dependencies
│
├── scripts/                         # Utility scripts
│   └── populate-curated-lists.js    # Script to populate curated lists from IGDB
│
├── database/                        # SQL schema files
│   └── curated_lists.sql            # Curated lists table schema
│
├── CLAUDE.md                        # This file (project documentation)
├── README.md                        # Getting started guide
└── vercel.json                      # Vercel deployment config (deploys /web)
```

## Key Decisions

1. **App Router over Pages Router** — App Router is the modern Next.js approach with better server component support.

2. **Supabase over Firebase** — PostgreSQL is more powerful than Firestore, and Supabase has excellent TypeScript support.

3. **IGDB for game data** — Most comprehensive game database with free API access via Twitch authentication.

4. **games_cache table** — Cache IGDB data locally to reduce API calls and improve performance.

5. **Public game logs** — Like Letterboxd, game logs are public by default to enable social features (activity feeds, seeing what friends play).

6. **Row Level Security** — All tables have RLS enabled. Users can only modify their own data, but viewing is public.

## Session Log

### Session 1 (Dec 16, 2024)
- Created Next.js project with TypeScript and Tailwind
- Set up GitHub repository
- Configured Supabase project and authentication
- Created database schema (profiles, games_cache, game_logs)
- Implemented RLS policies for data security
- Set up Supabase client utilities for both browser and server
- Integrated IGDB API with Twitch OAuth token caching
- Created API routes for game search and game details
- Built dark mode UI with Letterboxd-inspired design
- Created landing page, login, signup, and dashboard pages
- Implemented auth flow with protected routes
- Built search results page with responsive game grid
- Created game detail page with cover, metadata, and "Log Game" button
- Added live search dropdown to navbar with debounced API calls
- Configured Next.js for IGDB image optimization
- Built game logging functionality with LogGameModal component
- Created GameLogButton for auth-aware logging
- Implemented status tracking, star ratings (0.5-5), platform selection
- Added redirect handling for unauthenticated users
- Games are cached to games_cache table when logged
- Fixed database schema: added `platform` column to game_logs
- Fixed rating column type from smallint to numeric(2,1) for decimal ratings

### Session 2 (Dec 17, 2024)
**User Profile & Settings:**
- Built user profile page (`/profile/[username]`) with game library display
- Added profile stats: total games, completed count, average rating
- Implemented status filter tabs (All, Playing, Completed, Want to Play, etc.)
- Created settings page (`/settings`) with comprehensive profile management
- Avatar upload functionality using Supabase Storage
- Username editing with real-time availability checking
- Display name and bio editing (200 char limit with counter)
- Password change functionality
- Account deletion with "DELETE" confirmation modal

**Dashboard Enhancement:**
- Added personalized welcome message with user's display name
- Quick stats cards (Games Logged, Completed, Playing, Average Rating)
- "Currently Playing" section showing active games
- "Recently Logged" section with latest game activity
- Removed redundant "Find more games" prompt for users with games

**SEO & Branding:**
- Comprehensive metadata in layout.tsx (Open Graph, Twitter Cards)
- Dynamic meta tags for game pages (title, description, cover image)
- Dynamic meta tags for profile pages via layout.tsx
- Created SVG favicon (`/public/icon.svg`) - green "S" on dark background
- Created Open Graph image (`/public/og-image.svg`)
- Added PWA manifest (`/public/site.webmanifest`)
- Fixed metadataBase warning with environment variable fallback

**Mobile Responsiveness:**
- Audited all pages for mobile compatibility
- LogGameModal now slides up from bottom on mobile, centers on desktop
- Landing page buttons stack vertically on small screens
- Increased star rating touch targets to 40px on mobile (was 32px)
- Verified Next.js Image lazy loading already in place

**Error Handling & UX:**
- Custom 404 page (`not-found.tsx`) with gamepad icon and navigation
- Custom error page (`error.tsx`) with retry button and dev error details
- Installed Sonner toast library for notifications
- Added global `<Toaster>` component with dark theme styling
- Toast notifications for game logging (add/update/remove)
- Toast notifications throughout settings page
- Migrated settings page from custom notifications to Sonner
- Form validation with user-friendly error messages

**Favorite Games Feature:**
- Added `favorite_games` column to profiles table (bigint[] for up to 3 game IDs)
- Created EditFavoritesModal component for managing favorites
- Favorites section on profile page with gold ring/star styling
- Search within modal to find games from library or IGDB
- If game not in library, opens LogGameModal to log it first
- Edit button only visible on own profile

**UI Polish:**
- Changed Settings gear icon to text "Settings" in navbar
- Removed redundant Settings button from dashboard
- Changed logo from "Sweaty" to lowercase "sweaty" in navbar

**Bug Fixes:**
- Fixed favorite games not displaying on profile page (CSS height issue with Next.js Image `fill` prop)
- Moved `aspect-[3/4]` to outer wrapper div so Image parent has concrete dimensions
- Changed favorites data fetching to query `games_cache` directly with `.in()` for reliability
- Removed star badge overlay from favorite game covers (gold ring is sufficient indicator)

**Dependencies Added:**
- `sonner` - Toast notification library

### Session 3 (Dec 17, 2024)
**Text Reviews Feature:**
- Added review textarea to LogGameModal (optional, max 2000 characters with counter)
- Reviews saved to game_logs table (column already existed)
- Created GameReviews.tsx component for displaying reviews on game detail page
- Reviews show user avatar, username, display name, rating, review text, and date
- Added Reviews section to game detail page (`/game/[id]`)
- Loading skeleton and empty state for reviews
- Added review indicator (MessageSquare icon) on profile game cards
- Badges stack vertically on game cards (rating above, review below)

**Community Ratings Feature:**
- Created GameRatings.tsx component showing aggregated user ratings
- Displays average rating (out of 5) with rating count
- Replaced static "Sweaty Ratings" placeholder with dynamic community ratings
- Shows "No ratings yet" message when no users have rated

**Favorite Games Styling Update:**
- Changed favorite games icon from yellow star to green heart (matches app accent color)
- Updated game card ring color from yellow to green (var(--accent))
- Updated empty placeholder hover border to green

**Dashboard Welcome Messages:**
- Replaced time-based greeting with randomized gaming-themed messages
- Messages include: "Press Start", "Continue", "New quest awaits", "The hero returns", "Quest log updated", "You've respawned", "Ready to game", "One more game", "Touch grass later"
- Question messages end with "?" after username (e.g., "Continue, Abdulla?")
- Statement messages end with "!" after username (e.g., "Press Start, Abdulla!")

**Follow System (Social Features):**
- Created `follows` table in Supabase with follower_id and following_id
- RLS policies: anyone can view, users can only manage their own follows
- Indexes on follower_id and following_id for performance
- Constraint to prevent self-following
- Profile page shows follower and following counts
- Follow/Unfollow button on other users' profiles
- Button shows "Follow" (green) or "Following" (gray, turns red "Unfollow" on hover)
- Loading spinner while processing follow/unfollow
- Redirects to login if not authenticated when trying to follow
- Created FollowersModal component for viewing followers/following lists
- Clicking "X Followers" or "Y Following" opens modal with user list
- Each user shows avatar, display name, username, and follow button
- Can follow/unfollow users directly from the modal
- Empty states for no followers/not following anyone

**Activity Feed:**
- Created ActivityFeed.tsx component for dashboard
- Fetches recent game_logs from users the current user follows
- Shows "[username] [status] [game]" format with optional rating
- Relative timestamps (e.g., "5m ago", "2h ago", "3d ago")
- User avatar links to profile, game name links to game page
- Game cover thumbnail on the right side
- Empty state for "not following anyone" with prompt to follow users
- Empty state for "no recent activity" when following but no activity

**Played Status:**
- Added "Played" status option (for games you've played but not necessarily completed)
- Status order: Playing, Completed, Played, Want to Play, On Hold, Dropped
- Updated LogGameModal with "Played" button (🕹️ icon)
- Updated profile page filter tabs to include "Played"
- Updated ActivityFeed to show "played" status text

**User Search:**
- Created `/api/users/search` API route (GET with ?q= parameter)
- Searches profiles by username and display_name (case-insensitive, partial match)
- Excludes current user from results, limits to 10
- Updated Navbar search to query both games and users in parallel
- Search dropdown now shows "Users" section above "Games" section
- Clicking a user navigates to their profile page
- Updated search placeholder to "Search games or users..."

**Login with Username:**
- Created `/api/auth/lookup-email` API route (POST with { username })
- Uses database function `get_email_by_username` to securely get email from username
- Updated login page to accept email or username
- If input contains "@", treated as email (direct auth)
- If no "@", treated as username (lookup email first, then auth)
- Error messages: "Username not found" or "Invalid login credentials"

### Session 4 (Dec 18, 2024)
**Vercel Deployment:**
- Fixed TypeScript compilation errors for Vercel deployment
- Added `as unknown as Type[]` casts for Supabase query results
- Added explicit type annotations for callback parameters
- Fixed GameLog interface `id` property to be optional
- Added `played` status to STATUS_LABELS in GameLogButton
- Fixed cachedToken return type in igdb.ts
- Made GitHub repository public for Vercel deployment

**Enhanced PWA Setup:**
- Updated `site.webmanifest` with complete PWA config (start_url: /dashboard)
- Generated PNG icons (icon-192.png, icon-512.png) from SVG using rsvg-convert
- Created service worker (`/public/sw.js`) with caching strategies:
  - Cache-first for static assets (images, CSS, JS)
  - Network-first for API calls and HTML pages
  - Offline fallback support
- Created ServiceWorkerRegister component (registers SW in production only)
- Created InstallPrompt component with dismissable install banner:
  - Detects `beforeinstallprompt` event for Chrome/Edge
  - Shows iOS-specific instructions (tap Share > Add to Home Screen)
  - Appears on mobile devices or after 2+ visits
  - Stores dismissal in localStorage
  - Detects if already running as standalone app
- Added ServiceWorkerRegister and InstallPrompt to root layout

**New Files:**
- `/public/sw.js` - Service worker for offline caching
- `/public/icon-192.png` - PWA icon (192x192)
- `/public/icon-512.png` - PWA icon (512x512)
- `/src/components/ServiceWorkerRegister.tsx` - SW registration component
- `/src/components/InstallPrompt.tsx` - PWA install prompt with iOS support

**Mobile Search Fix:**
- Created MobileSearchOverlay component for full-screen mobile search
- On mobile (< 768px), tapping search icon opens full-screen overlay
- Overlay features:
  - Auto-focused search input at top
  - Close button (X) in top right
  - Full-screen scrollable results with live autocomplete
  - "Users" and "Games" sections with sticky headers
  - Large touch targets (min 64px height per result)
  - Closes on escape, back button, or selecting a result
- Desktop keeps existing dropdown behavior unchanged
- Prevents body scroll when overlay is open
- Uses React Portal (createPortal) to render outside navbar DOM
- Updated /search page to show both users and games

### Session 5 (Dec 19, 2024)
**Landing Page Hero Background:**
- Added cinematic hero background image (`/public/hero-bg.jpg`)
- Dual gradient overlays for text readability (left-to-right and bottom-to-top)
- Mobile responsive with `object-[30%_center]` positioning
- Text shadows and glassmorphism login button
- Fixed mobile button centering with `items-center`

**Dual XP and Level System:**
- Created `/src/lib/xp.ts` with XP calculation functions:
  - Gamer XP: completed=100, played=50, playing/on_hold=25, dropped=10, want_to_play=0
  - Social XP: review=30, rating=5, follower=10 each
  - 11 levels (0-10) with rank names for each type
- Created `/src/components/LevelBadge.tsx` - Colored badges showing level & rank
- Created `/src/components/XPProgressBar.tsx` - Progress bar with XP counter
- Added "Ranks" section to profile page (above Favorite Games)

**Gamer Ranks (Level 0-10):**
Rookie → Beginner → Casual → Gamer → Dedicated → Hardcore → Veteran → Elite → Master → Legend → Mythic

**Social Ranks (Level 0-10):**
Lurker → Newcomer → Contributor → Reviewer → Critic → Voice → Influencer → Tastemaker → Authority → Icon → Legend

**Gamer XP Thresholds:**
[0, 100, 500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000]

**Social XP Thresholds:**
[0, 50, 200, 500, 1000, 2000, 3500, 5500, 8000, 12000, 15000]

**XP Toast Notifications:**
- Shows "+X Gamer XP" and "+X Social XP" after saving a game log
- Shows level up toast when user reaches new level
- Calculates XP diff between before/after save
- Uses Sonner toast library

**UI Tweaks:**
- Rank labels use gray text (not accent color)
- Both progress bars use app accent green color
- Favorite Games heart icon is outline/hollow (not filled)
- Ranks section moved above Favorite Games

**New Files:**
- `/public/hero-bg.jpg` - Landing page hero background
- `/src/lib/xp.ts` - XP calculation system
- `/src/components/LevelBadge.tsx` - Level badge component
- `/src/components/XPProgressBar.tsx` - XP progress bar component

### Session 6 (Dec 23, 2024)
**Monorepo Restructure:**
- Restructured repo to monorepo with `/web` and `/mobile` folders
- Moved all Next.js files into `/web` folder
- Created `/mobile` folder for React Native/Expo app
- Removed `vercel.json` (using Vercel dashboard settings for root directory)
- Updated `README.md` with monorepo structure and getting started guide
- Updated `CLAUDE.md` with new project structure

**Mobile App Setup (Expo/React Native):**
- Initialized Expo project with TypeScript template
- Created folder structure: `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/contexts`, `src/constants`, `src/types`
- Installed dependencies: `@supabase/supabase-js`, `expo-secure-store`, `react-native-url-polyfill`

**Mobile Auth & Supabase:**
- Created `src/lib/supabase.ts` with Supabase client using `expo-secure-store` for secure token storage
- Created `src/contexts/AuthContext.tsx` with full auth flow:
  - `signIn(email, password)`, `signUp(email, password, username, displayName)`, `signOut()`
  - Session persistence and `onAuthStateChange` listener
  - Profile fetching and `refreshProfile()` method
  - Loading state for initial session check
- Added `.env` with Supabase credentials

**Mobile Shared Code:**
- Created `src/constants/colors.ts` with theme colors:
  - `background: '#0f0f0f'`, `surface: '#1a1a1a'`, `surfaceLight: '#2a2a2a'`
  - `accent: '#22c55e'`, `accentDark: '#16a34a'`
  - `text: '#ffffff'`, `textMuted: '#9ca3af'`, `textDim: '#6b7280'`
- Created `src/constants/index.ts` with status labels, platforms, IGDB image helpers
- Created `src/types/index.ts` with shared types: `Game`, `Profile`, `GameLog`, `GameStatus`, `LevelInfo`, etc.
- Copied `src/lib/xp.ts` from web app (XP/Level calculation - pure functions)
- Created `src/hooks/useSupabase.ts` with data fetching hooks:
  - `useGameLogs(userId)`, `useProfile(username)`, `useFollowCounts(userId)`, `useGameSearch(query)`

**Mobile App Entry:**
- Updated `App.tsx` with AuthProvider wrapper
- Shows "Sweaty Mobile" centered on black background (#0f0f0f)
- Displays loading spinner during auth check
- Shows welcome message when signed in

**New Mobile Files:**
- `mobile/src/lib/supabase.ts` - Supabase client with SecureStore
- `mobile/src/contexts/AuthContext.tsx` - Auth state management
- `mobile/src/constants/colors.ts` - Theme colors
- `mobile/src/constants/index.ts` - Status labels, platforms
- `mobile/src/types/index.ts` - Shared TypeScript types
- `mobile/src/lib/xp.ts` - XP/Level system
- `mobile/src/hooks/useSupabase.ts` - Data fetching hooks
- `mobile/.env` - Supabase credentials (gitignored)
- `mobile/.env.example` - Environment template

### Session 7 (Dec 25, 2024)
**Profile Page Enhancements:**
- Added "Recently Logged" section (horizontal scroll, after Favorites, before Library)
- Renamed "Game Library" to "Library"
- Sorted Library "All" tab by rating (highest to lowest, unrated games last)
- Added review support to Activity tab (shows "reviewed" action)
- Made Recently Logged posters same size as Library posters (105px width)

**Search Page UI Redesign:**
- Moved from green buttons/pills to gray minimal aesthetic
- Capitalized text throughout (Browse Games, Clear All, filter titles)
- Changed active filter pills to gray with border
- Changed count badges to gray
- Changed View Results button to gray
- Only green checkmarks remain as accent color

**Curated Lists Feature (Major):**
- Replaced old "Browse By" filter system (Genre/Year/Platform) with curated discovery rows
- Created `curated_lists` table in Supabase (see Database Schema section)
- Each list shows horizontal scroll of game covers with "See All" link
- 10 curated lists with 800+ total games across all categories

**New Components:**
- `CuratedListRow.tsx` - Horizontal scroll game row with title + "See All"
- `CuratedListDetailScreen.tsx` - Full grid view for "See All" functionality

**New Hooks:**
- `useCuratedLists()` - Fetches curated lists with game data from Supabase

**Removed Files:**
- `FilterModal.tsx` - Old genre/year/platform filter modal
- `FilterResultsScreen.tsx` - Old filter results screen

**New Types:**
- `CuratedList` - Base curated list type
- `CuratedListWithGames` - Curated list with populated game data

**Population Script:**
- Created `scripts/populate-curated-lists.js`
- Contains all 800+ games across 10 lists
- Calls search API to cache games to `games_cache`
- Outputs SQL UPDATE statements for Supabase
- Run with: `API_URL=https://sweaty-v1.vercel.app node scripts/populate-curated-lists.js`

**Navigation Updates:**
- Replaced `FilterResults` screen with `CuratedListDetail`
- Updated `MainStackParamList` with new route params

**New Files:**
- `scripts/populate-curated-lists.js` - Curated lists population script
- `database/curated_lists.sql` - SQL schema for curated_lists table
- `mobile/src/components/CuratedListRow.tsx` - Curated list row component
- `mobile/src/screens/CuratedListDetailScreen.tsx` - See All screen

## Deployment & Configuration

### Vercel
- **URL:** https://sweaty-v1.vercel.app
- **Project:** sweaty-v1
- **Root Directory:** `/web` (set in Vercel dashboard)
- **Branch:** Deploys from `main`

### GitHub
- **Repo:** https://github.com/Abdulla-AlBassam/sweaty
- **Main Branch:** `main`
- **Working Branch:** `claude/ui-polish-no-animations-qg346` (current development)

### Environment Variables
**Web (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
```

**Mobile (.env):**
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://sweaty-v1.vercel.app
```

### Running the Mobile App
```bash
cd mobile
npm install
npx expo start
```

### Populating Curated Lists
1. Run the SQL schema in Supabase SQL Editor (from `database/curated_lists.sql`)
2. Run the population script:
   ```bash
   cd /path/to/sweaty
   API_URL=https://sweaty-v1.vercel.app node scripts/populate-curated-lists.js
   ```
3. Copy the SQL UPDATE statements from output
4. Paste and run in Supabase SQL Editor

## Known Issues & Notes

- **Branch `claude/review-project-setup-qg346`** had rendering issues - use `claude/ui-polish-no-animations-qg346` instead
- **Curated lists** require games to exist in `games_cache` first - the population script handles this
- **IGDB rate limiting** - the population script includes 200ms delays between requests
- **Some games may not be found** if they have different names in IGDB or don't exist yet

### Session 8 (Dec 25, 2024)
**Curated Lists Bug Fixes:**
- Fixed duplicate key React errors in CuratedListRow and CuratedListDetailScreen
  - Changed key from `game.id` to `${game.id}-${index}` (some lists had duplicate game IDs)
- Fixed game cover images not loading
  - Changed `'cover_big'` to `'coverBig'` (camelCase to match IGDB_IMAGE_SIZES constant)

**Admin API for Bulk Caching:**
- Created `/api/admin/cache-curated-games/route.ts` endpoint
- Fetches all game IDs from curated_lists table
- Batch fetches missing games from IGDB API
- Inserts games into games_cache table
- Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable (bypasses RLS)
- Successfully cached 368 games for curated lists

**Swapped Discovery Lists Between Screens:**
- Moved 10 curated lists FROM SearchScreen TO DashboardScreen (Home)
- Moved 3 dynamic lists FROM DashboardScreen TO SearchScreen:
  - Trending Right Now (from IGDB popular-games API)
  - Popular in Community (top-rated games in games_cache)
  - What Your Friends Are Playing (from useFriendsPlaying hook)
- Added pull-to-refresh on SearchScreen for discovery lists
- DashboardScreen now shows: Welcome → Currently Playing → Curated Lists
- SearchScreen now shows: Search → Recent Searches → Discover (3 dynamic lists)

**UI Polish - Currently Playing Section:**
- Added animated pulsing green dot after "Currently Playing" title
  - Uses `Animated.loop` with opacity animation (0.4 to 1.0, 800ms)
  - Small 8px green circle using app accent color
- Fixed text alignment to match CuratedListRow styling:
  - Section header uses `paddingHorizontal: Spacing.lg`
  - Title uses `FontSize.lg` (18px)
  - Margin bottom uses `Spacing.md` (16px)
- Updated game card sizes to 105x140 (matching curated lists)
- Updated gap spacing to `Spacing.sm` (8px, matching curated lists)

**Files Modified:**
- `mobile/src/screens/DashboardScreen.tsx` - Curated lists + pulsing animation
- `mobile/src/screens/SearchScreen.tsx` - Dynamic discovery lists
- `mobile/src/components/CuratedListRow.tsx` - Fixed keys and image URLs
- `mobile/src/screens/CuratedListDetailScreen.tsx` - Fixed keys and image URLs

**New Files:**
- `web/src/app/api/admin/cache-curated-games/route.ts` - Admin bulk cache endpoint

**New Environment Variables:**
- `SUPABASE_SERVICE_ROLE_KEY` - Required for admin API (add to Vercel)

### Session 9 (Dec 26, 2024)
**Google Sign-In Implementation:**
- Added Google OAuth button to LoginScreen with Google logo
- Implemented `signInWithGoogle()` in AuthContext
- Uses React Native `Linking.openURL()` for OAuth flow
- Disabled in Expo Go (shows friendly error message)
- Will work in production builds with `sweaty://auth/callback` scheme
- Deep link handler catches OAuth callback tokens
- Removed expo-web-browser and expo-auth-session (require native modules)

**Bottom Tab Bar Icon Updates:**
- Updated AnimatedTabBar to support multiple icon libraries
- Home: Feather `home` icon
- Search: FontAwesome5 `search` icon
- Activity: Feather `activity` icon
- Add: Ionicons `add` (reduced button size from 48x48 to 38x38)
- Profile: Ionicons `person` icon
- Created `renderIcon()` helper for multi-library support

**Streak Tracking Feature:**
- Created `useStreak` hook (`src/hooks/useStreak.ts`):
  - `recordActivity()` - Updates streak on any app activity
  - Checks if > 24 hours since last activity → resets streak
  - Same day activity → no change
  - Different day within 24 hours → increment streak
  - Updates `longest_streak` if current exceeds it
  - Shows toast notification on streak changes
- Created `StreakBadge` component (`src/components/StreakBadge.tsx`):
  - AntDesign `fire` icon in orange (#FF8C00)
  - Displays streak count next to icon
  - Supports small/medium/large sizes
- Added streak display to ProfileScreen and UserProfileScreen (next to username)
- Integrated `recordActivity()` into LogGameModal after game saves
- Added streak fields to Profile type: `current_streak`, `longest_streak`, `last_activity_at`

**SQL Required for Streaks:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
```

**Premium Badge Variants:**
- Updated PremiumBadge component to support variants:
  - `premium` (default): Gold gradient (#FFD700 → #FFA500 → #FF8C00), dark text, "PREMIUM" label
  - `developer`: Green gradient (#22c55e → #16a34a → #15803d), white text, "DEVELOPER" label
- Developer badge shows only for username 'abdulla'
- Other premium users see gold Premium badge
- Dynamic shadow color based on variant

**Files Created:**
- `mobile/src/hooks/useStreak.ts` - Streak tracking hook
- `mobile/src/components/StreakBadge.tsx` - Streak display component

**Files Modified:**
- `mobile/src/components/AnimatedTabBar.tsx` - Multi-library icon support, smaller add button
- `mobile/src/components/PremiumBadge.tsx` - Variant support (premium/developer)
- `mobile/src/components/LogGameModal.tsx` - Added useStreak integration
- `mobile/src/contexts/AuthContext.tsx` - Google OAuth (disabled in Expo Go)
- `mobile/src/screens/ProfileScreen.tsx` - Added StreakBadge, badge variant logic
- `mobile/src/screens/UserProfileScreen.tsx` - Added StreakBadge, badge variant logic
- `mobile/src/types/index.ts` - Added streak fields to Profile
- `mobile/src/hooks/index.ts` - Export useStreak
- `mobile/package.json` - Removed expo-web-browser, expo-auth-session, expo-linking

## Upcoming Features (Backlog)

Ideas ranked by implementation difficulty:

**Easy:**
1. Review pinning to profile (2-3 pinned reviews)
2. Markdown formatting in reviews

**Medium:**
3. Platform/subscription tracking (Steam, Xbox, PlayStation, Game Pass)
4. Statistics page with genre/platform breakdowns
5. Favorite character voting per game

**High:**
6. Custom covers from IGDB alternatives
7. Ranked and unranked custom lists with entry notes
8. Play journal with calendar view

**Very High:**
9. Chapter/DLC progress tracking
10. "Where to play" availability display (external API integrations)
11. Personalized game recommendations engine
