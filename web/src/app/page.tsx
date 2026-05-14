import Image from 'next/image'
import Link from 'next/link'
import WaitlistForm from '@/components/WaitlistForm'
import ScrollReveal from '@/components/ScrollReveal'
import { LogoMark } from '@/components/Logo'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getRandomBanner(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('hero_banners')
      .select('screenshot_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (!data || data.length === 0) return null
    const random = data[Math.floor(Math.random() * data.length)]
    return random.screenshot_url
  } catch {
    return null
  }
}

function PhoneMockup({ src, alt, size = 'default' }: { src: string; alt: string; size?: 'default' | 'small' }) {
  const isSmall = size === 'small'
  return (
    <div className={isSmall ? 'relative w-[165px] sm:w-[225px] lg:w-[260px]' : 'relative mx-auto w-[260px] sm:w-[290px]'}>
      <div className={`${isSmall ? 'rounded-[2.4rem] sm:rounded-[3rem] lg:rounded-[3.4rem] border-[4px] sm:border-[5px] p-[2px] sm:p-[3px]' : 'rounded-[3.4rem] border-[5px] p-[3px]'} border-[#3A3A3E] bg-[#1A1A1C] shadow-2xl shadow-black/50`}>
        <div className={`relative overflow-hidden bg-black ${isSmall ? 'rounded-[2.2rem] sm:rounded-[2.6rem] lg:rounded-[3rem]' : 'rounded-[3rem]'}`}>
          <Image
            src={src}
            alt={alt}
            width={430}
            height={932}
            className="w-full h-auto"
            quality={90}
          />
        </div>
      </div>
    </div>
  )
}

export default async function Home() {
  const bannerUrl = await getRandomBanner()

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center min-h-dvh snap-start">
        <Image
          src={bannerUrl || '/hero-bg.jpg'}
          alt=""
          fill
          priority
          className="hidden sm:block object-cover object-center"
          sizes="(max-width: 640px) 0px, 100vw"
          unoptimized={!!bannerUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1C]/90 via-[#1A1A1C]/70 to-[#1A1A1C]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1C]/60 via-transparent to-[#1A1A1C]/60" />

        <div className="relative z-10 flex flex-col items-center max-w-2xl">
          <LogoMark size={130} className="mb-8" />

          <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-6">
            Coming Soon
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Gaming Social Platform
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[var(--foreground-muted)] max-w-lg leading-relaxed">
            Your one stop shop for tracking, rating, and reviewing every game you play.
            Sign up to join the TestFlight beta and be the first to try it.
          </p>

          <div className="mt-10 w-full flex justify-center">
            <WaitlistForm />
          </div>

          <div className="mt-8 flex flex-row items-center gap-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-lighter)]/60 backdrop-blur-sm px-5 py-3">
              <svg className="h-5 w-5 shrink-0 text-[var(--foreground-muted)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-[var(--foreground-dim)] leading-none">Coming soon on</p>
                <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-lighter)]/60 backdrop-blur-sm px-5 py-3">
              <svg className="h-5 w-5 shrink-0 text-[var(--foreground-muted)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-[var(--foreground-dim)] leading-none">Coming soon on</p>
                <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Log & Track Section */}
      <section className="min-h-dvh snap-start flex flex-col justify-center px-6 py-20 bg-[var(--background-lighter)]">
        <div className="mx-auto max-w-5xl w-full">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Log & Track
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Track every game you play
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Log games with status, ratings, platform, reviews, and hours played.
              Your library organises everything automatically.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <ScrollReveal delay={150} className="flex justify-center lg:justify-start order-2 lg:order-1">
              <PhoneMockup src="/app-log-game.png" alt="Log game modal with rating and review" />
            </ScrollReveal>

            <div className="space-y-3 order-1 lg:order-2">
              <ScrollReveal delay={80}>
                <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
                  <Image
                    src="/app-library.png"
                    alt="Library organised by play status"
                    width={1200}
                    height={600}
                    className="w-full h-auto"
                    quality={90}
                  />
                </div>
              </ScrollReveal>

              <ScrollReveal delay={140}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Quick Logging</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Set your status, choose your platform, track hours played, and add start and completion dates</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ratings, Reviews, And More</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Half-star ratings, written reviews, add to your lists, plus progress notes coming soon</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="min-h-dvh snap-start flex flex-col justify-center px-6 py-20 bg-[var(--background)]">
        <div className="mx-auto max-w-5xl w-full">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Your Profile
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Your collection, your identity
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Build a profile that reflects who you are as a gamer. Follow friends,
              see what they are playing, and share your collection with the community.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <ScrollReveal delay={150} className="flex justify-center lg:justify-start order-2 lg:order-1">
              <div className="flex items-start gap-3 sm:gap-5">
                <PhoneMockup src="/app-profile-top.png" alt="Profile with stats and favourite games" size="small" />
                <div className="mt-8 sm:mt-12">
                  <PhoneMockup src="/app-profile-bottom.png" alt="Profile lists and library by status" size="small" />
                </div>
              </div>
            </ScrollReveal>

            <div className="space-y-3 order-1 lg:order-2">
              <ScrollReveal delay={100}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Follow And Connect</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Follow friends, see what they are playing, and keep up with their reviews and activity</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Favourite Games And Lists</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Pin your top 5 games to your profile and showcase your library organised by status</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ranks And Streaks</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Earn XP, climb through ranks, and build daily activity streaks as you log your games and interact with the community</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Game Details Section */}
      <section className="min-h-dvh snap-start flex flex-col justify-center px-6 py-20 bg-[var(--background-lighter)]">
        <div className="mx-auto max-w-5xl w-full">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Game Details
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Everything about every game
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Critic scores, community reviews, live Twitch streams, YouTube trailers,
              where to buy, and similar games all in one place.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <ScrollReveal delay={100}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Reviews And Scores</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">OpenCritic scores, community ratings, written reviews with likes, and friends who played</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Streams And Trailers</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Live Twitch streams, YouTube trailers, and where to buy on every game page</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Similar Games</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Smart recommendations for similar titles powered by IGDB, RAWG, and community data</p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={150} className="flex justify-center lg:justify-end">
              <div className="flex items-start gap-3 sm:gap-5">
                <PhoneMockup src="/app-game-detail.png" alt="Game page with reviews and OpenCritic scores" size="small" />
                <div className="mt-8 sm:mt-12">
                  <PhoneMockup src="/app-game-streams.png" alt="Game streams, trailers, and similar games" size="small" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Discover Section */}
      <section className="min-h-dvh snap-start flex flex-col justify-center px-6 py-20 bg-[var(--background)]">
        <div className="mx-auto max-w-5xl w-full">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Discover
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Find your next favourite game
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Browse dozens of curated lists, discover trending and new releases,
              and see what your friends are playing right now.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <ScrollReveal delay={100}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Dynamic Search Feed</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Trending, new releases, community favourites, and coming soon rows alongside dozens of curated lists</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Curated Collections</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Handpicked lists like Timeless Classics, 2025 Essentials, and GOATed Remakes</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Custom Lists</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Create your own lists, organise games your way, and share them with the community</p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={150} className="flex justify-center lg:justify-end">
              <div className="flex items-start gap-3 sm:gap-5">
                <PhoneMockup src="/app-search.png" alt="Search feed with curated game lists" size="small" />
                <div className="mt-8 sm:mt-12">
                  <PhoneMockup src="/app-home.png" alt="Home screen with community activity" size="small" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA + Footer Section */}
      <section id="waitlist" className="min-h-dvh snap-start flex flex-col bg-[var(--background)]">
        <div className="flex-1 flex items-center justify-center px-6 py-20 border-t border-[var(--border)]">
          <div className="max-w-xl text-center">
            <ScrollReveal>
              <LogoMark size={44} className="mx-auto mb-6" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Join the beta
              </h2>
              <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed">
                Drop your email to receive a TestFlight invite and be among the first to try Sweaty.
                Follow along on socials below for updates and sneak peeks.
              </p>
              <div className="mt-8 flex justify-center">
                <WaitlistForm />
              </div>
            </ScrollReveal>
          </div>
        </div>

        <footer className="border-t border-[var(--border)] py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col items-center gap-8">
              <LogoMark size={36} />

              <div className="flex items-center gap-6">
                <a href="https://x.com/sweatyapp" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors" aria-label="X (Twitter)">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="https://instagram.com/sweatyapp" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a href="https://tiktok.com/@sweatyapp" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors" aria-label="TikTok">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                </a>
                <a href="https://linkedin.com/company/sweatyapp" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>

              <div className="flex items-center gap-6 text-xs text-[var(--foreground-dim)]">
                <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
              </div>

              <p className="text-xs text-[var(--foreground-dim)]">
                &copy; {new Date().getFullYear()} Sweaty. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </section>
    </div>
  )
}
