import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { YouTubeVideo, NewsArticle } from '../types'
import { useYouTube } from '../hooks/useYouTube'
import { useNews } from '../hooks/useNews'
import PressableScale from './PressableScale'
import Skeleton from './Skeleton'

type FeedItem =
  | { type: 'video'; data: YouTubeVideo }
  | { type: 'article'; data: NewsArticle }

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

function VideoCard({ video, onPress }: { video: YouTubeVideo; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="light" scale={0.95} accessibilityLabel={decodeHtmlEntities(video.title) + ' by ' + video.channel} accessibilityRole="button" accessibilityHint="Opens video">
      <View style={styles.card}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.cardImage}
          resizeMode="cover"
          accessibilityLabel={decodeHtmlEntities(video.title) + ' thumbnail'}
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
            <View style={styles.cardChannelRow}>
              <Image source={{ uri: video.channelAvatar }} style={styles.channelAvatar} accessibilityLabel={video.channel + ' channel avatar'} />
              <Text style={styles.cardChannel}>{video.channel}</Text>
            </View>
            <Text style={styles.cardTime}>{formatTimeAgo(video.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function ArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} haptic="light" scale={0.95} accessibilityLabel={decodeHtmlEntities(article.title)} accessibilityRole="button" accessibilityHint="Opens article">
      <View style={styles.card}>
        {article.thumbnail ? (
          <Image
            source={{ uri: article.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.articlePlaceholder]}>
            <Ionicons name="newspaper-outline" size={32} color={Colors.textDim} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0.35, 1]}
          style={styles.cardOverlay}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {decodeHtmlEntities(article.title)}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardChannelRow}>
              <View style={styles.newsTag}>
                <Text style={styles.newsTagText}>NEWS</Text>
              </View>
              <Text style={styles.cardChannel}>{article.source}</Text>
            </View>
            <Text style={styles.cardTime}>{formatTimeAgo(article.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={280} height={158} style={{ borderRadius: BorderRadius.md }} />
    </View>
  )
}

// Interleave: 2 videos, 1 article, 2 videos, 1 article...
function interleave(videos: YouTubeVideo[], articles: NewsArticle[]): FeedItem[] {
  const items: FeedItem[] = []
  let vi = 0
  let ai = 0

  while (vi < videos.length || ai < articles.length) {
    // 2 videos
    for (let i = 0; i < 2 && vi < videos.length; i++) {
      items.push({ type: 'video', data: videos[vi++] })
    }
    // 1 article
    if (ai < articles.length) {
      items.push({ type: 'article', data: articles[ai++] })
    }
  }

  return items
}

interface WatchSectionProps {
  refreshKey?: number
  showHeader?: boolean
}

export default function WatchSection({ refreshKey = 0, showHeader = true }: WatchSectionProps) {
  const navigation = useNavigation()
  const { videos, isLoading: videosLoading, error: videosError, refetch: refetchVideos } = useYouTube(10)
  const { articles, isLoading: newsLoading, error: newsError, refetch: refetchNews } = useNews(5)

  const isInitialLoad = (videosLoading || newsLoading) && videos.length === 0 && articles.length === 0
  const error = videosError && newsError && videos.length === 0 && articles.length === 0

  // Re-fetch when refreshKey changes (pull-to-refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      refetchVideos()
      refetchNews()
    }
  }, [refreshKey, refetchVideos, refetchNews])

  const feedItems = useMemo(() => interleave(videos, articles), [videos, articles])

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

  const handleArticlePress = (article: NewsArticle) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WebView',
        params: {
          url: article.url,
          title: article.source,
        },
      })
    )
  }

  if (!isInitialLoad && !error && feedItems.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {isInitialLoad ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <CardSkeleton />
          <CardSkeleton />
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
          {feedItems.map((item, index) =>
            item.type === 'video' ? (
              <VideoCard
                key={`video-${item.data.id}-${index}`}
                video={item.data}
                onPress={() => handleVideoPress(item.data)}
              />
            ) : (
              <ArticleCard
                key={`article-${item.data.id}-${index}`}
                article={item.data}
                onPress={() => handleArticlePress(item.data)}
              />
            )
          )}
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
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  articlePlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardChannelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surfaceLight,
  },
  cardChannel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  newsTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  newsTagText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  cardTime: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
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
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
})
