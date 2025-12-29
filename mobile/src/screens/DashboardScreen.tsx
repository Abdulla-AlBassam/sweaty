import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
import { useGameLogs, useCuratedLists } from '../hooks/useSupabase'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'
import GlitchLogo from '../components/GlitchLogo'
import PressableScale from '../components/PressableScale'


export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, profile } = useAuth()
  const { logs, isLoading: logsLoading, refetch: refetchLogs } = useGameLogs(user?.id)
  const { lists: curatedLists, isLoading: listsLoading, refetch: refetchLists } = useCuratedLists()

  const [refreshing, setRefreshing] = useState(false)

  // Pulsing animation for "Currently Playing" indicator
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
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
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

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
  const avatarInitial = displayName.charAt(0).toUpperCase()

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
        {/* Header Logo */}
        <View style={styles.header}>
          <GlitchLogo />
        </View>

        {/* Currently Playing Section - Inline Layout */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.currentlyPlayingSection}
          contentContainerStyle={styles.currentlyPlayingContent}
        >
          <PressableScale onPress={() => navigation.navigate('Profile')} haptic="light" scale={0.9}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>{avatarInitial}</Text>
              </View>
            )}
          </PressableScale>
          <View style={styles.currentlyPlayingTitleRow}>
            <Text style={styles.currentlyPlayingTitle}>Currently Playing</Text>
            <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
          </View>
          {currentlyPlaying.map((log: any) => {
            const game = log.games_cache
            if (!game) return null
            const coverUrl = game.cover_url
              ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
              : null
            return (
              <PressableScale
                key={log.id}
                style={styles.smallGameCard}
                onPress={() => handleGamePress(game.id)}
                haptic="light"
                scale={0.92}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.smallGameCover} />
                ) : (
                  <View style={[styles.smallGameCover, styles.gameCoverPlaceholder]}>
                    <Text style={styles.placeholderText}>?</Text>
                  </View>
                )}
              </PressableScale>
            )
          })}
        </ScrollView>

        {/* Curated Lists */}
        {listsLoading ? (
          <View style={styles.listsLoading}>
            <LoadingSpinner size="large" color={Colors.accent} />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  currentlyPlayingSection: {
    marginVertical: Spacing.md,
  },
  currentlyPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
  },
  headerAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  headerAvatarInitial: {
    fontFamily: Fonts.bodyBold,
    color: Colors.background,
    fontSize: 18,
  },
  currentlyPlayingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  currentlyPlayingTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.sm,
    color: Colors.textGreen,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  smallGameCard: {
    // Just for touch target
  },
  smallGameCover: {
    width: 45,
    height: 60,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surface,
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
