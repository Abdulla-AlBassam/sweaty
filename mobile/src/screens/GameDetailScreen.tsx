import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, STATUS_LABELS, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'GameDetail'>

interface GameDetails {
  id: number
  name: string
  slug?: string
  summary?: string
  coverUrl?: string
  cover_url?: string
  firstReleaseDate?: string
  first_release_date?: string
  genres?: string[]
  platforms?: string[]
  rating?: number
}

interface UserGameLog {
  id: string
  status: string
  rating: number | null
  platform: string | null
}

export default function GameDetailScreen({ navigation, route }: Props) {
  const { gameId } = route.params
  const { user } = useAuth()

  const [game, setGame] = useState<GameDetails | null>(null)
  const [userLog, setUserLog] = useState<UserGameLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('GameDetailScreen mounted with gameId:', gameId)
    fetchGameDetails()
    if (user) {
      fetchUserLog()
    }
  }, [gameId, user])

  const fetchGameDetails = async () => {
    try {
      // First try to get from cache
      const { data: cached } = await supabase
        .from('games_cache')
        .select('*')
        .eq('id', gameId)
        .single()

      if (cached) {
        setGame({
          id: cached.id,
          name: cached.name,
          slug: cached.slug,
          summary: cached.summary,
          cover_url: cached.cover_url,
          first_release_date: cached.first_release_date,
          genres: cached.genres,
          platforms: cached.platforms,
          rating: cached.rating,
        })
        setIsLoading(false)
        return
      }

      // If not cached, fetch from API
      const response = await fetch(`${API_CONFIG.baseUrl}/api/games/${gameId}`)
      if (response.ok) {
        const data = await response.json()
        setGame(data.game)
      }
    } catch (error) {
      console.error('Error fetching game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserLog = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('game_logs')
        .select('id, status, rating, platform')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      if (data) {
        setUserLog(data)
      }
    } catch (error) {
      // Game not logged yet, that's fine
    }
  }

  const getCoverUrl = () => {
    const url = game?.coverUrl || game?.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig') : null
  }

  const getReleaseYear = () => {
    const date = game?.firstReleaseDate || game?.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    )
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="game-controller-outline" size={64} color={Colors.textDim} />
          <Text style={styles.errorText}>Game not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const coverUrl = getCoverUrl()
  const releaseYear = getReleaseYear()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{game.name}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cover and Info */}
        <View style={styles.gameInfo}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="game-controller" size={40} color={Colors.textDim} />
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{game.name}</Text>
            {releaseYear && (
              <Text style={styles.year}>{releaseYear}</Text>
            )}
            {game.genres && game.genres.length > 0 && (
              <Text style={styles.genres}>{game.genres.slice(0, 3).join(', ')}</Text>
            )}
          </View>
        </View>

        {/* User Status */}
        {userLog && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
            <Text style={styles.statusText}>
              {STATUS_LABELS[userLog.status] || userLog.status}
              {userLog.rating && ` • ★ ${userLog.rating}`}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => console.log('Log game:', gameId)}
        >
          <Ionicons
            name={userLog ? 'create-outline' : 'add-circle-outline'}
            size={20}
            color={Colors.background}
          />
          <Text style={styles.logButtonText}>
            {userLog ? 'Edit Log' : 'Log Game'}
          </Text>
        </TouchableOpacity>

        {/* About */}
        {game.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.summaryText}>{game.summary}</Text>
          </View>
        )}

        {/* Platforms */}
        {game.platforms && game.platforms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platforms</Text>
            <Text style={styles.platformsText}>{game.platforms.join(', ')}</Text>
          </View>
        )}
      </ScrollView>
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
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  gameInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  cover: {
    width: 120,
    height: 160,
    borderRadius: BorderRadius.md,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  year: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  genres: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  logButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  logButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  platformsText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
})
