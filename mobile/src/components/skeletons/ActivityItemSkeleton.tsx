import React from 'react'
import { View, StyleSheet } from 'react-native'
import Skeleton, { SkeletonCircle, SkeletonText } from '../Skeleton'
import { Colors, Spacing, BorderRadius } from '../../constants/colors'

const PILL_HEIGHT = 72

export default function ActivityItemSkeleton() {
  return (
    <View style={styles.pill}>
      {/* Avatar */}
      <SkeletonCircle size={44} />

      {/* Content */}
      <View style={styles.content}>
        <SkeletonText width="70%" height={14} />
        <SkeletonText width="40%" height={12} style={styles.secondLine} />
      </View>

      {/* Game Cover */}
      <Skeleton width={40} height={53} borderRadius={BorderRadius.sm} />
    </View>
  )
}

export function ActivitySkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentDark,
    borderRadius: PILL_HEIGHT / 2,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm,
    minHeight: PILL_HEIGHT,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  secondLine: {
    marginTop: Spacing.xs,
  },
  list: {
    gap: Spacing.sm,
  },
})
