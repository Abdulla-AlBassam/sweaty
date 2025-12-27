import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useActivityFeed, useOwnActivityFeed } from '../hooks/useSupabase'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { MainStackParamList } from '../navigation'
import ActivityItem from '../components/ActivityItem'
import { ActivitySkeletonList } from '../components/skeletons'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
type TabType = 'friends' | 'you'
type CategoryType = 'all' | 'reviews' | 'logs'

const CATEGORIES = [
  { key: 'all' as CategoryType, label: 'All' },
  { key: 'reviews' as CategoryType, label: 'Reviews' },
  { key: 'logs' as CategoryType, label: 'Logs' },
]

export default function ActivityScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all')
  const { activities: friendsActivities, isLoading: friendsLoading, refetch: refetchFriends } = useActivityFeed(user?.id)
  const { activities: ownActivities, isLoading: ownLoading, refetch: refetchOwn } = useOwnActivityFeed(user?.id)
  const [refreshing, setRefreshing] = useState(false)

  const rawActivities = activeTab === 'friends' ? friendsActivities : ownActivities
  const isLoading = activeTab === 'friends' ? friendsLoading : ownLoading

  // Filter activities by category
  const activities = useMemo(() => {
    if (activeCategory === 'all') return rawActivities
    if (activeCategory === 'reviews') {
      return rawActivities.filter(a => a.review && a.review.trim().length > 0)
    }
    if (activeCategory === 'logs') {
      return rawActivities.filter(a => !a.review || a.review.trim().length === 0)
    }
    return rawActivities
  }, [rawActivities, activeCategory])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (activeTab === 'friends') {
      await refetchFriends()
    } else {
      await refetchOwn()
    }
    setRefreshing(false)
  }, [activeTab, refetchFriends, refetchOwn])

  const handleUserPress = (userId: string, username: string) => {
    navigation.navigate('UserProfile', { username, userId })
  }

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  const getEmptyMessage = () => {
    if (activeCategory === 'reviews') {
      return activeTab === 'friends'
        ? 'no reviews from friends yet'
        : 'you haven\'t written any reviews yet'
    }
    if (activeCategory === 'logs') {
      return activeTab === 'friends'
        ? 'no logs from friends yet'
        : 'you haven\'t logged any games yet'
    }
    return activeTab === 'friends'
      ? 'follow other gamers to see what they\'re playing'
      : 'start logging games to see your activity here'
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>activity</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'you' && styles.activeTab]}
          onPress={() => setActiveTab('you')}
        >
          <Text style={[styles.tabText, activeTab === 'you' && styles.activeTabText]}>
            You
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryPill,
              activeCategory === category.key && styles.categoryPillActive,
            ]}
            onPress={() => setActiveCategory(category.key)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category.key && styles.categoryTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {isLoading ? (
          <ActivitySkeletonList count={6} />
        ) : activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeCategory === 'reviews'
                  ? 'chatbubble-outline'
                  : activeCategory === 'logs'
                  ? 'game-controller-outline'
                  : activeTab === 'friends'
                  ? 'people-outline'
                  : 'game-controller-outline'
              }
              size={48}
              color={Colors.textDim}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>no activity yet</Text>
            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onUserPress={handleUserPress}
                onGamePress={handleGamePress}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxl,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.accent,
  },
  tabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  activeTabText: {
    color: Colors.text,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  categoryText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  categoryTextActive: {
    color: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  activityList: {
    // Items separated by bottom borders, no gap needed
  },
})
