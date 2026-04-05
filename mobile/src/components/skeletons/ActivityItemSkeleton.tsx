import React from 'react'
import { View, StyleSheet } from 'react-native'
import Skeleton, { SkeletonCircle, SkeletonText } from '../Skeleton'
import { Colors, Spacing, BorderRadius } from '../../constants/colors'

export default function ActivityItemSkeleton({ isLast }: { isLast?: boolean }) {
  return (
    <View style={[styles.container, isLast && styles.containerLast]}>
      {/* Avatar */}
      <SkeletonCircle size={40} />

      {/* Content */}
      <View style={styles.content}>
        <SkeletonText width="70%" height={14} />
        <SkeletonText width="40%" height={12} style={styles.secondLine} />
      </View>

      {/* Game Cover */}
      <Skeleton width={56} height={75} borderRadius={BorderRadius.sm} />
    </View>
  )
}

export function ActivitySkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} isLast={i === count - 1} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  containerLast: {
    borderBottomWidth: 0,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.md,
  },
  secondLine: {
    marginTop: Spacing.xs,
  },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
})
