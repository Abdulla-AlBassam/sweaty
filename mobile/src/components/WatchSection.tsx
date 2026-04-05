import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { YouTubeVideo } from '../types'
import { useYouTube } from '../hooks/useYouTube'
import PressableScale from './PressableScale'
import Skeleton from './Skeleton'

// Format relative time
function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

interface VideoCardProps {
  video: YouTubeVideo
  onPress: () => void
}

function VideoCard({ video, onPress }: VideoCardProps) {
  return (
    <PressableScale onPress={onPress} haptic="light" scale={0.95}>
      <View style={styles.card}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0.35, 1]}
          style={styles.cardOverlay}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {decodeHtmlEntities(video.title)}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardChannel}>{video.channel}</Text>
            <Text style={styles.cardTime}>{formatTimeAgo(video.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function VideoCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={280} height={170} style={{ borderRadius: BorderRadius.md }} />
    </View>
  )
}

interface WatchSectionProps {
  refreshKey?: number
  showHeader?: boolean
}

export default function WatchSection({ refreshKey = 0, showHeader = true }: WatchSectionProps) {
  const navigation = useNavigation()
  const { videos, isLoading, error, refetch } = useYouTube(10)

  // Re-fetch when refreshKey changes (pull-to-refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      refetch()
    }
  }, [refreshKey, refetch])

  const handleVideoPress = (video: YouTubeVideo) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WebView',
        params: {
          url: video.videoUrl,
          title: video.channel,
        },
      })
    )
  }

  if (!isLoading && !error && videos.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load videos</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {videos.map((video, index) => (
            <VideoCard
              key={`${video.id}-${index}`}
              video={video}
              onPress={() => handleVideoPress(video)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  card: {
    width: 280,
    height: 170,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardChannel: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  cardTime: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  errorContainer: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
})
