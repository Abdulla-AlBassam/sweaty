'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--background-lighter)] ${className}`}
    />
  )
}

// Game card skeleton for grids
export function GameCardSkeleton() {
  return (
    <div className="aspect-[3/4] animate-pulse rounded-lg bg-[var(--background-lighter)]" />
  )
}

// Profile header skeleton
export function ProfileHeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      {/* Avatar */}
      <div className="h-32 w-32 flex-shrink-0 animate-pulse rounded-full bg-[var(--background-lighter)]" />

      {/* User Info */}
      <div className="flex-1 text-center sm:text-left">
        <div className="mx-auto h-9 w-48 animate-pulse rounded bg-[var(--background-lighter)] sm:mx-0" />
        <div className="mx-auto mt-2 h-5 w-32 animate-pulse rounded bg-[var(--background-lighter)] sm:mx-0" />
        <div className="mx-auto mt-4 h-4 w-64 animate-pulse rounded bg-[var(--background-lighter)] sm:mx-0" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 rounded-xl bg-[var(--background-lighter)] p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="mx-auto h-8 w-12 animate-pulse rounded bg-[var(--background-card)]" />
            <div className="mx-auto mt-1 h-3 w-16 animate-pulse rounded bg-[var(--background-card)]" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-[var(--background-card)] p-6">
          <div className="h-4 w-20 animate-pulse rounded bg-[var(--background-lighter)]" />
          <div className="mt-4 h-9 w-16 animate-pulse rounded bg-[var(--background-lighter)]" />
        </div>
      ))}
    </div>
  )
}

// Game grid skeleton
export function GameGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
      {[...Array(count)].map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Search result skeleton
export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-12 w-9 flex-shrink-0 animate-pulse rounded bg-[var(--background-card)]" />
      <div className="flex-1">
        <div className="h-4 w-32 animate-pulse rounded bg-[var(--background-card)]" />
        <div className="mt-1 h-3 w-16 animate-pulse rounded bg-[var(--background-card)]" />
      </div>
    </div>
  )
}

// Game detail page skeleton
export function GameDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Cover */}
        <div className="mx-auto w-full max-w-xs flex-shrink-0 md:mx-0 md:w-72">
          <div className="aspect-[3/4] animate-pulse rounded-xl bg-[var(--background-lighter)]" />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="h-10 w-3/4 animate-pulse rounded bg-[var(--background-lighter)]" />
          <div className="mt-4 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-[var(--background-lighter)]" />
            ))}
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-[var(--background-lighter)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--background-lighter)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--background-lighter)]" />
          </div>
          <div className="mt-8 h-12 w-40 animate-pulse rounded-lg bg-[var(--background-lighter)]" />
        </div>
      </div>
    </div>
  )
}
