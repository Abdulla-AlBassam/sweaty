import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'
import LibraryFilterModal, { LibrarySortType } from '../components/LibraryFilterModal'

type CuratedListDetailRouteProp = RouteProp<MainStackParamList, 'CuratedListDetail'>

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const GRID_PADDING = Spacing.lg * 2
const GAP = Spacing.md
const NUM_COLUMNS = 4
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
const BANNER_HEIGHT_BASE = SCREEN_HEIGHT * 0.30

interface GameItem {
  id: number
  name: string
  cover_url: string | null
  screenshot_urls?: string[] | null
  first_release_date?: string | null
}

export default function CuratedListDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<CuratedListDetailRouteProp>()
  const { listTitle, gameIds, games: passedGames, listDescription, bannerCoverUrl } = route.params
  const insets = useSafeAreaInsets()
  const scrollY = useRef(new Animated.Value(0)).current

  const [games, setGames] = useState<GameItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortType, setSortType] = useState<LibrarySortType>('release_newest')
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [topGameScreenshot, setTopGameScreenshot] = useState<string | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true)

      if (passedGames && passedGames.length > 0) {
        const mappedGames = passedGames.map(g => ({
          id: g.id,
          name: g.name,
          cover_url: g.coverUrl,
          first_release_date: g.first_release_date || null,
        }))
        setGames(mappedGames)
        setIsLoading(false)

        // Fetch the top game's screenshot separately so the banner shows gameplay
        // rather than cover art when the list was passed in without screenshots.
        const topId = passedGames[0]?.id
        if (topId && !bannerCoverUrl) {
          const { data: topGame } = await supabase
            .from('games_cache')
            .select('screenshot_urls')
            .eq('id', topId)
            .maybeSingle()
          setTopGameScreenshot(topGame?.screenshot_urls?.[0] ?? null)
        }
        return
      }

      try {
        const { data, error } = await supabase
          .from('games_cache')
          .select('id, name, cover_url, screenshot_urls, first_release_date')
          .in('id', gameIds)

        if (error) throw error

        const fetchedGames: GameItem[] = (data || []).map((game: any) => ({
          id: game.id,
          name: game.name,
          cover_url: game.cover_url,
          screenshot_urls: game.screenshot_urls,
          first_release_date: game.first_release_date,
        }))

        // Preserve the original gameIds order so the "top" game stays first
        const idOrder = new Map(gameIds.map((id, idx) => [id, idx]))
        fetchedGames.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

        setGames(fetchedGames)
      } catch (err) {
        console.error('Failed to fetch games:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [gameIds, passedGames])

  const sortedGames = useMemo(() => {
    const sorted = [...games]
    switch (sortType) {
      case 'release_newest':
        sorted.sort((a, b) => {
          if (!a.first_release_date && !b.first_release_date) return 0
          if (!a.first_release_date) return 1
          if (!b.first_release_date) return -1
          return new Date(b.first_release_date).getTime() - new Date(a.first_release_date).getTime()
        })
        break
      case 'release_oldest':
        sorted.sort((a, b) => {
          if (!a.first_release_date && !b.first_release_date) return 0
          if (!a.first_release_date) return 1
          if (!b.first_release_date) return -1
          return new Date(a.first_release_date).getTime() - new Date(b.first_release_date).getTime()
        })
        break
      case 'alphabetical_az':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'alphabetical_za':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      default:
        break
    }
    return sorted
  }, [games, sortType])

  // Banner uses explicit prop, else top game's screenshot (from state or game object),
  // else falls back to cover art.
  const bannerImage =
    bannerCoverUrl ??
    topGameScreenshot ??
    games[0]?.screenshot_urls?.[0] ??
    games[0]?.cover_url ??
    null

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const ITEM_HEIGHT = CARD_WIDTH * (4 / 3) + GAP

  const renderGame = ({ item }: { item: GameItem }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handleGamePress(item.id)}
      activeOpacity={0.7}
      accessibilityLabel={item.name}
      accessibilityRole="button"
      accessibilityHint="Opens game details"
    >
      {item.cover_url ? (
        <Image
          source={{ uri: getIGDBImageUrl(item.cover_url, 'coverBig') }}
          style={styles.cover}
          accessibilityLabel={`${item.name} cover art`}
        />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]}>
          <Text style={styles.placeholderText} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const bannerHeight = BANNER_HEIGHT_BASE + insets.top

  const ListHeader = (
    <View>
      {bannerImage ? (
        <Animated.View
          style={[
            styles.bannerContainer,
            { height: bannerHeight },
            {
              transform: [
                { translateY: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [-100, 0], extrapolateRight: 'clamp' }) },
                { scale: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' }) },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: getIGDBImageUrl(bannerImage, 'fullHd') }}
            style={styles.banner}
            resizeMode="cover"
            accessibilityLabel={`${listTitle} banner`}
          />
          <LinearGradient
            colors={[Colors.gradientMedium, 'transparent']}
            style={styles.bannerGradientTop}
          />
          <LinearGradient
            colors={['transparent', Colors.gradientMedium, Colors.background]}
            locations={[0, 0.6, 1]}
            style={styles.bannerGradient}
          />
        </Animated.View>
      ) : (
        <View style={{ height: insets.top + 44 }} />
      )}

      <View style={[styles.listInfo, bannerImage && styles.listInfoWithBanner]}>
        <Text style={styles.heroTitle}>{listTitle}</Text>
        {listDescription ? (
          <Text style={styles.heroDescription}>{listDescription}</Text>
        ) : null}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to previous screen"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setFilterModalVisible(true)}
          accessibilityLabel="Sort games"
          accessibilityRole="button"
        >
          <Ionicons name="funnel-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={Colors.accent} />
        </View>
      ) : (
        <Animated.FlatList
          data={sortedGames}
          renderItem={renderGame}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          ListHeaderComponent={ListHeader}
          bounces={true}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        />
      )}

      <LibraryFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filterType="all"
        sortType={sortType}
        onFilterChange={() => {}}
        onSortChange={setSortType}
        onReset={() => setSortType('release_newest')}
        hideFilterSection
        allowedSortGroups={['RELEASE DATE', 'GAME NAME']}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  listInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listInfoWithBanner: {
    marginTop: -40,
  },
  heroTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
  },
  heroDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 19,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingBottom: Spacing.xxl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  gameCard: {
    width: CARD_WIDTH,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * (4 / 3),
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  placeholderText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
  },
})
