import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
import { useGameLogs, useCuratedLists } from '../hooks/useSupabase'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'

// Gaming-themed welcome messages (same as web)
const WELCOME_MESSAGES = [
  { text: 'Press Start', isQuestion: false },
  { text: 'Continue', isQuestion: true },
  { text: 'New quest awaits', isQuestion: false },
  { text: 'The hero returns', isQuestion: false },
  { text: 'Quest log updated', isQuestion: false },
  { text: "You've respawned", isQuestion: false },
  { text: 'Ready to game', isQuestion: true },
  { text: 'One more game', isQuestion: true },
  { text: 'Touch grass later', isQuestion: false },
]

function getRandomWelcomeMessage() {
  return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, profile } = useAuth()
  const { logs, isLoading: logsLoading, refetch: refetchLogs } = useGameLogs(user?.id)
  const { lists: curatedLists, isLoading: listsLoading, refetch: refetchLists } = useCuratedLists()

  const [refreshing, setRefreshing] = useState(false)
  const [welcomeMessage] = useState(getRandomWelcomeMessage)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refetchLogs(),
      refetchLists(),
    ])
    setRefreshing(false)
  }, [refetchLogs, refetchLists])


  // Currently playing games
  const currentlyPlaying = useMemo(() => {
    return logs
      .filter((l) => l.status === 'playing')
      .slice(0, 10)
  }, [logs])

  const displayName = profile?.display_name || profile?.username || 'Gamer'

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>sweaty</Text>
        </View>

        {/* Welcome Section with Avatar */}
        <View style={styles.welcomeSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.welcomeText}>
            {welcomeMessage.text}, {displayName}{welcomeMessage.isQuestion ? '?' : '!'}
          </Text>
        </View>


        {/* Currently Playing */}
        {currentlyPlaying.length > 0 && (
          <View style={styles.discoverySection}>
            <Text style={styles.discoverySectionTitle}>Currently Playing</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {currentlyPlaying.map((log: any) => {
                const game = log.games_cache
                if (!game) return null
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
                  : null
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.gameCard}
                    onPress={() => handleGamePress(game.id)}
                  >
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.gameCover} />
                    ) : (
                      <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                        <Text style={styles.placeholderText}>?</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Curated Lists */}
        {listsLoading ? (
          <View style={styles.listsLoading}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : curatedLists.length > 0 ? (
          curatedLists.map((list) => (
            <CuratedListRow key={list.id} list={list} />
          ))
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accentLight,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  headerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
  },
  headerAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  headerAvatarInitial: {
    color: Colors.background,
    fontSize: 26,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  discoverySection: {
    paddingTop: Spacing.lg,
  },
  discoverySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.lg,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gameCard: {
    width: 100,
  },
  gameCover: {
    width: 100,
    height: 133,
    borderRadius: BorderRadius.md,
  },
  gameCoverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xxl,
    color: Colors.textDim,
  },
  listsLoading: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
})
