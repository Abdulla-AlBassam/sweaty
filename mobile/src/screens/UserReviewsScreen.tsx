import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'
import StarRating from '../components/StarRating'
import SweatDropIcon from '../components/SweatDropIcon'
import LibraryFilterModal, { LibrarySortType } from '../components/LibraryFilterModal'

type UserReviewsRouteProp = RouteProp<MainStackParamList, 'UserReviews'>

const COVER_WIDTH = 70
const COVER_HEIGHT = COVER_WIDTH * (4 / 3)

interface ReviewItem {
  id: string
  game_id: number
  rating: number | null
  review: string
  created_at: string
  updated_at: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
    first_release_date: string | null
  }
}

function getYear(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const y = d.getFullYear()
  return y > 1970 ? String(y) : null
}

export default function UserReviewsScreen() {
  const navigation = useNavigation()
  const route = useRoute<UserReviewsRouteProp>()
  const { userId } = route.params

  const { user } = useAuth()

  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [myRatings, setMyRatings] = useState<Record<number, number | null>>({})

  // Sort state
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false)
  const [sortType, setSortType] = useState<LibrarySortType>('recent')

  const isOtherUser = !!user?.id && user.id !== userId

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('game_logs')
          .select('id, game_id, rating, review, created_at, updated_at, game:games_cache(id, name, cover_url, first_release_date)')
          .eq('user_id', userId)
          .not('review', 'is', null)
          .neq('review', '')
          .order('updated_at', { ascending: false })

        if (error) throw error

        const filtered = ((data || []) as any[]).filter(
          (r: any) => r.game && r.review && r.review.trim().length > 0
        )
        setReviews(filtered)
      } catch (err) {
        console.error('Failed to fetch user reviews:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [userId])

  // Fetch my ratings when viewing another user's reviews
  useEffect(() => {
    if (!isOtherUser || !user?.id || reviews.length === 0) return
    const fetchMyRatings = async () => {
      const gameIds = reviews.map(r => r.game_id)
      const { data } = await supabase
        .from('game_logs')
        .select('game_id, rating')
        .eq('user_id', user.id)
        .in('game_id', gameIds)
      if (data) {
        const map: Record<number, number | null> = {}
        data.forEach((r: any) => { map[r.game_id] = r.rating })
        setMyRatings(map)
      }
    }
    fetchMyRatings()
  }, [isOtherUser, user?.id, reviews])

  const sortedReviews = useMemo(() => {
    const sorted = [...reviews]

    switch (sortType) {
      case 'recent':
        sorted.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0
          return dateB - dateA
        })
        break
      case 'oldest':
        sorted.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : Infinity
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : Infinity
          return dateA - dateB
        })
        break
      case 'rating_high':
        sorted.sort((a, b) => {
          if (a.rating !== null && b.rating !== null) return b.rating - a.rating
          if (a.rating !== null) return -1
          if (b.rating !== null) return 1
          return 0
        })
        break
      case 'rating_low':
        sorted.sort((a, b) => {
          if (a.rating !== null && b.rating !== null) return a.rating - b.rating
          if (a.rating !== null) return -1
          if (b.rating !== null) return 1
          return 0
        })
        break
      case 'release_newest':
        sorted.sort((a, b) => {
          const dateA = a.game?.first_release_date ? new Date(a.game.first_release_date).getTime() : 0
          const dateB = b.game?.first_release_date ? new Date(b.game.first_release_date).getTime() : 0
          if (dateA === 0 && dateB === 0) return 0
          if (dateA === 0) return 1
          if (dateB === 0) return -1
          return dateB - dateA
        })
        break
      case 'release_oldest':
        sorted.sort((a, b) => {
          const dateA = a.game?.first_release_date ? new Date(a.game.first_release_date).getTime() : Infinity
          const dateB = b.game?.first_release_date ? new Date(b.game.first_release_date).getTime() : Infinity
          if (dateA === Infinity && dateB === Infinity) return 0
          if (dateA === Infinity) return 1
          if (dateB === Infinity) return -1
          return dateA - dateB
        })
        break
      case 'my_rating_high':
        sorted.sort((a, b) => {
          const rA = myRatings[a.game_id] ?? null
          const rB = myRatings[b.game_id] ?? null
          if (rA !== null && rB !== null) return rB - rA
          if (rA !== null) return -1
          if (rB !== null) return 1
          return 0
        })
        break
      case 'my_rating_low':
        sorted.sort((a, b) => {
          const rA = myRatings[a.game_id] ?? null
          const rB = myRatings[b.game_id] ?? null
          if (rA !== null && rB !== null) return rA - rB
          if (rA !== null) return -1
          if (rB !== null) return 1
          return 0
        })
        break
      case 'alphabetical_az':
        sorted.sort((a, b) => (a.game?.name || '').localeCompare(b.game?.name || ''))
        break
      case 'alphabetical_za':
        sorted.sort((a, b) => (b.game?.name || '').localeCompare(a.game?.name || ''))
        break
    }

    return sorted
  }, [reviews, sortType, myRatings])

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const hasActiveFilters = sortType !== 'recent'

  const renderItem = ({ item, index }: { item: ReviewItem; index: number }) => {
    const year = getYear(item.game.first_release_date)

    return (
      <TouchableOpacity
        style={[styles.reviewCard, index > 0 && styles.reviewCardBorder]}
        onPress={() => handleGamePress(item.game_id)}
        activeOpacity={0.7}
        accessibilityLabel={`Review of ${item.game.name}`}
        accessibilityRole="button"
      >
        {/* Title row: game name + year, stars on right */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.gameTitle} numberOfLines={1}>
              {item.game.name}
            </Text>
            {year && <Text style={styles.gameYear}>{year}</Text>}
          </View>
          {item.rating && (
            <StarRating rating={item.rating} size={13} filledOnly />
          )}
        </View>

        {/* Content row: cover + review text */}
        <View style={styles.contentRow}>
          {item.game.cover_url ? (
            <Image
              source={{ uri: getIGDBImageUrl(item.game.cover_url, 'coverBig2x') }}
              style={styles.cover}
            />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <SweatDropIcon size={16} variant="static" />
            </View>
          )}
          <Text style={styles.reviewText} numberOfLines={4}>
            {item.review.trim()}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <Text style={styles.headerCount}>{sortedReviews.length}</Text>
        <TouchableOpacity
          onPress={() => setIsFilterModalVisible(true)}
          style={styles.filterButton}
          accessibilityLabel="Sort reviews"
          accessibilityRole="button"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? Colors.text : Colors.textDim}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      ) : sortedReviews.length > 0 ? (
        <FlatList
          data={sortedReviews}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <SweatDropIcon size={48} variant="static" />
          <Text style={styles.emptyText}>No reviews yet</Text>
        </View>
      )}

      <LibraryFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filterType="all"
        sortType={sortType}
        onFilterChange={() => {}}
        onSortChange={setSortType}
        onReset={() => setSortType('recent')}
        hideFilterSection
        isOtherUser={isOtherUser}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginRight: Spacing.xs,
  },
  filterButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  // Review card
  reviewCard: {
    paddingVertical: Spacing.lg,
  },
  reviewCardBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    gap: Spacing.xs,
  },
  gameTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    flexShrink: 1,
  },
  gameYear: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  contentRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
})
