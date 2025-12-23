import React from 'react'
import { View, StyleSheet } from 'react-native'
import Skeleton, { SkeletonCircle, SkeletonText } from '../Skeleton'
import { Colors, Spacing, BorderRadius } from '../../constants/colors'

export default function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonText width={60} height={24} />
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <SkeletonCircle size={80} />
        <SkeletonText width={150} height={20} style={styles.displayName} />
        <SkeletonText width={100} height={14} style={styles.username} />
        <SkeletonText width={200} height={12} style={styles.bio} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.stat}>
            <SkeletonText width={30} height={20} />
            <SkeletonText width={50} height={12} style={styles.statLabel} />
          </View>
        ))}
      </View>

      {/* Ranks Section */}
      <View style={styles.section}>
        <SkeletonText width={50} height={16} style={styles.sectionTitle} />
        <Skeleton width="100%" height={60} borderRadius={BorderRadius.md} style={styles.rankBar} />
        <Skeleton width="100%" height={60} borderRadius={BorderRadius.md} />
      </View>

      {/* Favorites Section */}
      <View style={styles.section}>
        <SkeletonText width={70} height={16} style={styles.sectionTitle} />
        <View style={styles.favoritesRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.favoriteSlot}>
              <Skeleton width="100%" height={0} style={styles.favoriteCover} />
            </View>
          ))}
        </View>
      </View>

      {/* Game Library Section */}
      <View style={styles.section}>
        <SkeletonText width={100} height={16} style={styles.sectionTitle} />
        <View style={styles.filterTabs}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={60} height={32} borderRadius={16} style={styles.filterTab} />
          ))}
        </View>
        <View style={styles.gamesGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.gameCard}>
              <Skeleton width="100%" height={0} style={styles.gameCover} />
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  displayName: {
    marginTop: Spacing.md,
  },
  username: {
    marginTop: Spacing.xs,
  },
  bio: {
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  rankBar: {
    marginBottom: Spacing.md,
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  favoriteSlot: {
    flex: 1,
  },
  favoriteCover: {
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    marginRight: Spacing.sm,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gameCard: {
    width: '30%',
    marginBottom: Spacing.sm,
  },
  gameCover: {
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
  },
})
