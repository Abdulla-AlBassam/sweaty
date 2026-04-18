# Sweaty — Ship-Ready Punch List

Forward-looking pre-launch backlog for the mobile app. The app is ~80% ready; this file tracks the remaining issues surfaced during live testing as a power user (and later, as a fresh user). Each card is a self-contained handoff: a downstream agent should be able to implement it with only the card + the paired screenshot.

> **Not in scope here:** Apple/Google sign-in integration, RevenueCat, onboarding flow polish. Those are tracked separately.
> **Sibling doc:** `UI-ENHANCEMENT.md` is the historical design-pass log (typography rules, completed screens). Keep it as reference.

---

## Priority legend

| Tag | Meaning | Must be done before |
| --- | --- | --- |
| **P0** | Blocker — broken core flow, crash, data corruption, trust-breaking visual bug | Ship day |
| **P1** | High — noticeable on first session; makes the app feel unfinished | Ship day |
| **P2** | Medium — polish/consistency gap; noticed on repeat sessions | First post-launch patch |
| **P3** | Low — micro-polish; nice to have | Future |

## How to hand off a card

1. Copy the card body (from `###` to the next `###` or `---`) into the agent's prompt.
2. Drag the paired screenshot(s) from `ship-ready-screenshots/` into the same message.
3. The card declares its files, symptom, root cause, proposed fix, and acceptance criteria so the agent can work without asking clarifying questions.

---

## Cross-cutting findings

Issues that affect multiple screens/components. Fix once, ships everywhere.

---

### [01] [P1] List rows: title/description/posters need proximity grouping

**Screens affected**
- `SearchScreen` (curated rows + community user lists)
- `DashboardScreen` (curated rows)

**Components / styles to edit**
- `mobile/src/components/CuratedListRow.tsx` (styles: `title`, `description`, `header`)
- `mobile/src/components/UserListRow.tsx` (styles: `title`, `description`, `header`)
- `mobile/src/screens/SearchScreen.tsx` (styles: `discoveryRowTitle`, `discoveryRowDescription`) — these drive the **Popular on Sweaty** and **Trending on IGDB** rows, which share the same pattern

**Symptom**
In every list row with a description (e.g. `PlayStation Exclusives` / "Best games only on PlayStation", `New Releases` / "Noteworthy releases from this year", `2025 Essentials` / "The must-play games of 2025", `Popular on Sweaty` / "Most-logged games in the Sweaty community.", `Trending on IGDB` / "What's popular across IGDB right now."), the visual gap between the **title → description** reads the same as the gap between the **description → posters row**. Because there's no proximity hierarchy, the header text (title + description + optional chevron) fails to group, and the description feels orphaned between two neighbours rather than bound to the title above it.

**Root cause (numbers measured)**
Current spacing on both `CuratedListRow` and `UserListRow`:
- Title `fontSize: 16`, `lineHeight: 24` → ~8px of descender space below the cap height.
- Description `marginTop: Spacing.xs` (4px), `lineHeight: 17`.
- Header container `marginBottom: Spacing.md` (12px).

Effective visible gaps:
- **Title → description**: ~8px descender + 4px margin ≈ **~12px**
- **Description → posters**: ~5px descender + 12px margin ≈ **~17px**

Ratio ~1.4×. Proximity grouping wants at least ~3× — the description-to-posters gap should be visibly the "section break," not a close sibling of the title-to-description gap.

**Proposed fix**

Apply identical edits across `CuratedListRow.tsx`, `UserListRow.tsx`, and the `discoveryRow*` styles in `SearchScreen.tsx`:

```ts
title: {
  fontFamily: Fonts.bodySemiBold,
  fontSize: FontSize.md,
  color: Colors.text,
  lineHeight: 20,              // was 24 — trims descender, binds description closer
},
description: {
  fontFamily: Fonts.body,
  fontSize: FontSize.xs,
  color: Colors.textMuted,
  marginTop: 2,                // was Spacing.xs (4) — tighter to title
  lineHeight: 17,
},
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',  // (CuratedListRow only; UserListRow already uses alignItems: 'center')
  alignItems: 'flex-start',         // (CuratedListRow only)
  paddingHorizontal: Spacing.screenPadding,
  marginBottom: Spacing.xl,    // was Spacing.md (12) — ~24px section break before posters
},
```

Target effective gaps after fix:
- **Title → description**: ~6–8px (feels bound)
- **Description → posters**: ~28–30px (feels like a section break)
- Ratio ~4×. Eye groups header as one unit.

**Notes / edge cases**
- `UserListRow` keeps a username chip + chevron in a right-cluster. Left-column tightening shouldn't affect the right cluster; verify the right cluster still vertically centres against the tightened title+description block (switch its `alignItems` to `flex-start` if centring looks off once the block height shrinks).
- The chevron in both rows should stay vertically centred against the **title line**, not the whole title+description block. If the chevron drifts low after the fix, anchor it to the title row explicitly.
- Don't touch the `CuratedListDetail` screen header or the list-detail list items — the fix is scoped to the *row preview* component only.
- `HorizontalGameList` on the Dashboard uses a different header style — do not apply the same numbers there unless the user flags it as part of the same issue.

**Acceptance criteria**
- [ ] On `SearchScreen`, every curated row (e.g. `New Releases`, `2025 Essentials`, `Coming Soon`) shows title + description as one visually bound header, clearly separated from the poster row below.
- [ ] Same on `DashboardScreen` curated rows.
- [ ] Same on `SearchScreen` community user list rows (`UserListRow`).
- [ ] Same on `SearchScreen` discovery rows — **Popular on Sweaty** and **Trending on IGDB** — both now render with descriptions.
- [ ] The chevron stays aligned to the title row, not drifting low.
- [ ] Rows *without* a description (if any) still render correctly with no layout regression (check by loading a curated list with `description: null`).
- [ ] No change to the poster card sizes (105×140) or inter-card gap (12px).

**Screenshots**

`PlayStation Exclusives` row (description "Best games only on PlayStation" sits mid-gap between title and covers):
![PS Exclusives curated row spacing](ship-ready-screenshots/01a-curated-row-spacing-ps-exclusives.png)

Search screen — stacked rows show the issue compounding across the feed:
![Search screen curated rows spacing](ship-ready-screenshots/01b-curated-row-spacing-search.png)

---

## Power-user findings

*Issues surfaced while testing as an account with loads of activity. Populated as I receive them.*

---

### [02] [P2] Discover: add filter bar (platform / genre / release era)

**Screen affected**
- `SearchScreen` — the Discover surface (browseMode `curated` + `community`)

**Files to edit / create**
- `mobile/src/screens/SearchScreen.tsx` — add filter pill row under DISCOVER header, apply filter to visible curated rows
- `mobile/src/components/DiscoverFilterModal.tsx` — **new** component, reuses the bottom-sheet visual pattern of `LibraryFilterModal.tsx` (Platform / Genre / Release pages, multi-select)
- `mobile/src/constants/discoverFilters.ts` — **new** constants file holding the maintainable catalogue of candidate filter values
- `mobile/src/hooks/useDiscoverFilters.ts` — **new** hook managing active filter state + exposing `matchesFilters(list)` + available-options derivation

**No backend changes required.** Filtering operates entirely client-side on the `curated_lists` data already in memory.

**Symptom / desired behaviour**
The Discover surface is currently one-size-fits-all. A user looking for "PlayStation" or "2025" games has no way to narrow the feed. Add a filter pill row directly under the DISCOVER header. Selecting a filter value hides curated rows that don't match, keeping curated identity intact. No grid, no IGDB browse endpoint, no retro-tagging.

**Filter semantics — the core mechanic**

A curated list **matches** a filter value when that value's keyword (case-insensitive, word-boundary regex) appears in either `list.title` or `list.description`. Example: filter value `2025` matches both `2025 Essentials` (title) and a hypothetical list whose description is `"best games from 2022 till 2025"`. Filter value `PlayStation` matches `PlayStation Exclusives`.

- **Multi-select within a facet** = OR. `Platform = [PlayStation, Xbox]` → keep any list whose title/description matches either.
- **Cross-facet** = AND. `Platform = [PlayStation]` + `Genre = [RPG]` → keep only lists matching both.
- Lists that don't match **any active filter** hide. Lists that match stay in their original position.
- When NO filters are active, all curated rows show (current behaviour).

**Available-options derivation**

Filter values are drawn from a hardcoded catalogue in `constants/discoverFilters.ts`:

```ts
export const DISCOVER_FILTERS = {
  platform: ['PlayStation', 'Xbox', 'Nintendo', 'Switch', 'PC'],
  genre: [
    'RPG', 'FPS', 'Horror', 'Indie', 'Racing', 'Sports',
    'Strategy', 'Fighting', 'Puzzle', 'Platformer', 'Shooter', 'Adventure',
  ],
  release: ['2025', '2024', '2023', '2022', '2020s', '2010s', '2000s', '90s', '80s', 'Retro'],
} as const
```

Before rendering the modal, scan all loaded curated lists' title + description and only expose values that match ≥1 list. Options with 0 matches are hidden. This keeps the filter honest — as the catalogue expands or curated lists grow, the UI adapts automatically without code changes.

**UI structure — match `CuratedListDetail`'s filter pattern exactly**

*Filter trigger — one button, not a pill row*
- Single icon button sitting **to the right of the DISCOVER header**, mirroring the `sortButton` on `CuratedListDetailScreen` (line 247–254: funnel-outline icon, 44×44 touch target, `Colors.text` tint).
- When **any** filter is active, show a small selection-count badge overlaid on the top-right corner of the button (e.g. a 16×16 circle with a small `cream` dot or a number). Subtle — the button itself stays the same visual weight.
- The button lives inside the sticky DISCOVER region, so it pins together with the header (card [03]).

*Filter modal — match `LibraryFilterModal` bottom-sheet presentation*
- Tap button → opens `DiscoverFilterModal`, styled like `LibraryFilterModal` (same overlay, same slide-in animation, same `surface` sheet bg, same corner radius).
- **Single page, three sections** stacked vertically: `Platform`, `Genre`, `Release` — each as a grouped section with a quiet uppercase header (matching the `BASE_SORT_GROUPS` pattern in `LibraryFilterModal`).
- Within each section: list of available options (those with ≥1 matching curated list). Each row is a tap-to-toggle multi-select with a `Colors.cream` checkmark on the right when selected.
- Sheet footer: `Reset` (clear all filters) on the left, `Apply` (confirm + close) on the right. Close-without-apply discards any un-applied changes.
- User's ask — paraphrased: _"the filter in the list section when I'm looking at a curated list — a menu with dropdown boxes; you can click and the options show."_ This single-sheet structured menu matches that mental model.

*Empty state*
When filters produce zero matching curated rows: show a single centred message where the curated rows would render — `"No lists match. Try loosening a filter."` with a `Clear all` text button below it.

**Popular on Sweaty + Trending on IGDB when filters are active**

**Hide both when any filter is active.** These are dynamic feeds that don't have list-level descriptions to match against; surfacing them in a filtered view would break the focused feel of the filter. When all filters are cleared, they return to their normal positions.

**Word-boundary matching — implementation note**

Use a case-insensitive word-boundary regex per filter value: `new RegExp(\`\\b${escapeRegex(value)}\\b\`, 'i')`. This prevents `PS` from matching `lapse` and `FPS` from matching `GPS`. For `2020s`, `90s`, etc., escape the digits and treat `s` as part of the word. For `Switch`, word-boundary on both sides matches `Nintendo Switch Hits` but not `switching strategies`. Escape regex metacharacters on each value to handle anything users add later.

**Acceptance criteria**
- [ ] Single funnel-outline icon button sits to the right of the DISCOVER header (matches `sortButton` on `CuratedListDetail`).
- [ ] When any filter is active, a small selection-count badge appears on the button.
- [ ] Tapping the button opens `DiscoverFilterModal`, styled as a bottom sheet matching `LibraryFilterModal`.
- [ ] Modal shows three sections (`Platform`, `Genre`, `Release`) on a single page, each as a grouped section with inline multi-select options.
- [ ] Only options matching ≥1 currently-loaded curated list are rendered inside each section.
- [ ] `Reset` footer clears all filters; `Apply` confirms and closes.
- [ ] Selecting one or more values hides curated rows that don't match; matching rows remain in place.
- [ ] Multi-select within a facet = OR; across facets = AND.
- [ ] **Popular on Sweaty + Trending on IGDB both hide when any filter is active**; return when all filters cleared.
- [ ] Empty state appears when no curated rows match; `Clear all` restores.
- [ ] Matching is case-insensitive word-boundary (`2025` matches `"2025 Essentials"` and `"best from 2022 till 2025"`; `Switch` matches `Nintendo Switch` but not `switching`).
- [ ] Filter state resets when the user leaves and re-enters the Search tab (don't persist to AsyncStorage).
- [ ] The filter button pins with the DISCOVER header (co-ordinated with card [03]).

**Screenshot**
![Discover surface — filter + sticky header targets](ship-ready-screenshots/02-discover-filter-sticky-header.png)

---

### [03] [P2] Sticky section headers (pilot on Search, roll out to Dashboard)

**Screens affected — pilot**
- `SearchScreen` — pin the DISCOVER header so it stays under the search bar as the user scrolls the browse feed.

**Screens affected — follow-up rollout (same pattern)**
- `DashboardScreen` — pin each group header (`FOR YOU`, `FRIENDS`, `COMMUNITY`, `VIDEOS`, `NEWS`) so each group's header stays until the next one arrives, then swaps.

**Files to edit**
- `mobile/src/screens/SearchScreen.tsx` (pilot — line ~968 `styles.discoverHeader`)
- `mobile/src/screens/DashboardScreen.tsx` (follow-up)

**Symptom / desired behaviour**
As the Discover feed scrolls, the `DISCOVER` label + its cream underline should pin below the search bar (it already floats pinned above the ScrollView) rather than scrolling away with the content. The Curated/Community toggle should **not** pin — only the label + its underline, so it feels like a persistent section context. On Dashboard, each group header sticks while its section is in view and swaps when the next group's header reaches the top.

**Implementation approach**
`Animated.ScrollView` (already used on SearchScreen at line 575) supports `stickyHeaderIndices` — this is the React Native-native path and avoids a reanimated rewrite.

Steps:
1. Restructure the ScrollView children so the DISCOVER header is a direct top-level child of the ScrollView (it already is, at line ~968). Note its index after render order.
2. Pass `stickyHeaderIndices={[<discover-header-index>]}` to the `Animated.ScrollView`.
3. Give `styles.discoverHeader` a solid `backgroundColor: Colors.background` so it doesn't go transparent over scrolling content when pinned.
4. Verify the cream underline stays attached when pinned (it's already a `borderBottom` on the same View, so it should travel with it).
5. Re-check the z-index vs. the floating search bar — the search bar's `Animated.View` is a sibling wrapper outside the ScrollView, so it stays on top. Visually the DISCOVER header should pin *below* the search bar's bottom edge, not overlap it.

For Dashboard rollout:
- Same pattern: pass an array of indices covering each group-header's position as a top-level ScrollView child.
- Each group header needs a solid background and consistent height so swaps feel intentional.
- If Dashboard's group headers are currently nested inside section wrappers, hoist them out so they sit as direct ScrollView children at predictable indices.

**Open questions**
1. ~~On Search, should the filter button (card [02]) also pin with the DISCOVER header, or scroll with content?~~ **Resolved — pin together.** DISCOVER header + filter button become one sticky region.
2. ~~On Dashboard, should the sticky header replace the existing group-header style, or sit above the section as a separate pinned bar?~~ **Resolved — the existing `SectionGroupHeader` itself becomes sticky.** Don't introduce a parallel pinned bar. This pairs cleanly with card [04] which gives each group header its own solid dark background, satisfying the solid-fill requirement for sticky pinning.

**Sticky region on Search = DISCOVER header + filter button (combined)**
The DISCOVER header row needs its funnel button appended as a sibling to its right. Both sit inside one wrapper View (solid `Colors.background` fill, preserves the cream underline). Pass that wrapper's index as the sole `stickyHeaderIndices` entry on the `Animated.ScrollView`.

**Cross-dependency with card [04]**
Card [04] makes every Dashboard group header its own direct child of the ScrollView with a solid dark bg. That's exactly the shape `stickyHeaderIndices` needs. Land [04] first, then [03]'s Dashboard rollout becomes a pure `stickyHeaderIndices` prop addition.

**Acceptance criteria — pilot (Search)**
- [ ] DISCOVER header + underline stays pinned below the search bar while scrolling the browse feed.
- [ ] Pinned header has a solid `Colors.background` fill (no content bleed through).
- [ ] No visible jank on fast scrolls or pull-to-refresh.
- [ ] When user scrolls back to top, the header un-pins into its natural position with no layout jump.

**Acceptance criteria — rollout (Dashboard)**
- [ ] `FOR YOU`, `FRIENDS`, `COMMUNITY`, `VIDEOS`, `NEWS` group headers each stick when their section is in view.
- [ ] Each header swaps cleanly when the next one reaches the top (no overlap, no gap).
- [ ] Header style is unchanged from current; only positioning behaviour changes.
- [ ] Works on both iOS and Android (verify on Expo Go / dev build).

**Screenshot**
![Search — DISCOVER header is the target](ship-ready-screenshots/02-discover-filter-sticky-header.png)

---

### [04] [P2] Dashboard: split each group's bg into dark header + light content

**Screen affected**
- `DashboardScreen`

**Files to edit**
- `mobile/src/screens/DashboardScreen.tsx`

**Symptom**
The Dashboard currently alternates the background of whole groups (FOR YOU dark → FRIENDS light → COMMUNITY half-and-half → WATCH light). The effect reads as unrelated colour blocks rather than a consistent rhythm of "header + content." User's preferred rhythm:

- **Every group's header** sits on `Colors.background` (dark).
- **Every group's content** sits on `Colors.alternate` (lighter).
- Same treatment across every group, no zebra alternation between groups.

This gives every group an identical shape — a dark banner carrying the group label, with a lighter panel of rows beneath — and pairs naturally with card [03]'s sticky headers (each sticky bar already has the solid dark fill it needs to pin cleanly over scrolling content).

**Current structure (lines 267, 323, 441, 483, 490)**
Each group is a single `sectionGroup` View with one `backgroundColor`. `SectionGroupHeader` (line 230) renders inside that wrapper and shares the group's bg.

```tsx
<View style={[styles.sectionGroup, { backgroundColor: Colors.background }]}>
  <SectionGroupHeader title="For You" />
  {/* content rows */}
</View>
```

The COMMUNITY group is currently split across **two** sequential `sectionGroup` wrappers (lines 441 and 483) to zebra Recent Reviews vs. Spotlight — the comment at line 438 acknowledges this is a deliberate zebra. Under the new model that split is no longer needed.

**Proposed fix**

1. Replace the single-wrapper pattern with a two-wrapper pattern per group:

```tsx
<View style={[styles.groupHeaderBar, { backgroundColor: Colors.background }]}>
  <SectionGroupHeader title="For You" onSeeAll={...} />
</View>
<View style={[styles.groupContent, { backgroundColor: Colors.alternate }]}>
  {/* Now Playing, Recently Logged, etc. — unchanged */}
</View>
```

2. Introduce two new styles alongside (or replacing) `sectionGroup`:

```ts
groupHeaderBar: {
  paddingTop: Spacing.md,
  // No paddingBottom — SectionGroupHeader brings its own cream underline + marginBottom
},
groupContent: {
  paddingTop: Spacing.md,
  paddingBottom: Spacing.lg,
},
```

3. Move the `paddingBottom: Spacing.md` currently on `groupHeader` (line 530) into the header bar wrapper if needed, or keep it on the Text row so the cream underline stays attached to the label. Key point: the cream underline must travel with the header wrapper, not the content.

4. **COMMUNITY group**: collapse the two sequential `sectionGroup` wrappers at lines 441 and 483 into a single group. The COMMUNITY header sits in its own dark bar; beneath it, one light content panel contains both `Recent Reviews` (line 445 section) and the `SpotlightPodium` (line 484) stacked. Remove the zebra-bg comment at line 438.

5. Apply the same header-dark / content-light split to `FOR YOU`, `FRIENDS`, and `VIDEOS & NEWS`.

6. Keep the `SectionGroupHeader` component's internal styles untouched — only its wrapper bg changes. The cream underline, uppercase display font, letterSpacing 1.5 are all staying.

**Interaction with card [03] (sticky headers)**
Once this lands, each group's `groupHeaderBar` is a direct child of the ScrollView with a solid dark bg — exactly the shape `stickyHeaderIndices` needs. Card [03]'s Dashboard rollout becomes a trivial prop addition: list the indices of all four `groupHeaderBar` Views.

**Edge cases**
- `SectionGroupHeader` renders an optional chevron when `onSeeAll` is passed (Videos & News uses it). That chevron must stay on the dark bar, not leak into the content panel.
- The `borderBottomColor: Colors.cream` underline on `groupHeader` (line 528) must travel with the dark bar — verify the line doesn't visually collide with the content panel's top edge (add a subtle `marginBottom: 0` on the header and let the content panel's top padding breathe).
- Pull-to-refresh and the refresh logo (line 259) render above FOR YOU — confirm the first dark bar still looks right directly below.

**Acceptance criteria**
- [ ] Every group (FOR YOU, FRIENDS, COMMUNITY, VIDEOS & NEWS) has its header on `Colors.background` and its content rows on `Colors.alternate`.
- [ ] No zebra alternation between groups — the visual rhythm is uniform: dark band, light panel, dark band, light panel.
- [ ] COMMUNITY's Recent Reviews and Spotlight Podium sit together on one light content panel under a single dark COMMUNITY bar.
- [ ] Cream underline stays with the group header, not the content panel.
- [ ] `SectionGroupHeader` chevron (when present) still renders correctly on the dark bar.
- [ ] No layout gap, colour seam, or content-bleed between the dark bar and the light panel that follows it.
- [ ] All group headers remain direct children of the root ScrollView (required for card [03]'s sticky rollout).

**Screenshot**
![Dashboard — current zebra pattern between whole groups](ship-ready-screenshots/04-dashboard-header-bg-split.png)

---

### [05] [P3] Community section titles: proper title case

**Screen / component affected**
- `DashboardScreen` (COMMUNITY group section titles)
- `SpotlightPodium` component

**Files to edit**
- `mobile/src/screens/DashboardScreen.tsx` — line 453: `"Recent reviews"` → `"Recent Reviews"`
- `mobile/src/components/SpotlightPodium.tsx` — line 175: `"Community spotlight"` → `"Community Spotlight"`

**Symptom**
Both section titles in the COMMUNITY group use sentence case (only first word capitalised) while every other section title on the Dashboard is proper title case (`Now Playing`, `Recently Logged`, `Playing Now`, `Their Favorites`, etc.). The inconsistency reads as a copy-edit miss, not an intentional style choice.

**Proposed fix**
Two string edits, no style/structure changes.

**Acceptance criteria**
- [ ] `DashboardScreen` COMMUNITY group renders `Recent Reviews` (capital `R`).
- [ ] `SpotlightPodium` renders `Community Spotlight` (capital `S`).
- [ ] No other screens using these strings regress (grep before editing — this copy may appear on `CommunityReviewsScreen` headers or accessibility labels).

**Screenshot**
Same as [04]. See `ship-ready-screenshots/04-dashboard-header-bg-split.png` — `Recent reviews` is visible lower-right of the image; `Community spotlight` is off-screen below but is part of the SpotlightPodium which sits directly beneath.

---

### [06] [P2] Profile: fold Lists into the Library menu, add UserListsScreen

**Screens / components affected**
- `ProfileScreen` (own profile)
- `UserProfileScreen` (other users' profiles)
- `UserListRow` — new optional props
- `UserListsScreen` — **new** screen
- `ListCard` — deleted once unused
- `navigation/index.tsx` — new `UserLists` route

**Symptom**
Both profile screens currently surface Lists as a dedicated section with a 2-up horizontal grid of `ListCard`s. This steals vertical space above the Library menu, doesn't scale when a user has 5+ lists, and creates two entry points for the same underlying data (Lists section vs. a list the user might look for via their library). The grid also duplicates the per-list artwork treatment that `UserListRow` already handles on Search (Community lists).

**Desired behaviour**
- Remove the Lists grid from `ProfileScreen` and `UserProfileScreen`.
- Add a third row to the LIBRARY menu (below `All Games` / `Reviews`): `Lists` with a count + chevron.
- Tapping it navigates to a new `UserLists` route (`{ userId }`) that stacks one list per row using `UserListRow`.
- `UserListRow` grows two new props:
  - `hideOwner={true}` — hides the avatar + `@username` right cluster (the chevron stays).
  - `maxGames={10}` — caps preview covers per row at 10.
  - When `list.description` is empty, the title sits flush against the poster row (reduce header bottom margin).
- The `+` action to create a new list moves from the old profile Lists section header to the new screen's header, **own-profile only**. On another user's profile, the header shows just the back button + `LISTS` title.
- Non-own profiles show only public lists (preserves current privacy behaviour). Own profile shows all lists (public and private).
- Delete `ListCard.tsx` once it has no remaining callers.

**Implementation notes**
- `useUserLists(userId, previewLimit = 3)` gained an optional `previewLimit`. The new screen passes `10` so each row can show up to ten covers.
- Library menu borders update dynamically: the last visible row drops its bottom border (whichever of All Games / Reviews / Lists ends the stack).
- `UserProfileScreen` keeps `useUserLists` purely to derive the public-list count for the Library row — no more `publicLists` rendering on the profile itself.
- `CreateListModal` now mounts inside `UserListsScreen` (gated to `isOwnProfile`); removed from `ProfileScreen`.

**Acceptance criteria**
- [ ] Neither profile screen shows the old Lists horizontal grid.
- [ ] LIBRARY menu on both profiles shows a `Lists` row (count + chevron) when the user has ≥1 public list (or ≥1 list total on own profile). No row when zero.
- [ ] Tapping the row opens `UserLists` for the correct user.
- [ ] `UserLists` header: back button (left), `LISTS` title (centre); `+` button (right) **only** on own profile.
- [ ] Each row is a `UserListRow` with no avatar/username chip and up to 10 covers.
- [ ] Rows without a description show the title flush against the posters (tighter header margin).
- [ ] `+` opens `CreateListModal`; creating a new list refreshes the screen.
- [ ] Empty state copy differs for own vs. other profile (`No lists yet` vs. `No public lists`).
- [ ] `ListCard.tsx` is deleted with no remaining importers.
- [ ] `LibraryRow` bottom border logic keeps a clean separator between adjacent rows and no hanging underline on the final row.

**Screenshot**
![Fold Lists into Library menu](ship-ready-screenshots/06-profile-lists-into-library.png)

---

## Fresh-user findings

*Issues surfaced on a brand-new account. Populated in the second testing pass.*

<!-- Cards go here, ordered by priority (P0 → P3). -->
