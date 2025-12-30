import React, { useMemo } from 'react'
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
    <PressableScale onPress={onPress} haptic="light" scale={0.95}>
      <View style={styles.card}>
        {article.thumbnail ? (
          <Image
            source={{ uri: article.thumbnail }}
            style={styles.cardImage}
            resizeMode="cover"
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
            {article.title}
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

export default function NewsSection() {
  const navigation = useNavigation()
  const { articles, isLoading, error } = useNews(20) // Fetch more to filter

  // Filter to only recent articles (last 24 hours)
  const recentArticles = useMemo(() => {
    return articles.filter((article) => isRecent(article.publishedAt)).slice(0, 10)
  }, [articles])

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
      <View style={styles.header}>
        <GlitchText
          text="Gaming News"
          style={styles.title}
          intensity="subtle"
        />
        <PressableScale onPress={handleSeeAll} haptic="light">
          <Text style={styles.seeAll}>See All</Text>
        </PressableScale>
      </View>

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
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAll: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
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
  cardSource: {
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
