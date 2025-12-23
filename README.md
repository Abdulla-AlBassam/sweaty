# Sweaty

A video game tracking app — like Letterboxd, but for games. Track what you're playing, rate games, write reviews, and share your gaming journey.

## Project Structure

This is a monorepo containing:

```
sweaty/
├── web/          # Next.js web application
├── mobile/       # React Native/Expo mobile app
├── CLAUDE.md     # Project documentation
└── vercel.json   # Vercel deployment config
```

## Tech Stack

### Web (`/web`)
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **Game Data:** IGDB API

### Mobile (`/mobile`)
- **Framework:** Expo / React Native
- **Language:** TypeScript
- **Database & Auth:** Supabase
- **Game Data:** IGDB API (via web API routes)

## Getting Started

### Web App

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go app on your phone.

## Environment Variables

### Web (`web/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret
```

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-deployed-web-app.vercel.app
```

## Deployment

- **Web:** Deployed on Vercel (auto-deploys from `/web` folder)
- **Mobile:** Build with EAS Build for iOS/Android distribution
