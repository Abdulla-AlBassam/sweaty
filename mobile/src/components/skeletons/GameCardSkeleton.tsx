import React from 'react'
import { View, StyleSheet } from 'react-native'
import Skeleton from '../Skeleton'
import { Spacing, BorderRadius } from '../../constants/colors'

interface GameCardSkeletonProps {
  width?: number
  showTitle?: boolean
}

export default function GameCardSkeleton({
  width = 100,
  showTitle = false,
}: GameCardSkeletonProps) {
  const height = Math.round(width * (4 / 3)) // 3:4 aspect ratio

  return (
    <View style={[styles.container, { width }]}>
      <Skeleton width={width} height={height} borderRadius={BorderRadius.md} />
      {showTitle && (
        <Skeleton
          width={width * 0.8}
          height={12}
          borderRadius={4}
          style={styles.title}
        />
      )}
    </View>
  )
}

export function GameCardSkeletonRow({
  count = 5,
  cardWidth = 100,
}: {
  count?: number
  cardWidth?: number
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} width={cardWidth} />
      ))}
    </View>
  )
}

export function GameCardSkeletonGrid({
  count = 6,
  cardWidth = 100,
}: {
  count?: number
  cardWidth?: number
}) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <GameCardSkeleton width={cardWidth} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.md,
  },
  title: {
    marginTop: Spacing.xs,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridItem: {
    width: '30%',
    marginBottom: Spacing.sm,
  },
})
