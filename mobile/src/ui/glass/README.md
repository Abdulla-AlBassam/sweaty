# Liquid Glass UI

This folder is the design system for the iOS 26 redesign. Everything new lives here. The old UI in `src/components/` is untouched on this branch and stays untouched until the final cutover.

## Install the one dependency

From `/mobile`:

```bash
npx expo install expo-blur
```

That's the only new package needed to start. The Apple system glass (real `UIGlassEffect`) will come later via a small native module; for now `expo-blur` lets us iterate on every screen's composition.

## Primitives

- **`<GlassSurface>`** — generic glass container. Use for headers, plates, cards over imagery.
- **`<GlassCapsule>`** — pill shape. Use for search bars, segmented controls, status pills, floating buttons.
- **`<GlassSheet>`** — bottom-sheet glass material. Use for every modal/sheet (Quick Log, Filter, Log Game, Review Editor, etc).

All primitives accept `intensity` (`soft` / `medium` / `heavy`) and a `role` so the tint matches its job.

## Tokens

Edit `tokens.ts` to change every glass surface app-wide. The component API never changes; tweaks happen once, propagate everywhere.

## Playground

`src/screens/GlassPlaygroundScreen.tsx` is a dev-only sandbox. Iterate on primitives there over a real cover-art background before wiring them into product screens.

## Rebuild order

In priority order, by visual weight:

1. Tab bar
2. All sheets and modals
3. Dashboard hero overlays
4. Profile header stack
5. Game Detail sticky header
6. Search bar and segmented controls
7. Small chrome (settings gear, filter funnel, close X, status badges)
8. Polish pass

## The native module (later)

`expo-blur` is a close stand-in but not the real iOS 26 material. Once layouts are locked, we'll:

1. Bump `ios.deploymentTarget` to `26.0` via the `expo-build-properties` plugin in `app.config.js`.
2. Generate an Expo Module (`npx create-expo-module --local glass-surface-native`).
3. Replace the `BlurView` inside `GlassSurface` with a `UIVisualEffectView` configured with `UIGlassEffect`.

Component API stays identical. Only the internals change.
