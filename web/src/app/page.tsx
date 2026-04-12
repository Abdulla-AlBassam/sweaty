import Image from 'next/image'
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
    <div className={isSmall ? 'relative w-[155px] sm:w-[210px] lg:w-[240px]' : 'relative mx-auto w-[240px] sm:w-[270px]'}>
      <div className={`${isSmall ? 'rounded-[2.2rem] sm:rounded-[2.8rem] lg:rounded-[3rem] border-[4px] sm:border-[5px] p-[2px] sm:p-[3px]' : 'rounded-[3rem] border-[5px] p-[3px]'} border-[#3A3A3E] bg-[#1A1A1C] shadow-2xl shadow-black/50`}>
        <div className={`relative overflow-hidden bg-black ${isSmall ? 'rounded-[2rem] sm:rounded-[2.4rem] lg:rounded-[2.6rem]' : 'rounded-[2.6rem]'}`}>
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
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center min-h-[92vh]">
        <Image
          src={bannerUrl || '/hero-bg.jpg'}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          unoptimized={!!bannerUrl}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1C]/90 via-[#1A1A1C]/70 to-[#1A1A1C]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1C]/60 via-transparent to-[#1A1A1C]/60" />

        <div className="relative z-10 flex flex-col items-center max-w-2xl">
          <LogoMark size={144} className="mb-8" />

          <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-6">
            Coming Soon
          </p>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Gaming Social Platform
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[var(--foreground-muted)] max-w-lg leading-relaxed">
            Keep a diary of every game you play. Rate, review, and share your thoughts
            with a community of gamers.
          </p>

          <div className="mt-10 w-full flex justify-center">
            <WaitlistForm />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-lighter)]/60 backdrop-blur-sm px-5 py-3">
              <svg className="h-5 w-5 text-[var(--foreground-muted)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] text-[var(--foreground-dim)] leading-none">Coming soon on</p>
                <p className="text-sm font-semibold text-[var(--foreground)] leading-tight">App Store</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--background-lighter)]/60 backdrop-blur-sm px-5 py-3">
              <svg className="h-5 w-5 text-[var(--foreground-muted)]" viewBox="0 0 24 24" fill="currentColor">
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

      {/* Discover Section */}
      <section className="px-6 py-20 bg-[var(--background-lighter)]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Discover
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Find your next favourite game
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Explore curated lists, get personalised recommendations based on your taste,
              and see what your friends are playing.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <ScrollReveal delay={100}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Dynamic Search Feed</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Trending, new releases, community favourites, and coming soon rows that refresh on every visit</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Curated Collections</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Handpicked lists like Timeless Classics, 2025 Essentials, and GOATed Remakes</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-card)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Community And Content</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Community activity, YouTube videos, and gaming news from major outlets</p>
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

      {/* Profile Section */}
      <section className="px-6 py-20 bg-[var(--background)]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Your Profile
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Your collection, your identity
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Build a profile that reflects who you are as a gamer. Showcase your favourite
              games, track your stats, and let your library tell your story.
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
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Library By Status</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Playing, completed, played, want to play, on hold, and dropped with counts for each</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Favourite Games And Lists</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Pin your top 3 games, create custom lists, and organise your collection your way</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ranks, XP, And Streaks</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Dual XP system with 11 ranks, daily activity streaks, and quiet achievements</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Game Details Section */}
      <section className="px-6 py-20 bg-[var(--background-lighter)]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Game Details
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Everything about every game
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Critic scores, community reviews, live Twitch streams, YouTube trailers,
              and similar games on every game page.
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
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Smart recommendations for similar titles powered by IGDB and community data</p>
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

      {/* Log Section */}
      <section className="px-6 py-20 bg-[var(--background)]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Log & Track
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              Track every game you play
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Log games with status, ratings, platform, and reviews.
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
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Quick Logging</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Log as playing, completed, want to play, on hold, or dropped with platform and dates</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ratings And Reviews</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Half-star ratings, written reviews up to 2,000 characters, and add to your lists</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-[var(--background)] border-t border-[var(--border)]">
        <div className="mx-auto max-w-xl text-center">
          <ScrollReveal>
            <LogoMark size={48} className="mx-auto mb-6" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Be the first to know
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed">
              Sweaty is launching soon. Sign up to get notified when the app is available
              on iOS and Android.
            </p>
            <div className="mt-8 flex justify-center">
              <WaitlistForm />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
