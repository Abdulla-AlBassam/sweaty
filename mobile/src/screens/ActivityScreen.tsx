import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import SweatDropIcon from '../components/SweatDropIcon'
import CommentIcon from '../components/CommentIcon'
import { useAuth } from '../contexts/AuthContext'
import { useActivityFeed, useOwnActivityFeed } from '../hooks/useSupabase'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

import { Fonts } from '../constants/fonts'
import { MainStackParamList } from '../navigation'
import ActivityItemComponent from '../components/ActivityItem'
import { ActivitySkeletonList } from '../components/skeletons'
import { ActivityItem as ActivityItemType } from '../types'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
type TabType = 'friends' | 'you'
type CategoryType = 'all' | 'reviews' | 'logs'

const CATEGORIES = [
  { key: 'all' as CategoryType, label: 'All' },
  { key: 'reviews' as CategoryType, label: 'Reviews' },
  { key: 'logs' as CategoryType, label: 'Logs' },
]

type DateGroup = {
  label: string
  activities: ActivityItemType[]
}

function groupActivitiesByDate(activities: ActivityItemType[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const thisWeek = new Date(today.getTime() - 7 * 86400000)

  const groups: Record<string, ActivityItemType[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Earlier': [],
  }

  for (const activity of activities) {
    const date = new Date(activity.created_at)
    if (date >= today) {
      groups['Today'].push(activity)
    } else if (date >= yesterday) {
      groups['Yesterday'].push(activity)
    } else if (date >= thisWeek) {
      groups['This Week'].push(activity)
    } else {
      groups['Earlier'].push(activity)
    }
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, activities: items }))
}

export default function ActivityScreen() {
  const navigation = useNavigation<NavigationProp>()
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
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

  // Group activities by date for visual rhythm
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(activities)
  }, [activities])

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
        ? 'No reviews from friends yet'
        : 'You haven\'t written any reviews yet'
    }
    if (activeCategory === 'logs') {
      return activeTab === 'friends'
        ? 'No logs from friends yet'
        : 'You haven\'t logged any games yet'
    }
    return activeTab === 'friends'
      ? 'Follow other gamers to see what they\'re playing'
      : 'Start logging games to see your activity here'
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>activity</Text>
      </View>

      <View style={styles.navRow}>
        {/* Friends/You Pills */}
        <TouchableOpacity
          style={[styles.pill, activeTab === 'friends' && styles.pillActive]}
          onPress={() => setActiveTab('friends')}
          accessibilityLabel="Friends"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'friends' }}
        >
          <Text style={[styles.pillText, activeTab === 'friends' && styles.pillTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, activeTab === 'you' && styles.pillActive]}
          onPress={() => setActiveTab('you')}
          accessibilityLabel="You"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'you' }}
        >
          <Text style={[styles.pillText, activeTab === 'you' && styles.pillTextActive]}>
            You
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.navSpacer} />

        {/* Category Pills */}
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.pill,
              activeCategory === category.key && styles.pillActive,
            ]}
            onPress={() => setActiveCategory(category.key)}
            accessibilityLabel={category.label}
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategory === category.key }}
          >
            <Text
              style={[
                styles.pillText,
                activeCategory === category.key && styles.pillTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
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
            {activeCategory === 'reviews' ? (
              <View style={styles.emptyIcon}><CommentIcon size={48} color={Colors.textDim} /></View>
            ) : activeTab === 'friends' && activeCategory === 'all' ? (
              <Ionicons name="people-outline" size={48} color={Colors.textDim} style={styles.emptyIcon} />
            ) : (
              <View style={styles.emptyIcon}>
                <SweatDropIcon size={48} variant="static" />
              </View>
            )}
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {groupedActivities.map((group) => (
              <View key={group.label} style={styles.dateSection}>
                {groupedActivities.length > 1 && (
                  <Text style={styles.dateSectionLabel}>{group.label}</Text>
                )}
                <View style={styles.dateGroupCard}>
                  {group.activities.map((activity, index) => (
                    <ActivityItemComponent
                      key={activity.id}
                      activity={activity}
                      onUserPress={handleUserPress}
                      onGamePress={handleGamePress}
                      isLast={index === group.activities.length - 1}
                    />
                  ))}
                </View>
              </View>
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
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    lineHeight: 28,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  navSpacer: {
    flex: 1,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderColor: Colors.cream,
  },
  pillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  pillTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxxl,
  },
  feedContainer: {
    gap: Spacing.xl,
  },
  dateSection: {
    gap: Spacing.sm,
  },
  dateSectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    lineHeight: 17,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingLeft: Spacing.xs,
  },
  dateGroupCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
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
    lineHeight: 26,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
})
