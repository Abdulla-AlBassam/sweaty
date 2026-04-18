import { useCallback, useMemo, useState } from 'react'
import { DISCOVER_FILTERS, DiscoverFacet } from '../constants/discoverFilters'
import { CuratedListWithGames } from '../types'

export type DiscoverFilterState = {
  [K in DiscoverFacet]: string[]
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchValue(list: CuratedListWithGames, value: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(value)}\\b`, 'i')
  if (list.title && regex.test(list.title)) return true
  if (list.description && regex.test(list.description)) return true
  return false
}

const EMPTY_STATE: DiscoverFilterState = {
  platform: [],
  genre: [],
  release: [],
}

export function useDiscoverFilters(lists: CuratedListWithGames[]) {
  const [active, setActive] = useState<DiscoverFilterState>(EMPTY_STATE)

  // Which values from the catalogue have >=1 matching list in the current set.
  const available = useMemo<DiscoverFilterState>(() => {
    const result: DiscoverFilterState = { platform: [], genre: [], release: [] }
    ;(Object.keys(DISCOVER_FILTERS) as DiscoverFacet[]).forEach((facet) => {
      const values = DISCOVER_FILTERS[facet] as readonly string[]
      result[facet] = values.filter((v) => lists.some((l) => matchValue(l, v)))
    })
    return result
  }, [lists])

  const selectionCount = useMemo(
    () => active.platform.length + active.genre.length + active.release.length,
    [active]
  )

  const hasAny = selectionCount > 0

  // Multi-select within a facet = OR; cross-facet = AND.
  const matchesFilters = useCallback(
    (list: CuratedListWithGames): boolean => {
      if (!hasAny) return true
      const facets = Object.keys(DISCOVER_FILTERS) as DiscoverFacet[]
      for (const facet of facets) {
        const selected = active[facet]
        if (selected.length === 0) continue
        const anyHit = selected.some((v) => matchValue(list, v))
        if (!anyHit) return false
      }
      return true
    },
    [active, hasAny]
  )

  const reset = useCallback(() => setActive(EMPTY_STATE), [])

  const toggle = useCallback((facet: DiscoverFacet, value: string) => {
    setActive((prev) => {
      const selected = prev[facet]
      const exists = selected.includes(value)
      return {
        ...prev,
        [facet]: exists ? selected.filter((v) => v !== value) : [...selected, value],
      }
    })
  }, [])

  return {
    active,
    hasAny,
    selectionCount,
    available,
    matchesFilters,
    reset,
    toggle,
    setActive,
  }
}
