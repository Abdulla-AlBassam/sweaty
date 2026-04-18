# UI Enhancement Tracker

Ongoing design refinement across the Sweaty app. This file tracks progress, decisions, and what's left to do.

**Design principles:** See `.impeccable.md` and `CLAUDE.md` (Design Context section).

---

## Typography Rules (apply to all screens)

These rules were established during the homepage pass and must be applied consistently across every screen.

### Before (terminal/aggressive)
- Section titles: `Fonts.display`, uppercase, `letterSpacing: 2`
- Group headers: `Fonts.mono`, uppercase, `letterSpacing: 2`
- See All links: `Fonts.mono`, uppercase, `letterSpacing: 0.5`
- Small labels: `Fonts.mono`, uppercase, tiny sizes (9-10px)

### After (warm/quiet)
- **Group headers (Your Games, Social, For You, News):** `Fonts.bodySemiBold`, `FontSize.lg` (18px), `Colors.textSecondary`, no uppercase, `letterSpacing: 0.5` -- these are the biggest text on the page
- **Section titles (Now Playing, Friends Are Playing, etc.):** `Fonts.bodyMedium`, `FontSize.sm` (14px), `Colors.textSecondary`, no uppercase -- visually subordinate to group headers
- **See All links:** `Fonts.bodyMedium`, `FontSize.xs` (12px), `Colors.textMuted`, no uppercase
- **Small labels (usernames, game names in cards):** `Fonts.bodyMedium` or `Fonts.body`, 11px, no uppercase, no mono
- **Rationale:** Space Mono and BBH Bogle display font gave everything a loud terminal/cyberpunk feel. Geist (body font) is warmer and more inviting. Reserve display font for the logo only. Reserve mono for actual code/data if needed.
- **Hierarchy:** Group header (18px semibold) > Section title (14px medium) > See All (12px medium muted) > Card labels (11px)

---

## Screens

### Homepage (DashboardScreen)
**Status:** Complete
**File:** `mobile/src/screens/DashboardScreen.tsx`

#### Changes Made
1. **Hero banner height:** 360px -> 220px (less zoomed-in, more of the image visible)
2. **Hero game title:** White 28px display font uppercase -> Gray 14px body-medium, no uppercase (quiet label, not headline)
3. **Group headers (YOUR GAMES, SOCIAL, FOR YOU, NEWS):** Mono 12px uppercase ls:2 -> SemiBold 12px uppercase ls:1
4. **Section titles (Now Playing, Friends Are Playing, etc.):** Display 18px uppercase ls:2 -> SemiBold 16px, no uppercase
5. **See All links:** Mono 12px uppercase -> Medium 12px, textMuted, no uppercase
6. **Community Activity card text:** Mono 9-10px uppercase -> Body/Medium 11px, natural case
7. **For You title:** Display 18px uppercase -> SemiBold 16px, no uppercase
8. **Group headers font swap:** `Fonts.bodySemiBold` 20px -> `Fonts.display` 18px uppercase ls:1.5 (BBH Bogle for main section headers)

#### Also updated
- `CuratedListRow.tsx`: title and seeAll styles matched to new rules

#### Decisions
- Drop uppercase from section titles entirely - let content breathe
- Keep uppercase only on group headers (YOUR GAMES, SOCIAL) as subtle category labels
- Game title on hero banner should be understated - the screenshot is the star

---

### Activity Screen
**Status:** Complete
**Files:** `mobile/src/screens/ActivityScreen.tsx`, `mobile/src/components/ActivityItem.tsx`, `mobile/src/components/skeletons/ActivityItemSkeleton.tsx`

#### Layout (/arrange)
1. **Date-grouped feed:** Activities grouped into Today/Yesterday/This Week/Earlier sections
2. **Grouped card treatment:** Each date group wrapped in `surface` bg card with `borderRadius: 12`
3. **Date section labels:** Uppercase Geist-Medium 12px, textDim, letterSpacing 1.5 (quiet landmarks)
4. **Single-group label hidden:** When all activities fall into one bucket, the label is suppressed
5. **Unified pill navigation:** Friends/You tabs + All/Reviews/Logs pills now share identical pill style on one row
6. **Larger game covers:** 48x64 -> 56x75
7. **Review snippets inline:** Items with reviews show up to 3 lines of italic text with a small chatbubble icon
8. **Top-aligned items:** Changed from `alignItems: center` to `flex-start` for variable-height items
9. **`isLast` prop:** Suppresses bottom border on last item in each group card

#### Typography (/typeset)
1. **Explicit lineHeight everywhere:** All text styles now have lineHeight for cross-device consistency
2. **Dark-mode leading:** Body text bumped from 1.43x to 1.57x (14px -> lineHeight 22)
3. **Text hierarchy:** Username = `text` (#E0E0E0, SemiBold), game name = `textSecondary` (#A1A1A1, Medium), action = `textMuted`
4. **Date labels:** SemiBold -> Medium weight (quieter)
5. **Active pills:** Get SemiBold weight shift on activation
6. **Timestamp:** Added letterSpacing 0.3 for tiny-text legibility
7. **Star rating:** 12px -> 14px

#### Polish
1. **Pill padding:** Off-scale `Spacing.xs + 1` (5px) -> `Spacing.sm` (8px)
2. **Skeleton parity:** Avatar 40px, cover 56x75, overflow hidden, isLast border removal
3. **Unused import removed:** `STATUS_LABELS` from ActivityItem

---

### Search Screen
**Status:** Complete
**File:** `mobile/src/screens/SearchScreen.tsx`

#### Typography unification
1. **Removed GlitchHeader "DISCOVER"** entirely -- discovery rows are self-explanatory
2. **"Recent Searches" label:** Space Mono -> Geist-Medium 12px uppercase (quiet label)
3. **Search result section titles ("Games", "Users"):** BBH Bogle 14px uppercase -> Geist-SemiBold 16px normal case
4. **"Trending Right Now" / "Popular on Sweaty":** Already fixed to Geist-SemiBold 16px to match curated lists
5. **Avatar placeholder text:** Geist-Bold + accent -> Geist-SemiBold + text colour
6. **Filter pill text:** SemiBold for all -> Medium inactive / SemiBold active (matches activity page)
7. **GlitchHeader import removed**

#### AI entry point ("Ask Sweaty")
1. **Added "Ask Sweaty" label** below SweatDropIcon with animated text colour (textDim -> text shimmer)
2. **Label hidden after first AI use** -- reads `sweaty_ai_used` from AsyncStorage, shows only the icon for returning users
3. **Shimmer animation:** Text fades from dim to bright on a gentle 8-second loop

#### Spacing normalisation
1. `browseContent` top padding: 24px -> 16px
2. `section` top padding: 32px -> 24px
3. `discoverSection` margin: 32px -> 16px (no longer needs to clear removed header)
4. Removed orphaned `discoverHeader` style
5. `recentChip` borderRadius: hardcoded 20 -> `BorderRadius.full`
6. `filterPill` borderRadius: hardcoded 20 -> `BorderRadius.full`
7. `filterPillActive` borderColor: `textSecondary` -> `borderBright` (matches activity page)
8. `recentChipImage`: 28px -> 32px
9. Game grid: removed double-gap (`marginBottom: GAP` on items when container already uses `gap`)

---

### AI Recommend Screen (Sweaty AI)
**Status:** Complete
**File:** `mobile/src/screens/AIRecommendScreen.tsx`

#### Distill (major cleanup)
1. **Removed all RGB glitch effects:** Title layers (cyan/pink), prompt card border layers, input border layers
2. **Removed all animations:** Pulse on icon, glitch on title
3. **Removed MaterialCommunityIcons:** Prompt card icons (sword, clock, skull, etc.)
4. **Removed Space Mono:** Title, "TRY ASKING" label, loading text all switched to Geist
5. **Removed "SWEATY AI" title:** Header now shows just the SweatDropIcon centered
6. **Removed decorative elements:** Prompt chevrons, AI icon in assistant bubbles, "TRY ASKING" label

#### Quieter
1. **Welcome title:** BBH Bogle 24px all-caps -> Geist-SemiBold 20px sentence case, left-aligned
2. **User bubbles:** Green accent bg + dark text -> surfaceLight bg + light text
3. **Send button:** Green accent -> Colors.text (off-white)
4. **Loading text:** Space Mono -> Geist-Regular
5. **Error styling:** Pink-tinted bg -> neutral surface with subtle border

#### Layout (Claude-style)
1. **Empty state:** Logo (56px) centered vertically in page, text + prompts pushed to bottom near input
2. **Loading indicator:** Replaced bubble with animated SweatDropIcon (28px, pulse scale 1.0-1.15)
3. **First-visit prompts:** Example prompts only shown on first visit (AsyncStorage `sweaty_ai_used`)
4. **Returning users:** See just logo, welcome text, and input -- clean and focused

---

### Game Detail Screen
**Status:** Not started
**File:** `mobile/src/screens/GameDetailScreen.tsx`

---

### Profile Screen
**Status:** Not started
**File:** `mobile/src/screens/ProfileScreen.tsx`

---

### User Profile Screen
**Status:** Not started
**File:** `mobile/src/screens/UserProfileScreen.tsx`

---

### Settings Screen
**Status:** Not started
**File:** `mobile/src/screens/SettingsScreen.tsx`

---

### Login / Signup
**Status:** Not started
**Files:** `mobile/src/screens/LoginScreen.tsx`, `mobile/src/screens/SignupScreen.tsx`

---

## Components

### CuratedListRow
- Title: `Fonts.bodySemiBold`, `FontSize.md`, no uppercase (via GlitchText)
- See All: `Fonts.bodyMedium`, `FontSize.xs`, `Colors.textMuted`, no uppercase
- Description: body 12px, textMuted, `marginTop: Spacing.xs`
- **Spacing fixes:** `marginBottom: 10` (off-scale) -> `Spacing.md`; `marginTop: 6` -> `Spacing.xs`; `marginRight: Spacing.md` -> `Spacing.sm`

### ActivityItem
- **Text hierarchy:** username (SemiBold, text) > gameName (Medium, textSecondary) > action (Regular, textMuted)
- **Review snippets:** Italic Geist-Regular with chatbubble icon prefix
- **Covers:** 56x75 with `BorderRadius.sm`
- **`isLast` prop:** Suppresses bottom border

### ActivityItemSkeleton
- Matched to real item: 40px avatar, 56x75 cover, `isLast` border removal, `overflow: hidden`

---

## Global Changes

### Packages installed
- `@react-native-masked-view/masked-view` (for potential text effects)

### Consistency rules applied
- All pills (activity, search, filter) use same style: `surface` bg, `border` border, `BorderRadius.full`; active = `surfaceLight` bg, `borderBright` border, `bodySemiBold` + `text` colour
- All quiet section labels use: `Fonts.bodyMedium`, 12px, uppercase, letterSpacing 1.5, `textDim`
- All section titles use: `Fonts.bodySemiBold`, 16px, `text` colour, lineHeight 24
- lineHeight specified on every text style (dark-mode optimised at 1.5x+ for body text)
