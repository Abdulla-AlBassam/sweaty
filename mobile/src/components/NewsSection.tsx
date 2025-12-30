import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
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

interface NewsItemProps {
  article: NewsArticle
  onPress: () => void
}

function NewsItem({ article, onPress }: NewsItemProps) {
  return (
    <PressableScale onPress={onPress} haptic="light" scale={0.98}>
      <View style={styles.newsItem}>
        <View style={styles.newsContent}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.newsMeta}>
            <Text style={styles.sourceName}>{article.source}</Text>
            <Text style={styles.separator}>|</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(article.publishedAt)}</Text>
          </View>
        </View>
        {article.thumbnail && (
          <Image
            source={{ uri: article.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}
      </View>
    </PressableScale>
  )
}

function NewsItemSkeleton() {
  return (
    <View style={styles.newsItem}>
      <View style={styles.newsContent}>
        <Skeleton width="100%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <View style={styles.newsMeta}>
          <Skeleton width={60} height={12} />
        </View>
      </View>
      <Skeleton width={60} height={60} style={{ borderRadius: BorderRadius.sm }} />
    </View>
  )
}

export default function NewsSection() {
  const navigation = useNavigation()
  const { articles, isLoading, error } = useNews(5)

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

  // Don't render if no articles (but show error state if error)
  if (!isLoading && !error && articles.length === 0) {
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

      <View style={styles.newsList}>
        {isLoading ? (
          <>
            <NewsItemSkeleton />
            <NewsItemSkeleton />
            <NewsItemSkeleton />
          </>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load news</Text>
          </View>
        ) : (
          articles.map((article, index) => (
            <NewsItem
              key={`${article.id}-${index}`}
              article={article}
              onPress={() => handleArticlePress(article)}
            />
          ))
        )}
      </View>
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
    color: Colors.textGreen,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  newsList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sourceName: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
  separator: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  timeAgo: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  errorContainer: {
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
