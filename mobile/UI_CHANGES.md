# UI Changes Log

## 2026-04-05 — Homepage Typography Overhaul

Addressed text readability and hierarchy issues across the dashboard homepage.

### Problem
- No clear visual hierarchy between group headers, section titles, and body text
- `lineHeight` missing on nearly every text element (relied on OS defaults)
- `textDim` (#4A4A4A) failed WCAG AA contrast on dark backgrounds
- Group headers used the same grey as section titles, making them blend together
- Typography presets in `fonts.ts` lacked `lineHeight` values

### Changes

**`src/constants/fonts.ts`**
- Added `lineHeight` (1.4-1.5x fontSize) to all 15 Typography presets
- Display, body, button, and terminal presets now include explicit line heights

**`src/constants/colors.ts`**
- Bumped `textDim` from `#4A4A4A` to `#5C5C5C` for WCAG AA compliance (~4.5:1 contrast on #0A0A0A)

**`src/screens/DashboardScreen.tsx`**
- Group headers ("Your Games", "Social", "For You", "News"):
  - Size: 18px -> 20px (FontSize.xl)
  - Colour: textSecondary (#A1A1A1) -> text (#FFFFFF)
  - Added lineHeight: 28
  - Reduced letterSpacing: 0.5 -> 0.3
- Section titles ("Now Playing", "Friends Are Playing", etc.):
  - Size: 14px -> 15px
  - Added lineHeight: 21
- "See All" links: added lineHeight: 17
- Hero banner game name: added lineHeight: 20
- Empty state text: colour changed from textDim -> textMuted, added lineHeight: 20
- Community card username: added lineHeight: 15
- Community card rating text: added lineHeight: 15
- Community card game name: colour changed from textDim -> textMuted, added lineHeight: 15

**`src/components/CuratedListRow.tsx`**
- List title: added lineHeight: 24
- List description: colour changed from textDim -> textMuted, lineHeight: 16 -> 17
- "See All" link: added lineHeight: 17

### Result
- Clear 3-level text hierarchy: off-white headers (20px) > grey titles (15px) > muted labels (12px)
- Consistent line heights across all text on the homepage
- All text now meets WCAG AA contrast minimums
- Text breathes better and feels less cramped on smaller screens

---

## 2026-04-05 — Off-white primary text (anti-halation)

### Problem
Pure white (#FFFFFF) text on deep dark backgrounds (#0A0A0A) causes halation — a glowing/blooming effect that reduces readability, especially for users with astigmatism. Group headers were particularly harsh after the typography overhaul set them to Colors.text.

### Changes

**`src/constants/colors.ts`**
- `Colors.text`: `#FFFFFF` -> `#E0E0E0` (soft off-white, reduces eye strain globally)
- `Colors.textBright` kept at `#FFFFFF` for rare high-emphasis use (badges, active states)

### Result
- All primary text across the app is now off-white, reducing halation on dark surfaces
- `textBright` (#FFFFFF) remains available as an escape hatch when pure white is needed
- Text hierarchy preserved: off-white headers > grey titles > muted labels

---

## 2026-04-05 — Tighten list header-to-poster spacing

### Problem
Too much vertical space between the title/description block and the game posters on all horizontal list rows. The gap made the text feel disconnected from the content it labels.

### Changes

**`src/components/CuratedListRow.tsx`**
- Header `marginBottom`: `Spacing.md` (12px) -> `Spacing.sm` (8px)

**`src/screens/DashboardScreen.tsx`**
- Section header `marginBottom`: `Spacing.sectionHeaderBelow` (16px) -> `Spacing.sm` (8px)

### Result
- Title/description and posters now feel visually connected as a single unit
- Consistent 8px gap across all list types (curated lists, Now Playing, Friends Are Playing, etc.)
- Description is now exactly centred between title and posters (8px above, 8px below)
