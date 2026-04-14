import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, CommonActions, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useYouTube } from '../hooks/useYouTube'
import { useNews } from '../hooks/useNews'
import { YouTubeVideo, NewsArticle } from '../types'
import PressableScale from '../components/PressableScale'


type WatchTab = 'all' | 'videos' | 'news'
type WatchRouteParams = { initialTab?: WatchTab }

type FeedItem =
  | { type: 'video'; data: YouTubeVideo }
  | { type: 'article'; data: NewsArticle }

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

function VideoCard({ video, onPress }: { video: YouTubeVideo; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scale={0.98}
      accessibilityLabel={`${decodeHtmlEntities(video.title)} by ${video.channel}`}
      accessibilityRole="button"
    >
      <View style={styles.videoCard}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.videoThumbnail}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {decodeHtmlEntities(video.title)}
          </Text>
          <View style={styles.cardMeta}>
            <Image source={{ uri: video.channelAvatar }} style={styles.channelAvatar} />
            <Text style={styles.metaSource}>{video.channel}</Text>
            <Text style={styles.metaSeparator}>|</Text>
            <Text style={styles.metaTime}>{formatTimeAgo(video.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function ArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scale={0.98}
      accessibilityLabel={decodeHtmlEntities(article.title)}
      accessibilityRole="button"
    >
      <View style={styles.articleCard}>
        {article.thumbnail ? (
          <Image
            source={{ uri: article.thumbnail }}
            style={styles.articleThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.articleThumbnail, styles.articlePlaceholder]}>
            <Ionicons name="newspaper-outline" size={24} color={Colors.textDim} />
          </View>
        )}
        <View style={styles.articleBody}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {decodeHtmlEntities(article.title)}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.newsTag}>
              <Text style={styles.newsTagText}>NEWS</Text>
            </View>
            <Text style={styles.metaSource}>{article.source}</Text>
            <Text style={styles.metaSeparator}>|</Text>
            <Text style={styles.metaTime}>{formatTimeAgo(article.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

const TABS: { key: WatchTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'videos', label: 'Videos' },
  { key: 'news', label: 'News' },
]

export default function WatchScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<{ Watch: WatchRouteParams }, 'Watch'>>()
  const {
    videos,
    isLoading: videosLoading,
    isLoadingMore: videosLoadingMore,
    hasMore: videosHasMore,
    error: videosError,
    refetch: refetchVideos,
    loadMore: loadMoreVideos,
  } = useYouTube(15)
  const {
    articles,
    isLoading: newsLoading,
    isLoadingMore: newsLoadingMore,
    hasMore: newsHasMore,
    error: newsError,
    refetch: refetchNews,
    loadMore: loadMoreNews,
  } = useNews(15)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<WatchTab>(route.params?.initialTab || 'all')

  const isLoading = videosLoading || newsLoading
  const isLoadingMore = videosLoadingMore || newsLoadingMore
  const hasError = videosError && newsError

  const hasMore = activeTab === 'videos'
    ? videosHasMore
    : activeTab === 'news'
      ? newsHasMore
      : videosHasMore || newsHasMore

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchVideos(), refetchNews()])
    setRefreshing(false)
  }, [refetchVideos, refetchNews])

  const onEndReached = useCallback(() => {
    if (activeTab === 'videos') {
      loadMoreVideos()
    } else if (activeTab === 'news') {
      loadMoreNews()
    } else {
      // "All" tab — load more from both feeds
      if (videosHasMore) loadMoreVideos()
      if (newsHasMore) loadMoreNews()
    }
  }, [activeTab, loadMoreVideos, loadMoreNews, videosHasMore, newsHasMore])

  const feedItems: FeedItem[] = useMemo(() => {
    if (activeTab === 'videos') {
      return videos.map((v) => ({ type: 'video' as const, data: v }))
    }
    if (activeTab === 'news') {
      return articles.map((a) => ({ type: 'article' as const, data: a }))
    }
    // 'all' - interleave by publishedAt descending
    const allItems: FeedItem[] = [
      ...videos.map((v) => ({ type: 'video' as const, data: v })),
      ...articles.map((a) => ({ type: 'article' as const, data: a })),
    ]
    allItems.sort((a, b) => {
      const dateA = new Date(a.data.publishedAt).getTime()
      const dateB = new Date(b.data.publishedAt).getTime()
      return dateB - dateA
    })
    return allItems
  }, [videos, articles, activeTab])

  const handleVideoPress = (video: YouTubeVideo) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WebView',
        params: { url: video.videoUrl, title: video.channel },
      })
    )
  }

  const handleArticlePress = (article: NewsArticle) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'WebView',
        params: { url: article.url, title: article.source },
      })
    )
  }

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'video') {
      return <VideoCard video={item.data} onPress={() => handleVideoPress(item.data)} />
    }
    return <ArticleCard article={item.data} onPress={() => handleArticlePress(item.data)} />
  }

  const getItemKey = (item: FeedItem, index: number) => {
    if (item.type === 'video') return `video-${item.data.id}-${index}`
    return `article-${item.data.id}-${index}`
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <PressableScale
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            haptic="light"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </PressableScale>
        </View>
        <Text style={styles.headerTitle}>Watch</Text>
        <View style={{ flex: 1 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <PressableScale
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              haptic="light"
              style={[styles.tab, isActive && styles.tabActive]}
              accessibilityLabel={`${tab.label} tab`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      {/* Content */}
      <View style={[styles.sectionGroup, { backgroundColor: Colors.alternate, flex: 1 }]}>
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="large" color={Colors.accent} />
          </View>
        ) : hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load content</Text>
            <PressableScale onPress={onRefresh} haptic="light" accessibilityLabel="Retry" accessibilityRole="button">
              <Text style={styles.retryText}>Tap to retry</Text>
            </PressableScale>
          </View>
        ) : (
          <FlatList
            data={feedItems}
            renderItem={renderItem}
            keyExtractor={getItemKey}
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
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.textDim} />
                </View>
              ) : null
            }
          />
        )}
      </View>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.cream,
    borderColor: Colors.cream,
  },
  tabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.background,
  },
  // Section Groups
  sectionGroup: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  // Loading / Error
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
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  // List
  listContent: {
    padding: Spacing.lg,
  },
  itemSeparator: {
    height: Spacing.md,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  // Video Card
  videoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surfaceLight,
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  cardMeta: {
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
  metaSource: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
  metaSeparator: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  metaTime: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  // Article Card
  articleCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  articleThumbnail: {
    width: 120,
    height: 100,
    backgroundColor: Colors.surfaceLight,
  },
  articlePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleBody: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  newsTag: {
    backgroundColor: Colors.surfaceBright,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  newsTagText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
})
