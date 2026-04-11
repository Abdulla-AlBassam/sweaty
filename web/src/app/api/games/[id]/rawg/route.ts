import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { enrichFromRawg, type RawgEnrichment } from '@/lib/rawg'

// Route: GET /api/games/[id]/rawg?name=...&slug=...&year=2023
//
// Returns RAWG-enriched fields for a game (Metacritic, playtime, ESRB,
// stores, game modes, exact release date). Non-blocking: failures return
// an empty-enrichment 200 so the game detail screen degrades gracefully.
//
// Cache strategy:
//   1. Module-level Map (Fluid Compute instance reuse) -- 60s TTL.
//   2. rawg_cache Supabase table keyed by IGDB id -- 7 day TTL.
//   3. RAWG network fetch, write-through to both caches.

const MEMORY_TTL_MS = 60 * 1000
const DB_TTL_MS = 7 * 24 * 60 * 60 * 1000

type CacheEntry = { data: RawgEnrichment; expiresAt: number }
const memoryCache = new Map<string, CacheEntry>()

// Anon Supabase client for cache read/write. RLS on rawg_cache permits
// public read/write since the data is non-sensitive.
function supabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function emptyEnrichment(): RawgEnrichment {
  return {
    rawgId: null,
    rawgSlug: null,
    metacritic: null,
    playtimeHours: null,
    releasedDate: null,
    esrbRating: null,
    gameModes: [],
    stores: [],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  const slug = searchParams.get('slug')
  const yearParam = searchParams.get('year')
  const releaseYear = yearParam ? parseInt(yearParam, 10) : null

  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 })
  }

  const cacheKey = `rawg:enrichment:${id}`
  const now = Date.now()

  // Tier 1: memory cache
  const mem = memoryCache.get(cacheKey)
  if (mem && mem.expiresAt > now) {
    return NextResponse.json({ ...mem.data, source: 'memory' })
  }

  // Tier 2: rawg_cache table
  try {
    const db = supabase()
    const { data: row } = await db
      .from('rawg_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .single()

    if (row && new Date(row.expires_at).getTime() > now) {
      const enrichment = row.data as RawgEnrichment
      memoryCache.set(cacheKey, { data: enrichment, expiresAt: now + MEMORY_TTL_MS })
      return NextResponse.json({ ...enrichment, source: 'db' })
    }
  } catch {
    // Cache miss or table unavailable -- fall through to RAWG fetch.
  }

  // Tier 3: RAWG network
  let enrichment: RawgEnrichment
  try {
    enrichment = await enrichFromRawg({
      name,
      igdbSlug: slug,
      releaseYear: releaseYear && !Number.isNaN(releaseYear) ? releaseYear : null,
    })
  } catch (err) {
    console.error('[rawg route] enrichment failed:', err)
    return NextResponse.json({ ...emptyEnrichment(), source: 'error' })
  }

  // Write-through to both caches.
  memoryCache.set(cacheKey, { data: enrichment, expiresAt: now + MEMORY_TTL_MS })
  try {
    await supabase()
      .from('rawg_cache')
      .upsert(
        {
          cache_key: cacheKey,
          data: enrichment,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(now + DB_TTL_MS).toISOString(),
        },
        { onConflict: 'cache_key' },
      )
  } catch (err) {
    console.warn('[rawg route] rawg_cache upsert failed:', err)
  }

  return NextResponse.json({ ...enrichment, source: 'network' })
}
