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

function PhoneMockup({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[240px] sm:w-[270px]">
      {/* iPhone 15 Pro Max frame */}
      <div className="rounded-[3rem] border-[5px] border-[#3A3A3E] bg-[#1A1A1C] p-[3px] shadow-2xl shadow-black/50">
        {/* Dynamic Island */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-full z-10" />
        {/* Screen */}
        <div className="relative rounded-[2.6rem] overflow-hidden bg-black">
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
          <LogoMark size={120} className="mb-8" />

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

      {/* Features Section */}
      <section className="px-6 py-20 bg-[var(--background)]">
        <div className="mx-auto max-w-2xl">
          <ScrollReveal>
            <h2 className="font-display text-center text-2xl sm:text-3xl font-bold tracking-tight">
              Everything You Need To Track Your Games
            </h2>
          </ScrollReveal>

          <div className="mt-10 space-y-3">
            <ScrollReveal delay={0}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Game Library</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Log games as playing, completed, want to play, on hold, or dropped. Track hours, dates, and platforms.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={60}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ratings And Reviews</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Half-star ratings, written reviews up to 2,000 characters, likes, and threaded comments.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Curated Discovery</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Browse handpicked lists, trending games, and community favourites on a dynamic search feed.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={180}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" /><circle cx="12" cy="15" r="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">AI Recommendations</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Personalised suggestions based on your taste, friend activity, and favourite studios.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={240}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Custom Lists</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Create ranked or unranked game lists, make them public or private, and share with friends.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Platform Import</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Connect your Steam or PlayStation account and import your existing library in seconds.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={360}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Ranks And Streaks</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Earn Gamer XP and Social XP across 11 ranks. Keep your daily streak alive.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={420}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-5 flex items-start gap-4 hover:bg-[var(--background-card)] transition-colors">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--background-card)]">
                  <svg className="h-[18px] w-[18px] text-[var(--foreground-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">News And Streams</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)] leading-relaxed">
                    Gaming news, YouTube trailers, and live Twitch streams on every game page.
                  </p>
                </div>
              </div>
            </ScrollReveal>
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
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Dynamic Search Feed</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">Trending, new releases, community favourites, and coming soon rows that refresh on every visit</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Personalised Recommendations</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">AI-powered picks based on your library, plus &ldquo;because you loved&rdquo; and friends&apos; favourites rails</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Rich Game Pages</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">OpenCritic scores, screenshots, similar games, live Twitch streams, and YouTube trailers</p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={150} className="flex justify-center lg:justify-end">
              <PhoneMockup src="/app-discover.png" alt="Sweaty app discover screen showing curated game lists" />
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
              <PhoneMockup src="/app-profile.png" alt="Sweaty app profile showing game library and lists" />
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

      {/* Community Section */}
      <section className="px-6 py-20 bg-[var(--background-lighter)]">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="font-display font-bold text-xs tracking-[0.3em] uppercase text-[var(--foreground-dim)] mb-4">
              Community
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-md">
              See what your friends are playing
            </h2>
            <p className="mt-4 text-[var(--foreground-muted)] leading-relaxed max-w-lg">
              Follow friends, read their reviews, catch up on gaming news, and watch
              trailers. The community without the noise.
            </p>
          </ScrollReveal>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <ScrollReveal delay={100}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Activity Feed</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">See what friends are logging, review comments with likes, and follow other gamers</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={160}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Watch And Read</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">YouTube trailers, gaming news from major outlets, and categorised content pills</p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={220}>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-lighter)] p-4">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)]">Friends Who Played</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">See which friends played a game, their ratings, and live Twitch streams on every game page</p>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={150} className="flex justify-center lg:justify-end">
              <PhoneMockup src="/app-community.png" alt="Sweaty app community activity and news feed" />
            </ScrollReveal>
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
