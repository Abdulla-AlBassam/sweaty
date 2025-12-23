import React from 'react'
import { View, StyleSheet } from 'react-native'
import Skeleton, { SkeletonText } from '../Skeleton'
import { Colors, Spacing, BorderRadius } from '../../constants/colors'

export default function GameDetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Game Info (Cover + Details) */}
      <View style={styles.gameInfo}>
        {/* Cover Image */}
        <Skeleton width={120} height={160} borderRadius={BorderRadius.md} />

        {/* Info */}
        <View style={styles.infoContainer}>
          <SkeletonText width="90%" height={24} />
          <SkeletonText width={60} height={16} style={styles.year} />
          <SkeletonText width="70%" height={14} style={styles.genres} />
        </View>
      </View>

      {/* Action Button */}
      <Skeleton
        width="100%"
        height={48}
        borderRadius={BorderRadius.md}
        style={styles.actionButton}
      />

      {/* About Section */}
      <View style={styles.section}>
        <SkeletonText width={60} height={16} style={styles.sectionTitle} />
        <SkeletonText width="100%" height={14} style={styles.textLine} />
        <SkeletonText width="100%" height={14} style={styles.textLine} />
        <SkeletonText width="95%" height={14} style={styles.textLine} />
        <SkeletonText width="80%" height={14} style={styles.textLine} />
      </View>

      {/* Platforms Section */}
      <View style={styles.section}>
        <SkeletonText width={80} height={16} style={styles.sectionTitle} />
        <SkeletonText width="60%" height={14} />
      </View>

      {/* Reviews Section */}
      <View style={styles.section}>
        <SkeletonText width={70} height={16} style={styles.sectionTitle} />
        {/* Review items */}
        {[1, 2].map((i) => (
          <View key={i} style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <View style={styles.reviewMeta}>
                <SkeletonText width={100} height={14} />
                <SkeletonText width={60} height={12} style={styles.reviewDate} />
              </View>
            </View>
            <SkeletonText width="100%" height={14} style={styles.reviewText} />
            <SkeletonText width="70%" height={14} />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  gameInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  year: {
    marginTop: Spacing.sm,
  },
  genres: {
    marginTop: Spacing.sm,
  },
  actionButton: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  textLine: {
    marginBottom: Spacing.xs,
  },
  reviewItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewMeta: {
    marginLeft: Spacing.sm,
  },
  reviewDate: {
    marginTop: Spacing.xs,
  },
  reviewText: {
    marginBottom: Spacing.xs,
  },
})
