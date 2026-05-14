# Liquid Glass UI

The iOS 26 redesign lives in this folder. Everything new uses these primitives.

## How the material works

`<GlassSurface>` renders a native iOS view backed by `UIGlassEffect` on iOS 26+ (the real Liquid Glass material) and falls back to `UIBlurEffect(.systemMaterialDark)` on anything older. The native module lives at `mobile/modules/glass-surface-native/`.

The JS-side `BlurView` from `expo-blur` is no longer used. Component API is unchanged: pass `intensity`, `role`, `radius`, and `bordered` to `<GlassSurface>` exactly as before.

## What's migrated

- Tab bar (`AnimatedTabBar`) — floating glass pill
- Quick Log modal, Log Game modal (+ both sub-pickers), Discover Filter, Library Filter, Edit Favourites
- Search bar on the Search screen
- Curated / Community segmented toggle on the Search screen
- Games / Users / Lists filter pills on the Search screen
- Discover funnel button (glass circle)
- Friends / You / All / Reviews / Logs filter pills on the Activity screen
- Settings gear on the Profile screen
- Favourites edit pencil on the Profile screen
- Empty-state "Find people to follow" CTAs on the Dashboard
- Glass Playground screen (Settings → Developer Tools)

## Primitives

- `<GlassSurface>` — generic glass container with optional border. Use for sheets, plates, cards over imagery.
- `<GlassCapsule>` — pill / capsule. Wraps `GlassSurface` with capsule radius.
- `<GlassSheet>` — bottom-sheet preset with padding and top radii.

All primitives accept `intensity` (`soft` / `medium` / `heavy`) and `role` (`chrome` / `sheet` / `capsule` / `overContent`).

## Tokens

Every tint, stroke, radius and vibrancy colour lives in `tokens.ts`. Edit there to change every glass surface at once. The native module reads the tint colour via the `tintColor` prop on each render.

## Remaining work

### Modals still to migrate (same pattern as the others)

- `AddToListModal`
- `CreateListModal`
- `FollowersModal`
- `ReviewEditorModal`

### Screen-level work

- Dashboard hero carousel overlays — text/CTAs over hero artwork as glass chips.
- Game Detail sticky header — back button + title as a glass capsule on scroll.
- Profile header plate — avatar + name + badges + stats grid as one floating glass plate over the banner. Bigger lift.
- Supporters / Streak / Rank segmented control on `CommunitySpotlightScreen`.

### Phase 2: content scrolls behind the tab bar

Today the tab bar still reserves its flex height so screens lay out unchanged. To get the iconic iOS 26 effect where cover art scrolls under the floating pill:

1. Switch the outer container in `AnimatedTabBar.tsx` to `position: 'absolute'` with `bottom: 0`.
2. Each screen with a `ScrollView` or `FlatList` reads `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs` and adds it to `contentContainerStyle.paddingBottom`.

## Native module structure

```
mobile/modules/glass-surface-native/
├── expo-module.config.json
├── package.json
├── ios/
│   ├── GlassSurfaceNative.podspec
│   ├── GlassSurfaceNativeModule.swift   # Expo module definition + props
│   └── GlassSurfaceNativeView.swift     # UIVisualEffectView with UIGlassEffect
└── src/
    └── index.ts                          # TS bindings via requireNativeView
```

Touching the Swift requires a fresh EAS dev build:

```bash
cd mobile
eas build --profile development --platform ios
```

## Playground

`src/screens/GlassPlaygroundScreen.tsx` is reachable from Settings → Developer Tools → Glass Playground. Iterate on the primitives there over a real cover-art background before wiring them into product screens.
