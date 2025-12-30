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
import NewsSection from '../components/NewsSection'


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
        {/* Header: Logo left, Profile right */}
        <View style={styles.header}>
          <GlitchLogo />
          <PressableScale onPress={() => navigation.navigate('Profile')} haptic="light" scale={0.9}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>{avatarInitial}</Text>
              </View>
            )}
          </PressableScale>
        </View>

        {/* Currently Playing Section */}
        {currentlyPlaying.length > 0 && (
          <View style={styles.currentlyPlayingSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Now Playing</Text>
                <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.currentlyPlayingScroll}
            >
              {currentlyPlaying.map((log: any) => {
                const game = log.games_cache
                if (!game) return null
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
                  : null
                return (
                  <PressableScale
                    key={log.id}
                    onPress={() => handleGamePress(game.id)}
                    haptic="light"
                    scale={0.95}
                  >
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.nowPlayingCover} />
                    ) : (
                      <View style={[styles.nowPlayingCover, styles.coverPlaceholder]}>
                        <Text style={styles.placeholderText}>?</Text>
                      </View>
                    )}
                  </PressableScale>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Gaming News Section */}
        <NewsSection />

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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  headerAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  headerAvatarInitial: {
    fontFamily: Fonts.bodyBold,
    color: Colors.accent,
    fontSize: 16,
  },
  // Currently Playing Section
  currentlyPlayingSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  currentlyPlayingScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  nowPlayingCover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xxl,
    color: Colors.textDim,
  },
  // Loading
  listsLoading: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
})
