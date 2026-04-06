import React, { useMemo, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { NewsArticle } from '../types'
import { useNews } from '../hooks/useNews'
import GlitchText from './GlitchText'
import PressableScale from './PressableScale'
import Skeleton from './Skeleton'

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Decode HTML entities in text
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

// Check if article is recent (within last 24 hours)
function isRecent(dateString: string): boolean {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / 3600000
  return diffHours <= 24
}

interface NewsCardProps {
  article: NewsArticle
  onPress: () => void
}

function NewsCard({ article, onPress }: NewsCardProps) {
  return (
    <PressableScale onPress={onPress} haptic="light" scale={0.95} accessibilityLabel={decodeHtmlEntities(article.title) + ' from ' + article.source} accessibilityRole="button" accessibilityHint="Opens news article">
      <View style={styles.card}>
        {article.thumbnail ? (
          <Image
            source={{ uri: article.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
            accessibilityLabel={decodeHtmlEntities(article.title) + ' thumbnail'}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.cardOverlay}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {decodeHtmlEntities(article.title)}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardSource}>{article.source}</Text>
            <Text style={styles.cardTime}>{formatTimeAgo(article.publishedAt)}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function NewsCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={180} height={220} style={{ borderRadius: BorderRadius.md }} />
    </View>
  )
}

interface NewsSectionProps {
  refreshKey?: number  // Changes trigger re-shuffle
  showHeader?: boolean // Whether to show the "Gaming News" header
}

export default function NewsSection({ refreshKey = 0, showHeader = true }: NewsSectionProps) {
  const navigation = useNavigation()
  const { articles, isLoading, error, refetch } = useNews(20) // Fetch more to filter
  const [shuffleKey, setShuffleKey] = useState(0)

  // Re-shuffle when refreshKey changes (pull-to-refresh)
  useEffect(() => {
    if (refreshKey > 0) {
      setShuffleKey((prev) => prev + 1)
      refetch() // Also refetch news on refresh
    }
  }, [refreshKey, refetch])

  // Gaming-related keywords to filter articles
  const gamingKeywords = [
    'game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'pc gaming',
    'esports', 'rpg', 'fps', 'mmorpg', 'indie', 'console', 'gamer', 'gameplay',
    'dlc', 'expansion', 'patch', 'update', 'release', 'launch', 'trailer',
    'developer', 'studio', 'publisher', 'bethesda', 'ubisoft', 'ea', 'activision',
    'blizzard', 'rockstar', 'sony', 'microsoft', 'sega', 'capcom', 'square enix',
    'fromsoftware', 'naughty dog', 'insomniac', 'bungie', 'valve', 'epic games',
    'ps5', 'ps4', 'switch', 'series x', 'gpu', 'rtx', 'geforce', 'radeon',
  ]

  // Check if article is gaming-related
  const isGamingRelated = (article: NewsArticle): boolean => {
    const text = `${article.title} ${article.source}`.toLowerCase()
    return gamingKeywords.some(keyword => text.includes(keyword))
  }

  // Filter to only recent articles (last 24 hours), gaming-related, and shuffle
  const recentArticles = useMemo(() => {
    const filtered = articles
      .filter((article) => isRecent(article.publishedAt) && isGamingRelated(article))
      .slice(0, 10)
    return shuffleArray(filtered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, shuffleKey])

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

  const handleSeeAll = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'News',
      })
    )
  }

  // Don't render if no recent articles
  if (!isLoading && !error && recentArticles.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <GlitchText
            text="Gaming News"
            style={styles.title}
            intensity="subtle"
          />
          <PressableScale onPress={handleSeeAll} haptic="light" accessibilityLabel="See all gaming news" accessibilityRole="button">
            <Text style={styles.seeAll}>See All</Text>
          </PressableScale>
        </View>
      )}

      {isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <NewsCardSkeleton />
          <NewsCardSkeleton />
          <NewsCardSkeleton />
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load news</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recentArticles.map((article, index) => (
            <NewsCard
              key={`${article.id}-${index}`}
              article={article}
              onPress={() => handleArticlePress(article)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,            // 32px between sections
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sectionHeaderBelow, // 16px below header
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,                // Smaller, consistent with other headers
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    flex: 1,
    marginRight: Spacing.sm,
  },
  seeAll: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,                // 12px
    color: Colors.textSecondary,          // Gray instead of cyan
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,                 // 12px gap between cards
  },
  card: {
    width: 180,
    height: 220,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: Colors.surfaceLight,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,              // 16px padding
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
  cardSource: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xxs,
    color: Colors.cyan,
    textTransform: 'uppercase',
  },
  cardTime: {
    fontFamily: Fonts.mono,
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
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
})
