import { DashboardStatsSkeleton, GameGridSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Welcome Section Skeleton */}
      <div className="rounded-xl bg-[var(--background-lighter)] p-8">
        <div className="h-9 w-64 animate-pulse rounded bg-[var(--background-card)]" />
        <div className="mt-4 h-5 w-48 animate-pulse rounded bg-[var(--background-card)]" />
        <div className="mt-4 h-4 w-32 animate-pulse rounded bg-[var(--background-card)]" />
      </div>

      {/* Stats Skeleton */}
      <DashboardStatsSkeleton />

      {/* Recent Games Skeleton */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-[var(--background-lighter)]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--background-lighter)]" />
        </div>
        <div className="mt-6">
          <GameGridSkeleton count={8} />
        </div>
      </div>
    </div>
  )
}
