import React, { useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, Image, ScrollView, Animated } from 'react-native'
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

// ── Dimensions ─────────────────────────────────────────────────────────
// Uniform 16:9 card — the Dashboard uses uniform sizing in every horizontal
// row (Now Playing, Friends Playing, etc.); Watch follows suit.
const CARD_WIDTH = 280
const CARD_HEIGHT = 158
const FRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

// ── Helpers ────────────────────────────────────────────────────────────
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

function isFresh(dateString: string): boolean {
  return Date.now() - new Date(dateString).getTime() < FRESH_THRESHOLD_MS
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

// Lightweight client-side categorisation from title keywords.
// Matches the taxonomy referenced in CLAUDE.md: Review, Trailer, Guide, Opinion, List, News.
function categoriseArticle(title: string): string {
  const t = title.toLowerCase()
  if (/\breview(ed|ing|s)?\b|\bverdict\b|\brating\b/.test(t)) return 'REVIEW'
  if (/\btrailer\b|\bteaser\b|\breveal\b|\bshowcase\b/.test(t)) return 'TRAILER'
  if (/\bguide\b|\bhow to\b|\bwalkthrough\b|\btips\b|\btutorial\b/.test(t)) return 'GUIDE'
  if (/\bwhy\b|\bopinion\b|\beditorial\b|\bessay\b|\bi think\b/.test(t)) return 'OPINION'
  if (/\bbest\b|\btop \d+\b|\branking\b|\branked\b|\bevery\b/.test(t)) return 'LIST'
  return 'NEWS'
}

// ── Fresh dot — quiet pulsing indicator, echoes Dashboard "Now Playing" ─
function FreshDot() {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return <Animated.View style={[styles.freshDot, { opacity: pulse }]} />
}

// ── Cards ──────────────────────────────────────────────────────────────
function VideoCard({ video, onPress }: { video: YouTubeVideo; onPress: () => void }) {
  const fresh = isFresh(video.publishedAt)

  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scale={0.96}
      accessibilityLabel={decodeHtmlEntities(video.title) + ' by ' + video.channel}
      accessibilityRole="button"
      accessibilityHint="Opens video"
    >
      <View style={styles.card}>
        <Image
          source={{ uri: video.thumbnail }}
          style={styles.cardImage}
          resizeMode="cover"
          accessibilityLabel={decodeHtmlEntities(video.title) + ' thumbnail'}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
          locations={[0.25, 0.6, 1]}
          style={styles.cardOverlay}
        />

        <View style={styles.typeChip}>
          <Ionicons name="play" size={10} color={Colors.text} style={{ marginLeft: 1 }} />
        </View>

        {fresh && (
          <View style={styles.freshWrap}>
            <FreshDot />
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {decodeHtmlEntities(video.title)}
          </Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardChannelRow}>
              <Image
                source={{ uri: video.channelAvatar }}
                style={styles.channelAvatar}
                accessibilityLabel={video.channel + ' channel avatar'}
              />
              <Text style={styles.cardChannel} numberOfLines={1}>
                {video.channel}
              </Text>
            </View>
            <Text style={styles.cardTime}>{formatTimeAgo(video.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function ArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  const fresh = isFresh(article.publishedAt)
  const category = categoriseArticle(article.title)

  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scale={0.96}
      accessibilityLabel={decodeHtmlEntities(article.title)}
      accessibilityRole="button"
      accessibilityHint="Opens article"
    >
      <View style={styles.card}>
        {article.thumbnail ? (
          <Image source={{ uri: article.thumbnail }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.articlePlaceholder]}>
            <Ionicons name="newspaper-outline" size={28} color={Colors.textDim} />
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
          locations={[0.25, 0.6, 1]}
          style={styles.cardOverlay}
        />

        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{category}</Text>
        </View>

        {fresh && (
          <View style={styles.freshWrap}>
            <FreshDot />
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {decodeHtmlEntities(article.title)}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardChannel} numberOfLines={1}>
              {article.source}
            </Text>
            <Text style={styles.cardTime}>{formatTimeAgo(article.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function CardSkeleton() {
  return (
    <Skeleton
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      style={{ borderRadius: BorderRadius.md }}
    />
  )
}

// ── Interleave ─────────────────────────────────────────────────────────
// Sort everything by published date, then alternate 2 videos : 1 article so
// the scroll feels visually rich without drowning in text cards.
function buildFeed(videos: YouTubeVideo[], articles: NewsArticle[]): FeedItem[] {
  const vids = videos.map((v) => ({ type: 'video' as const, data: v }))
  const arts = articles.map((a) => ({ type: 'article' as const, data: a }))

  const out: FeedItem[] = []
  let vi = 0
  let ai = 0
  while (vi < vids.length || ai < arts.length) {
    for (let i = 0; i < 2 && vi < vids.length; i++) {
      out.push(vids[vi++])
    }
    if (ai < arts.length) out.push(arts[ai++])
  }
  return out
}

// ── Main component ────────────────────────────────────────────────────
interface WatchSectionProps {
  refreshKey?: number
  showHeader?: boolean
}

export default function WatchSection({ refreshKey = 0 }: WatchSectionProps) {
  const navigation = useNavigation()
  const { videos, isLoading: videosLoading, error: videosError, refetch: refetchVideos } = useYouTube(10)
  const { articles, isLoading: newsLoading, error: newsError, refetch: refetchNews } = useNews(5)

  const isInitialLoad = (videosLoading || newsLoading) && videos.length === 0 && articles.length === 0
  const error = videosError && newsError && videos.length === 0 && articles.length === 0

  useEffect(() => {
    if (refreshKey > 0) {
      refetchVideos()
      refetchNews()
    }
  }, [refreshKey, refetchVideos, refetchNews])

  const feedItems = useMemo(() => buildFeed(videos, articles), [videos, articles])

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

  if (!isInitialLoad && !error && feedItems.length === 0) return null

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
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
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
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 17,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
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
    gap: 5,
    flex: 1,
    marginRight: Spacing.xs,
  },
  channelAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surfaceLight,
  },
  cardChannel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  cardTime: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textMuted,
  },
  // Type chip — play triangle in frosted bubble, top-left
  typeChip: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Category pill — small cream label on a dark bubble, no border
  categoryPill: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  categoryPillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    color: Colors.cream,
    letterSpacing: 1,
  },
  // Fresh dot — top-right, mirrors Now Playing pulse
  freshWrap: {
    position: 'absolute',
    top: Spacing.sm + 6,
    right: Spacing.sm + 3,
  },
  freshDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.cream,
    shadowColor: Colors.cream,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
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
