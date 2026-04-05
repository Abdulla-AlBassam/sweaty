import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useYouTube } from '../hooks/useYouTube'
import { YouTubeVideo } from '../types'
import PressableScale from '../components/PressableScale'

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

export default function WatchScreen() {
  const navigation = useNavigation()
  const { videos, isLoading, error, refetch } = useYouTube(50)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

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

  const renderVideo = ({ item }: { item: YouTubeVideo }) => (
    <PressableScale
      onPress={() => handleVideoPress(item)}
      haptic="light"
      scale={0.98}
    >
      <View style={styles.videoCard}>
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {decodeHtmlEntities(item.title)}
          </Text>
          <View style={styles.videoMeta}>
            <Image source={{ uri: item.channelAvatar }} style={styles.channelAvatar} />
            <Text style={styles.channelName}>{item.channel}</Text>
            <Text style={styles.metaSeparator}>|</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          haptic="light"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>Watch</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load videos</Text>
          <PressableScale onPress={refetch} haptic="light">
            <Text style={styles.retryText}>Tap to retry</Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideo}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textDim,
  },
  retryText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.sm,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  listContent: {
    padding: Spacing.lg,
  },
  videoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surfaceLight,
  },
  videoContent: {
    padding: Spacing.md,
  },
  videoTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  channelAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surfaceLight,
  },
  channelName: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
  metaSeparator: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  itemSeparator: {
    height: Spacing.md,
  },
  timeAgo: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
})
