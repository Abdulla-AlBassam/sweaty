import React, { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import PressableScale from '../components/PressableScale'
import CommunityReviewCard from '../components/CommunityReviewCard'
import { useCommunityReviews, CommunityReview } from '../hooks/useSupabase'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import type { MainStackParamList } from '../navigation'

type Nav = NativeStackNavigationProp<MainStackParamList>

export default function CommunityReviewsScreen() {
  const navigation = useNavigation<Nav>()
  const { reviews, isLoading, error, refetch } = useCommunityReviews()

  const renderItem = useCallback(
    ({ item }: { item: CommunityReview }) => (
      <View style={styles.cardWrapper}>
        <CommunityReviewCard review={item} />
      </View>
    ),
    []
  )

  const keyExtractor = useCallback((item: CommunityReview) => item.id, [])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          containerStyle={styles.backButton}
          haptic="light"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>RECENT REVIEWS</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={reviews}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && reviews.length > 0}
            onRefresh={refetch}
            tintColor={Colors.cream}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color={Colors.textDim} />
              <Text style={styles.emptyTitle}>No community reviews yet</Text>
              <Text style={styles.emptyText}>
                Be the first — log a game you played and leave a review to kick things off.
              </Text>
            </View>
          )
        }
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
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  cardWrapper: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    paddingTop: Spacing.xxxl * 2,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
})
