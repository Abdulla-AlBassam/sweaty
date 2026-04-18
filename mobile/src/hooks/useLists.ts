import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { GameList, GameListWithItems, GameListWithUser } from '../types'

/**
 * Fetch a user's custom lists, each augmented with its item count and a preview of the first
 * few games (in list order).
 */
export function useUserLists(userId: string | undefined, previewLimit: number = 3) {
  const [lists, setLists] = useState<GameListWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    if (!userId) {
      setLists([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select(`
          *,
          profiles!lists_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (listsError) throw listsError

      const listsWithDetails: GameListWithUser[] = await Promise.all(
        (listsData || []).map(async (list: any) => {
          const { count } = await supabase
            .from('list_items')
            .select('id', { count: 'exact', head: true })
            .eq('list_id', list.id)

          const { data: previewItems } = await supabase
            .from('list_items')
            .select('game_id, games_cache!list_items_game_id_fkey (id, name, cover_url)')
            .eq('list_id', list.id)
            .order('position', { ascending: true })
            .limit(previewLimit)

          const preview_games = (previewItems || [])
            .map((item: any) => item.games_cache)
            .filter(Boolean)

          return {
            id: list.id,
            user_id: list.user_id,
            title: list.title,
            description: list.description,
            is_public: list.is_public,
            created_at: list.created_at,
            updated_at: list.updated_at,
            user: {
              id: list.profiles.id,
              username: list.profiles.username,
              display_name: list.profiles.display_name,
              avatar_url: list.profiles.avatar_url,
            },
            item_count: count || 0,
            preview_games,
          }
        })
      )

      setLists(listsWithDetails)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists')
    } finally {
      setIsLoading(false)
    }
  }, [userId, previewLimit])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  return { lists, isLoading, error, refetch: fetchLists }
}

/** Fetch the most recently updated public lists across all users. */
export function usePublicLists() {
  const [lists, setLists] = useState<GameListWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select(`
          *,
          profiles!lists_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (listsError) throw listsError

      const listsWithDetails = await Promise.all(
        (listsData || []).map(async (list: any) => {
          const { count } = await supabase
            .from('list_items')
            .select('id', { count: 'exact', head: true })
            .eq('list_id', list.id)

          const { data: previewItems } = await supabase
            .from('list_items')
            .select('game_id, games_cache!list_items_game_id_fkey (id, name, cover_url)')
            .eq('list_id', list.id)
            .order('position', { ascending: true })
            .limit(15)

          const preview_games = (previewItems || [])
            .map((item: any) => item.games_cache)
            .filter(Boolean)

          return {
            id: list.id,
            user_id: list.user_id,
            title: list.title,
            description: list.description,
            is_public: list.is_public,
            is_ranked: list.is_ranked ?? false,
            created_at: list.created_at,
            updated_at: list.updated_at,
            user: {
              id: list.profiles.id,
              username: list.profiles.username,
              display_name: list.profiles.display_name,
              avatar_url: list.profiles.avatar_url,
            },
            item_count: count || 0,
            preview_games,
          }
        })
      ) as unknown as GameListWithUser[]

      setLists(listsWithDetails.filter(l => (l.item_count || 0) > 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lists')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  return { lists, isLoading, error, refetch: fetchLists }
}

export function useListDetail(listId: string | undefined) {
  const [list, setList] = useState<GameListWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    if (!listId) {
      setList(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select(`
          *,
          profiles!lists_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .eq('id', listId)
        .single()

      if (listError) throw listError

      const { data: itemsData, error: itemsError } = await supabase
        .from('list_items')
        .select(`
          id,
          list_id,
          game_id,
          position,
          added_at,
          games_cache!list_items_game_id_fkey (id, name, cover_url, screenshot_urls)
        `)
        .eq('list_id', listId)
        .order('position', { ascending: true })

      if (itemsError) throw itemsError

      const items = (itemsData || []).map((item: any) => ({
        id: item.id,
        list_id: item.list_id,
        game_id: item.game_id,
        position: item.position,
        added_at: item.added_at,
        game: item.games_cache,
      }))

      const { profiles: ownerProfile, ...rest } = listData as any
      setList({
        ...rest,
        user: ownerProfile
          ? {
              id: ownerProfile.id,
              username: ownerProfile.username,
              display_name: ownerProfile.display_name,
              avatar_url: ownerProfile.avatar_url,
            }
          : undefined,
        items,
        item_count: items.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch list')
    } finally {
      setIsLoading(false)
    }
  }, [listId])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return { list, isLoading, error, refetch: fetchList }
}

export async function createList(
  userId: string,
  title: string,
  description?: string,
  isPublic: boolean = true,
  isRanked: boolean = false
): Promise<{ data: GameList | null; error: string | null }> {
  try {
    const insertData: Record<string, unknown> = {
      user_id: userId,
      title: title.trim(),
      description: description?.trim() || null,
      is_public: isPublic,
    }
    if (isRanked) insertData.is_ranked = true

    const { data, error } = await supabase
      .from('lists')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Failed to create list' }
  }
}

/**
 * Append a game to the end of a list. If `gameInfo` is provided, the game is
 * ensured in `games_cache` first so joins downstream succeed.
 */
export async function addGameToList(
  listId: string,
  gameId: number,
  gameInfo?: { name: string; cover_url?: string | null }
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (gameInfo) {
      const { data: existingGame } = await supabase
        .from('games_cache')
        .select('id')
        .eq('id', gameId)
        .single()

      if (!existingGame) {
        const { error: cacheError } = await supabase
          .from('games_cache')
          .insert({
            id: gameId,
            name: gameInfo.name,
            cover_url: gameInfo.cover_url || null,
            cached_at: new Date().toISOString(),
          })

        // 23505 = concurrent insert by another caller; benign.
        if (cacheError && cacheError.code !== '23505') {
          console.error('Error caching game:', cacheError)
        }
      }
    }

    const { data: maxPosData } = await supabase
      .from('list_items')
      .select('position')
      .eq('list_id', listId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosData?.position ?? -1) + 1

    const { error } = await supabase
      .from('list_items')
      .insert({
        list_id: listId,
        game_id: gameId,
        position: nextPosition,
      })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Game is already in this list' }
      }
      throw error
    }

    await supabase
      .from('lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add game' }
  }
}

export async function removeGameFromList(
  listId: string,
  gameId: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('game_id', gameId)

    if (error) throw error

    await supabase
      .from('lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to remove game' }
  }
}

export async function deleteList(
  listId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete list' }
  }
}

export async function updateList(
  listId: string,
  updates: { title?: string; description?: string; is_public?: boolean }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('lists')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listId)

    if (error) throw error
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update list' }
  }
}
