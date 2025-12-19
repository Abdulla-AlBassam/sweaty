# Sweaty

A video game tracking app — like Letterboxd, but for games. Track what you're playing, rate games, write reviews, and share your gaming journey.

## Tech Stack

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

## Database Schema

### profiles
Extends Supabase auth.users with app-specific data.
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, references auth.users |
| username | text | Unique username |
| display_name | text | Display name |
| avatar_url | text | Profile picture URL |
| bio | text | User bio |
| favorite_games | bigint[] | Array of up to 3 favorite game IDs |
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

## Important Files

```
sweaty/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── games/
│   │   │   │   ├── search/route.ts  # GET /api/games/search?q=zelda
│   │   │   │   └── [id]/route.ts    # GET /api/games/123
│   │   │   ├── users/
│   │   │   │   └── search/route.ts  # GET /api/users/search?q=john
│   │   │   └── auth/
│   │   │       └── lookup-email/route.ts  # POST - get email from username
│   │   ├── dashboard/page.tsx       # Protected dashboard with stats
│   │   ├── game/[id]/page.tsx       # Game detail page (dynamic meta)
│   │   ├── login/page.tsx           # Login form
│   │   ├── profile/[username]/
│   │   │   ├── layout.tsx           # Profile layout (dynamic meta)
│   │   │   └── page.tsx             # User profile with game library
│   │   ├── search/page.tsx          # Search results grid
│   │   ├── settings/page.tsx        # User settings (profile, password)
│   │   ├── signup/page.tsx          # Signup form
│   │   ├── error.tsx                # Custom 500 error page
│   │   ├── not-found.tsx            # Custom 404 page
│   │   ├── globals.css              # Global styles + CSS variables
│   │   ├── layout.tsx               # Root layout with Navbar + Toaster
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   ├── ActivityFeed.tsx         # Activity feed showing followed users' game logs
│   │   ├── EditFavoritesModal.tsx   # Modal for editing favorite games
│   │   ├── FollowersModal.tsx       # Modal for followers/following lists
│   │   ├── GameCard.tsx             # Reusable game card with cover
│   │   ├── GameLogButton.tsx        # Log game button with auth handling
│   │   ├── GameRatings.tsx          # Aggregated community ratings display
│   │   ├── GameReviews.tsx          # Reviews display for game detail page
│   │   ├── LogGameModal.tsx         # Modal for logging games (mobile-optimized)
│   │   ├── Navbar.tsx               # Navigation with search dropdown
│   │   ├── ServiceWorkerRegister.tsx # PWA service worker registration
│   │   ├── InstallPrompt.tsx        # PWA install prompt (iOS + Chrome)
│   │   └── MobileSearchOverlay.tsx  # Full-screen mobile search
│   ├── lib/
│   │   ├── igdb.ts                  # IGDB API helper
│   │   └── supabase/
│   │       ├── client.ts            # Browser Supabase client
│   │       └── server.ts            # Server Supabase client
│   └── middleware.ts                # Auth session refresh
├── public/
│   ├── icon.svg                     # Favicon (green S on dark bg)
│   ├── icon-192.png                 # PWA icon 192x192
│   ├── icon-512.png                 # PWA icon 512x512
│   ├── og-image.svg                 # Open Graph image
│   ├── sw.js                        # Service worker for offline caching
│   └── site.webmanifest             # PWA manifest
├── .env.local                       # Environment variables (not in git)
├── next.config.ts                   # Next.js config (IGDB images)
├── tailwind.config.ts               # Tailwind configuration
└── claude.md                        # This file
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
  - Full-screen scrollable results
  - "Users" and "Games" sections with sticky headers
  - Large touch targets (min 64px height per result)
  - Closes on escape, back button, or selecting a result
- Desktop keeps existing dropdown behavior unchanged
- Prevents body scroll when overlay is open
