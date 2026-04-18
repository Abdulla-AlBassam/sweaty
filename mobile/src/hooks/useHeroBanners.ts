import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface HeroBanner {
  id: string
  game_id: number
  game_name: string
  screenshot_url: string
  display_order: number
  is_active: boolean
  created_at: string
}

/**
 * Fetches active hero banners for the dashboard. `currentBanner` is seeded to a random
 * pick; callers can call `shuffleBanner()` (e.g. on pull-to-refresh) to swap it.
 */
export function useHeroBanners() {
  const [banners, setBanners] = useState<HeroBanner[]>([])
  const [currentBanner, setCurrentBanner] = useState<HeroBanner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBanners = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('hero_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError

      const activeBanners = (data || []) as HeroBanner[]
      setBanners(activeBanners)

      if (activeBanners.length > 0) {
        const randomIndex = Math.floor(Math.random() * activeBanners.length)
        setCurrentBanner(activeBanners[randomIndex])
      } else {
        setCurrentBanner(null)
      }
    } catch (err) {
      console.error('[useHeroBanners] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch banners')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Pick a banner different from the currently displayed one.
  const shuffleBanner = useCallback(() => {
    if (banners.length > 1) {
      let newIndex: number
      do {
        newIndex = Math.floor(Math.random() * banners.length)
      } while (banners[newIndex].id === currentBanner?.id && banners.length > 1)
      setCurrentBanner(banners[newIndex])
    }
  }, [banners, currentBanner])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  return {
    banners,
    currentBanner,
    isLoading,
    error,
    refetch: fetchBanners,
    shuffleBanner,
  }
}

/** Fetches all hero banners (active and inactive) for the admin edit screen. */
export function useAdminHeroBanners() {
  const [banners, setBanners] = useState<HeroBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBanners = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('hero_banners')
        .select('*')
        .order('display_order', { ascending: true })

      if (fetchError) throw fetchError

      setBanners((data || []) as HeroBanner[])
    } catch (err) {
      console.error('[useAdminHeroBanners] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch banners')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addBanner = useCallback(async (gameId: number, gameName: string, screenshotUrl: string) => {
    try {
      const maxOrder = banners.length > 0
        ? Math.max(...banners.map(b => b.display_order))
        : -1

      const { data, error: insertError } = await supabase
        .from('hero_banners')
        .insert({
          game_id: gameId,
          game_name: gameName,
          screenshot_url: screenshotUrl,
          display_order: maxOrder + 1,
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setBanners(prev => [...prev, data as HeroBanner])
      return { success: true, banner: data }
    } catch (err) {
      console.error('[addBanner] Error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add banner' }
    }
  }, [banners])

  const removeBanner = useCallback(async (bannerId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('hero_banners')
        .delete()
        .eq('id', bannerId)

      if (deleteError) throw deleteError

      setBanners(prev => prev.filter(b => b.id !== bannerId))
      return { success: true }
    } catch (err) {
      console.error('[removeBanner] Error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove banner' }
    }
  }, [])

  const toggleBanner = useCallback(async (bannerId: string, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('hero_banners')
        .update({ is_active: isActive })
        .eq('id', bannerId)

      if (updateError) throw updateError

      setBanners(prev => prev.map(b =>
        b.id === bannerId ? { ...b, is_active: isActive } : b
      ))
      return { success: true }
    } catch (err) {
      console.error('[toggleBanner] Error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to toggle banner' }
    }
  }, [])

  const reorderBanners = useCallback(async (reorderedBanners: HeroBanner[]) => {
    try {
      const updates = reorderedBanners.map((banner, index) => ({
        id: banner.id,
        display_order: index,
      }))

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('hero_banners')
          .update({ display_order: update.display_order })
          .eq('id', update.id)

        if (updateError) throw updateError
      }

      setBanners(reorderedBanners.map((b, i) => ({ ...b, display_order: i })))
      return { success: true }
    } catch (err) {
      console.error('[reorderBanners] Error:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reorder banners' }
    }
  }, [])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  return {
    banners,
    isLoading,
    error,
    refetch: fetchBanners,
    addBanner,
    removeBanner,
    toggleBanner,
    reorderBanners,
  }
}
