import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useTwitchStreams, formatViewerCount, TwitchStream } from '../hooks/useTwitchStreams'

interface TwitchStreamsSectionProps {
  gameName: string
}

// Skeleton loader for the section
function StreamsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.skeletonText, { width: 140 }]} />
      </View>
      <View style={[styles.skeletonText, { width: 180, marginBottom: Spacing.md }]} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.streamCard}>
            <View style={styles.skeletonThumbnail} />
            <View style={[styles.skeletonText, { width: 80, marginTop: Spacing.sm }]} />
            <View style={[styles.skeletonText, { width: 50, marginTop: 4 }]} />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// Individual stream card component
function StreamCard({ stream }: { stream: TwitchStream }) {
  const handlePress = async () => {
    // Try to open in Twitch app first, fallback to browser
    const twitchAppUrl = `twitch://stream/${stream.streamer_login}`
    const webUrl = stream.twitch_url

    try {
      const canOpenApp = await Linking.canOpenURL(twitchAppUrl)
      if (canOpenApp) {
        await Linking.openURL(twitchAppUrl)
      } else {
        await Linking.openURL(webUrl)
      }
    } catch {
      // Fallback to web URL if anything fails
      await Linking.openURL(webUrl)
    }
  }

  return (
    <TouchableOpacity style={styles.streamCard} onPress={handlePress} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: stream.thumbnail_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {/* Live badge on thumbnail */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDotSmall} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Streamer info */}
      <Text style={styles.streamerName} numberOfLines={1}>
        {stream.streamer_name}
      </Text>
      <View style={styles.viewerRow}>
        <Ionicons name="eye" size={12} color={Colors.textMuted} />
        <Text style={styles.viewerCount}>{formatViewerCount(stream.viewer_count)}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function TwitchStreamsSection({ gameName }: TwitchStreamsSectionProps) {
  const { streams, totalLive, isLoading, error } = useTwitchStreams(gameName)

  // Pulsing animation for the live dot
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [pulseAnim])

  // Show skeleton while loading
  if (isLoading) {
    return <StreamsSkeleton />
  }

  // Hide section if no streams or error
  if (error || streams.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {/* Header with pulsing live dot */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.sectionTitle}>Live on Twitch</Text>
      </View>

      {/* Total streaming count */}
      <Text style={styles.totalText}>
        {totalLive} {totalLive === 1 ? 'person' : 'people'} streaming this game
      </Text>

      {/* Horizontal scroll of stream cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {streams.map((stream) => (
          <StreamCard key={stream.streamer_login} stream={stream} />
        ))}
      </ScrollView>
    </View>
  )
}

const THUMBNAIL_WIDTH = 160
const THUMBNAIL_HEIGHT = 90 // 16:9 aspect ratio

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  totalText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  streamCard: {
    width: THUMBNAIL_WIDTH,
  },
  thumbnailContainer: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  streamerName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewerCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  // Skeleton styles
  skeletonText: {
    height: 14,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surface,
  },
  skeletonThumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
})
