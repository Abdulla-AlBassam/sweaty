import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import GameCard from '../components/GameCard'
import HorizontalGameList from '../components/HorizontalGameList'
import StackedAvatars from '../components/StackedAvatars'
import { useFriendsPlaying } from '../hooks/useFriendsPlaying'

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
}

interface SearchUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

// TEMPORARY: Using local API for testing - change back to Vercel before deploying
const API_BASE_URL = 'http://192.168.100.152:3000'
const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trendingGames, setTrendingGames] = useState<SearchGame[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [communityGames, setCommunityGames] = useState<SearchGame[]>([])
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true)

  // Get games that friends are currently playing
  const { games: friendsPlaying, isLoading: isLoadingFriends } = useFriendsPlaying(user?.id)

  // Load recent searches and discovery sections on mount
  useEffect(() => {
    loadRecentSearches()
    loadTrendingGames()
    loadCommunityGames()
  }, [])

  // Load trending games from IGDB (global trending)
  const loadTrendingGames = async () => {
    try {
      setIsLoadingTrending(true)
      const response = await fetch(`${API_BASE_URL}/api/popular-games?limit=15`)
      if (!response.ok) throw new Error('Failed to fetch trending games')
      const data = await response.json()
      setTrendingGames(data.games || [])
    } catch (err) {
      console.error('Failed to load trending games:', err)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  // Load community popular games from local database (what Sweaty users like)
  const loadCommunityGames = async () => {
    try {
      setIsLoadingCommunity(true)
      const { data, error } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .not('cover_url', 'is', null)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(15)

      if (error) throw error
      setCommunityGames(data || [])
    } catch (err) {
      console.error('Failed to load community games:', err)
    } finally {
      setIsLoadingCommunity(false)
    }
  }

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err)
    }
  }

  const saveRecentSearch = async (game: SearchGame) => {
    try {
      const updated = [
        game,
        ...recentSearches.filter((g) => g.id !== game.id),
      ].slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save recent search:', err)
    }
  }

  // Search for users in Supabase
  const searchUsers = async (searchQuery: string): Promise<SearchUser[]> => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5)

      // Exclude current user
      if (user) {
        query = query.neq('id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('User search error:', err)
      return []
    }
  }

  // Debounced search for both games and users
  useEffect(() => {
    if (!query || query.length < 2) {
      setGameResults([])
      setUserResults([])
      setError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Search games and users in parallel
        const [gamesResponse, users] = await Promise.all([
          fetch(`${API_BASE_URL}/api/games/search?q=${encodeURIComponent(query)}`),
          searchUsers(query),
        ])

        if (!gamesResponse.ok) {
          throw new Error('Search failed')
        }

        const gamesData = await gamesResponse.json()
        setGameResults(gamesData.games || [])
        setUserResults(users)
      } catch (err) {
        setError('Failed to search')
        setGameResults([])
        setUserResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleGamePress = (gameId: number) => {
    const game = gameResults.find((g) => g.id === gameId) || recentSearches.find((g) => g.id === gameId)
    if (game) {
      saveRecentSearch(game)
    }
    Keyboard.dismiss()

    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleUserPress = (userProfile: SearchUser) => {
    Keyboard.dismiss()
    navigation.dispatch(
      CommonActions.navigate({
        name: 'UserProfile',
        params: { username: userProfile.username, userId: userProfile.id },
      })
    )
  }

  const clearSearch = () => {
    setQuery('')
    setGameResults([])
    setUserResults([])
    Keyboard.dismiss()
  }

  const showRecentSearches = query.length < 2 && recentSearches.length > 0
  const hasResults = userResults.length > 0 || gameResults.length > 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search games or users..."
            placeholderTextColor={Colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : showRecentSearches ? (
        <ScrollView style={styles.scrollView}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <View style={styles.gamesGrid}>
            {recentSearches.map((game) => (
              <View key={game.id} style={styles.gridItem}>
                <GameCard game={game} onPress={handleGamePress} size="medium" />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : hasResults ? (
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Users Section */}
          {userResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Users</Text>
              {userResults.map((userProfile) => (
                <TouchableOpacity
                  key={userProfile.id}
                  style={styles.userRow}
                  onPress={() => handleUserPress(userProfile)}
                >
                  {userProfile.avatar_url ? (
                    <Image source={{ uri: userProfile.avatar_url }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                      <Text style={styles.userAvatarText}>
                        {(userProfile.display_name || userProfile.username)[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userDisplayName}>
                      {userProfile.display_name || userProfile.username}
                    </Text>
                    <Text style={styles.userUsername}>@{userProfile.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Games Section */}
          {gameResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Games</Text>
              <View style={styles.gamesGrid}>
                {gameResults.map((game) => (
                  <View key={game.id} style={styles.gridItem}>
                    <GameCard game={game} onPress={handleGamePress} size="medium" />
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : query.length >= 2 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Trending Games from IGDB (global trending) */}
          <View style={styles.discoverySection}>
            <Text style={styles.discoverySectionTitle}>Trending Right Now</Text>
            <HorizontalGameList
              games={trendingGames}
              onGamePress={(game) => handleGamePress(game.id)}
              isLoading={isLoadingTrending}
            />
          </View>

          {/* Community Popular Games (what Sweaty users like) */}
          <View style={styles.discoverySection}>
            <Text style={styles.discoverySectionTitle}>Popular in Community</Text>
            <HorizontalGameList
              games={communityGames}
              onGamePress={(game) => handleGamePress(game.id)}
              isLoading={isLoadingCommunity}
            />
          </View>

          {/* What Your Friends Are Playing */}
          {friendsPlaying.length > 0 && (
            <View style={styles.discoverySection}>
              <Text style={styles.discoverySectionTitle}>What Your Friends Are Playing</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsPlayingList}
              >
                {friendsPlaying.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.friendsGameCard}
                    onPress={() => handleGamePress(game.id)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.cover_url) }}
                      style={styles.friendsGameCover}
                    />
                    <StackedAvatars users={game.friends} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userDisplayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  userUsername: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gridItem: {
    width: '30%',
    marginBottom: Spacing.md,
  },
  discoverySection: {
    paddingTop: Spacing.lg,
  },
  discoverySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.lg,
    marginBottom: 12,
  },
  friendsPlayingList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  friendsGameCard: {
    position: 'relative',
    width: 100,
    aspectRatio: 3 / 4,
  },
  friendsGameCover: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
})
