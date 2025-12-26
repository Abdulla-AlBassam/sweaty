import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Image,
  RefreshControl,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { MainStackParamList } from '../navigation'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useFriendsPlaying } from '../hooks/useFriendsPlaying'
import GameCard from '../components/GameCard'
import HorizontalGameList from '../components/HorizontalGameList'
import StackedAvatars from '../components/StackedAvatars'
import Skeleton, { SkeletonCircle, SkeletonText } from '../components/Skeleton'
import { GameCardSkeletonGrid } from '../components/skeletons'

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

interface DiscoveryGame {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
}

const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const { games: friendsPlaying, isLoading: isLoadingFriends, refetch: refetchFriendsPlaying } = useFriendsPlaying(user?.id)
  const [query, setQuery] = useState('')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Discovery section states
  const [trendingGames, setTrendingGames] = useState<DiscoveryGame[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [communityGames, setCommunityGames] = useState<DiscoveryGame[]>([])
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true)

  // AI Card animations
  const sparkleScale = useRef(new Animated.Value(1)).current
  const sparkleRotate = useRef(new Animated.Value(0)).current
  const glowOpacity = useRef(new Animated.Value(0.3)).current

  // Start AI card animations
  useEffect(() => {
    // Pulsing scale animation for sparkle
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleScale, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )

    // Rotating animation for sparkle
    const rotateAnim = Animated.loop(
      Animated.timing(sparkleRotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    )

    // Glowing animation
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    )

    pulseAnim.start()
    rotateAnim.start()
    glowAnim.start()

    return () => {
      pulseAnim.stop()
      rotateAnim.stop()
      glowAnim.stop()
    }
  }, [sparkleScale, sparkleRotate, glowOpacity])

  const sparkleRotation = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Load discovery sections and recent searches on mount
  useEffect(() => {
    loadRecentSearches()
    loadTrendingGames()
    loadCommunityGames()
  }, [])

  // Load trending games from IGDB (global trending)
  const loadTrendingGames = async () => {
    try {
      setIsLoadingTrending(true)
      const response = await fetch(`${API_CONFIG.baseUrl}/api/popular-games?limit=15`)
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadTrendingGames(),
      loadCommunityGames(),
      refetchFriendsPlaying(),
    ])
    setRefreshing(false)
  }, [refetchFriendsPlaying])

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
          fetch(`${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(query)}`),
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

  const clearRecentSearches = async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
  }

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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.searchSkeletonContent}>
          {/* Users skeleton */}
          <View style={styles.section}>
            <SkeletonText width={60} height={16} style={styles.sectionTitleSkeleton} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.userRowSkeleton}>
                <SkeletonCircle size={44} />
                <View style={styles.userInfoSkeleton}>
                  <SkeletonText width={120} height={14} />
                  <SkeletonText width={80} height={12} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
          {/* Games skeleton */}
          <View style={styles.section}>
            <SkeletonText width={60} height={16} style={styles.sectionTitleSkeleton} />
            <GameCardSkeletonGrid count={6} cardWidth={100} />
          </View>
        </ScrollView>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.browseContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        >
          {/* Ask Sweaty AI Card */}
          <TouchableOpacity
            style={styles.aiCard}
            onPress={() => navigation.navigate('AIRecommend')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.accent + '25', Colors.accent + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiCardGradient}
            >
              <View style={styles.aiCardContent}>
                <View style={styles.aiCardIconContainer}>
                  {/* Animated glow behind sparkle */}
                  <Animated.View
                    style={[
                      styles.aiCardGlow,
                      { opacity: glowOpacity }
                    ]}
                  />
                  {/* Animated sparkle icon */}
                  <Animated.View
                    style={{
                      transform: [
                        { scale: sparkleScale },
                        { rotate: sparkleRotation },
                      ],
                    }}
                  >
                    <Ionicons name="sparkles" size={24} color={Colors.accent} />
                  </Animated.View>
                </View>
                <View style={styles.aiCardTextContainer}>
                  <Text style={styles.aiCardTitle}>Ask Sweaty AI</Text>
                  <Text style={styles.aiCardSubtitle}>Personalized game recommendations</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.accent} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.recentSectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentSearchesList}
              >
                {recentSearches.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.recentChip}
                    onPress={() => handleGamePress(game.id)}
                  >
                    {(game.coverUrl || game.cover_url) && (
                      <Image
                        source={{ uri: getIGDBImageUrl(game.coverUrl || game.cover_url) }}
                        style={styles.recentChipImage}
                      />
                    )}
                    <Text style={styles.recentChipText} numberOfLines={1}>
                      {game.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Discover Section - Dynamic Lists */}
          <View style={styles.discoverSection}>
            <Text style={styles.discoverSectionTitle}>Discover</Text>

            {/* Trending Games from IGDB (global trending) */}
            <View style={styles.discoveryRow}>
              <Text style={styles.discoveryRowTitle}>Trending Right Now</Text>
              <HorizontalGameList
                games={trendingGames}
                onGamePress={(game) => handleGamePress(game.id)}
                isLoading={isLoadingTrending}
              />
            </View>

            {/* Community Popular Games (what Sweaty users like) */}
            <View style={styles.discoveryRow}>
              <Text style={styles.discoveryRowTitle}>Popular in Community</Text>
              <HorizontalGameList
                games={communityGames}
                onGamePress={(game) => handleGamePress(game.id)}
                isLoading={isLoadingCommunity}
              />
            </View>

            {/* What Your Friends Are Playing */}
            {friendsPlaying.length > 0 && (
              <View style={styles.discoveryRow}>
                <Text style={styles.discoveryRowTitle}>What Your Friends Are Playing</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsScroll}
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
          </View>
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
    fontFamily: Fonts.body,
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
  browseContent: {
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
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
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.md,
    color: Colors.accentLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userDisplayName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  userUsername: {
    fontFamily: Fonts.body,
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
  recentSection: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.text,
  },
  clearText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  recentSearchesList: {
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  recentChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
  },
  recentChipText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: FontSize.sm,
    maxWidth: 120,
  },
  discoverSection: {
    marginTop: Spacing.xl,
  },
  discoverSectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  discoveryRow: {
    marginBottom: Spacing.xl,
  },
  discoveryRowTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.text,
    marginLeft: Spacing.lg,
    marginBottom: 12,
  },
  friendsScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  friendsGameCard: {
    position: 'relative',
    width: 100,
  },
  friendsGameCover: {
    width: 100,
    height: 133,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  searchSkeletonContent: {
    paddingBottom: Spacing.xl,
  },
  sectionTitleSkeleton: {
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
  },
  userRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userInfoSkeleton: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  // AI Card styles
  aiCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  aiCardGradient: {
    padding: Spacing.lg,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  aiCardGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
  },
  aiCardTextContainer: {
    flex: 1,
  },
  aiCardTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 2,
  },
  aiCardSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
})
