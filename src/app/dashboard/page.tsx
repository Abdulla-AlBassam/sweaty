import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import DashboardSearch from '@/components/DashboardSearch'
import ActivityFeed from '@/components/ActivityFeed'

interface GameLog {
  id: string
  game_id: number
  status: string
  rating: number | null
  created_at: string
  games_cache: {
    id: number
    name: string
    cover_url: string | null
  } | null
}

// This is a Server Component - it runs on the server, not in the browser
export default async function DashboardPage() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Get the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no username set, redirect to profile setup
  if (!profile?.username) {
    redirect('/setup-profile')
  }

  // Get game logs with stats
  const { data: gameLogs } = await supabase
    .from('game_logs')
    .select(`
      id,
      game_id,
      status,
      rating,
      created_at,
      games_cache (
        id,
        name,
        cover_url
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const logs = (gameLogs || []) as unknown as GameLog[]

  // Calculate stats
  const ratedGames = logs.filter(l => l.rating !== null)
  const avgRating = ratedGames.length > 0
    ? Math.round((ratedGames.reduce((acc, l) => acc + (l.rating || 0), 0) / ratedGames.length) * 10) / 10
    : null

  const stats = {
    total: logs.length,
    playing: logs.filter(l => l.status === 'playing').length,
    completed: logs.filter(l => l.status === 'completed').length,
    backlog: logs.filter(l => l.status === 'want_to_play').length,
    avgRating,
  }

  // Get currently playing games (max 6)
  const currentlyPlaying = logs.filter(l => l.status === 'playing').slice(0, 6)

  // Get recent games (last 8)
  const recentGames = logs.slice(0, 8)

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Gaming-themed welcome messages
  // Messages ending with ? will have the ? moved after the username
  const welcomeMessages = [
    { text: 'Press Start', isQuestion: false },
    { text: 'Continue', isQuestion: true },
    { text: 'New quest awaits', isQuestion: false },
    { text: 'The hero returns', isQuestion: false },
    { text: 'Quest log updated', isQuestion: false },
    { text: "You've respawned", isQuestion: false },
    { text: 'Ready to game', isQuestion: false },
    { text: 'One more game', isQuestion: true },
    { text: 'Touch grass later', isQuestion: false },
  ]

  // Pick a random message on each render
  const randomMessageObj = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]

  const displayName = profile?.display_name || profile?.username || 'Gamer'

  // Format: "Message, Name!" or "Message, Name?" depending on isQuestion
  const welcomeText = randomMessageObj.isQuestion
    ? `${randomMessageObj.text}, ${displayName}?`
    : `${randomMessageObj.text}, ${displayName}!`

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Welcome Section */}
      <div className="rounded-xl bg-gradient-to-br from-[var(--background-lighter)] to-[var(--background-card)] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-[var(--background-card)] sm:h-20 sm:w-20">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--accent)]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{welcomeText}</h1>
              {stats.total > 0 && (
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  You&apos;ve logged {stats.total} game{stats.total !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex gap-3">
            <Link
              href={`/profile/${profile.username}`}
              className="rounded-lg bg-[var(--background-card)] px-4 py-2 text-sm font-medium hover:bg-[var(--border)] transition-colors"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Content when user has games */}
      {stats.total > 0 ? (
        <>
          {/* Quick Stats */}
          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl bg-[var(--background-card)] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{stats.playing}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Playing</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--background-card)] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Completed</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--background-card)] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.backlog}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Backlog</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--background-card)] p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                  <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--accent)]">{stats.total}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Total</p>
                </div>
              </div>
            </div>

            {stats.avgRating && (
              <div className="rounded-xl bg-[var(--background-card)] p-4 sm:p-6 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                    <svg className="h-5 w-5 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{stats.avgRating}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">Avg Rating</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Currently Playing Section */}
          {currentlyPlaying.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                  Currently Playing
                </h2>
                {stats.playing > 6 && (
                  <Link
                    href={`/profile/${profile.username}?filter=playing`}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    See all {stats.playing} →
                  </Link>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {currentlyPlaying.map((log) => (
                  <Link
                    key={log.id}
                    href={`/game/${log.game_id}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--background-lighter)] ring-2 ring-blue-500/30 transition-all hover:scale-105 hover:ring-blue-500/60"
                  >
                    {log.games_cache?.cover_url ? (
                      <Image
                        src={log.games_cache.cover_url}
                        alt={log.games_cache.name || 'Game cover'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-8 w-8 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="line-clamp-2 p-2 text-xs font-medium">
                        {log.games_cache?.name || 'Unknown'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently Logged Section */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recently Logged</h2>
              <Link
                href={`/profile/${profile.username}`}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentGames.map((log) => (
                <Link
                  key={log.id}
                  href={`/game/${log.game_id}`}
                  className="group flex gap-3 rounded-lg bg-[var(--background-card)] p-3 transition-colors hover:bg-[var(--background-lighter)]"
                >
                  {/* Cover */}
                  <div className="relative aspect-[3/4] w-16 flex-shrink-0 overflow-hidden rounded bg-[var(--background-lighter)]">
                    {log.games_cache?.cover_url ? (
                      <Image
                        src={log.games_cache.cover_url}
                        alt={log.games_cache.name || 'Game cover'}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-6 w-6 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
                    <div>
                      <p className="font-medium text-sm truncate group-hover:text-[var(--accent)] transition-colors">
                        {log.games_cache?.name || 'Unknown Game'}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)] capitalize">
                        {log.status.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      {log.rating ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <svg className="h-3 w-3 fill-yellow-400" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {log.rating}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--foreground-muted)]">No rating</span>
                      )}
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {getRelativeTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Feed Section */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold">Activity Feed</h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-1">
              Recent activity from people you follow
            </p>
            <div className="mt-4">
              <ActivityFeed userId={user.id} />
            </div>
          </div>
        </>
      ) : (
        /* Empty State - No games logged */
        <div className="mt-12">
          <div className="rounded-xl bg-[var(--background-card)] p-8 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--background-lighter)]">
              <svg
                className="h-12 w-12 text-[var(--accent)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold">Welcome to Sweaty!</h2>
            <p className="mt-2 text-[var(--foreground-muted)] max-w-md mx-auto">
              Start building your gaming library by searching for games you&apos;ve played,
              are currently playing, or want to play.
            </p>

            <div className="mt-8 max-w-md mx-auto">
              <DashboardSearch placeholder="Search for your first game..." />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
              <div className="rounded-lg bg-[var(--background-lighter)] p-4">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="mt-3 font-medium text-sm">Search Games</h3>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Find any game from our database
                </p>
              </div>
              <div className="rounded-lg bg-[var(--background-lighter)] p-4">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-green-500/10">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="mt-3 font-medium text-sm">Log Games</h3>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Track your progress and ratings
                </p>
              </div>
              <div className="rounded-lg bg-[var(--background-lighter)] p-4">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-yellow-500/10">
                  <svg className="h-5 w-5 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <h3 className="mt-3 font-medium text-sm">Rate & Review</h3>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Share your gaming opinions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
