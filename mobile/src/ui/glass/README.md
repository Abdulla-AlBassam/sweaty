# Liquid Glass UI

The iOS 26 redesign lives in this folder. Everything new uses these primitives. Old components on `main` are untouched until the cutover.

## What's already migrated

- Tab bar (`AnimatedTabBar`) — floating glass pill at the bottom of the screen
- Quick Log modal
- Log Game modal + its two sub-pickers (status / lists)
- Discover Filter modal
- Library Filter modal
- Edit Favourites modal
- Search bar on the Search screen
- Curated / Community segmented toggle on the Search screen
- Settings gear on the Profile screen
- Glass Playground screen (Settings → Developer Tools)

## Primitives

- `<GlassSurface>` — generic glass container with optional border. Use for sheets, plates, cards over imagery.
- `<GlassCapsule>` — pill / capsule. Use for search bars, segmented controls, status pills, floating buttons.
- `<GlassSheet>` — bottom-sheet preset with padding and top radii. Convenience over `GlassSurface`.

All primitives accept `intensity` (`soft` / `medium` / `heavy`) and `role` (`chrome` / `sheet` / `capsule` / `overContent`) so the tint matches the job.

## Tokens

Every blur amount, tint, stroke, radius and vibrancy colour lives in `tokens.ts`. Edit there to change the whole app at once.

## The pattern for converting a sheet modal

Every sheet conversion has been the same four edits. Apply this pattern to migrate the rest:

1. Add the import: `import { GlassSurface, GlassTokens } from '../ui/glass'`
2. Inside the modal's overlay/container Pressable, wrap the body in `<GlassSurface intensity="heavy" role="sheet" radius={GlassTokens.radius.sheet} style={styles.glassSheet}> ... </GlassSurface>`
3. Add the close tag at the matching point
4. In the StyleSheet, drop `backgroundColor: Colors.surface` and the two `borderTopLeft/RightRadius` lines from the modal's container style. Add a `glassSheet: { flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }` style.

## Remaining work

### Modals still to migrate (same pattern as above)

- `AddToListModal`
- `CreateListModal`
- `FollowersModal`
- `ReviewEditorModal`

### Screen-level work

- **Dashboard hero carousel overlays** — any text/CTA that sits on top of the hero artwork should be a glass chip rather than a flat dark card. The carousel itself is in `HeroBannerCarousel.tsx`.
- **Game Detail sticky header** — when scrolled past the cover art, the back button and game title should snap into a glass capsule. `GameDetailScreen.tsx`.
- **Profile header plate** — bigger lift: avatar + name + badges + stats grid as one floating glass plate over the banner. Currently the banner fades to flat dark and the stats sit on `Colors.background`. Re-layouts the section to put real glass over the banner imagery.
- **Friends / You / All / Reviews / Logs filters** on `ActivityScreen` — convert the segmented controls.
- **Supporters / Streak / Rank** segmented control on `CommunitySpotlightScreen`.
- **Premium banner, status badges, follow-count pills** on Profile — turn each into a `<GlassCapsule>`.

### Phase 2: content scrolls behind the tab bar

Today the tab bar still reserves its flex height so the existing screens lay out unchanged. To get the full iOS 26 effect where cover art and reviews scroll under the floating glass pill:

1. Switch the outer container in `AnimatedTabBar.tsx` to `position: 'absolute'` with `bottom: 0`.
2. Each screen with a `ScrollView` or `FlatList` reads `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs` and adds it to `contentContainerStyle.paddingBottom`.

Roughly five screens to touch (Dashboard, Search, Activity, Profile, plus a couple of detail screens).

## When you're ready for the real iOS 26 material

`expo-blur` is a close stand-in but it isn't the real Liquid Glass material. The iOS 26 system component is `UIGlassEffect` (UIKit) / `.glassEffect()` (SwiftUI). To swap it in:

1. Make sure `expo-build-properties` has bumped `ios.deploymentTarget` to `26.0` (already done in `app.config.js`).
2. From `/mobile`, run:
   ```bash
   npx create-expo-module --local glass-surface-native
   ```
   This scaffolds an Expo Module under `mobile/modules/glass-surface-native/` with iOS/Android/TS files.
3. In the generated iOS Swift module, replace the default view with a `UIVisualEffectView` configured with `UIGlassEffect`. The skeleton looks like:
   ```swift
   import ExpoModulesCore
   import UIKit

   class GlassSurfaceNativeView: ExpoView {
     private let effectView = UIVisualEffectView()

     required init(appContext: AppContext? = nil) {
       super.init(appContext: appContext)
       if #available(iOS 26.0, *) {
         effectView.effect = UIGlassEffect(style: .regular)
       } else {
         effectView.effect = UIBlurEffect(style: .systemMaterialDark)
       }
       addSubview(effectView)
     }

     override func layoutSubviews() {
       effectView.frame = bounds
     }
   }
   ```
4. Update `GlassSurface.tsx` to swap `<BlurView>` for the new native view component. The public API (`intensity`, `role`, `radius`, etc.) stays the same.
5. Run `npx expo prebuild --clean` and rebuild via EAS. The new dev client will pick up the module.

If `UIGlassEffect` isn't the final shipping name in iOS 26 SDK, the same wrapper pattern works for whatever Apple lands on — only the line inside `init` needs updating.

## Playground

`src/screens/GlassPlaygroundScreen.tsx` is a dev-only sandbox. Reachable from Settings → Developer Tools → Glass Playground. Iterate on the primitives there over a real cover-art background before wiring them into product screens.
