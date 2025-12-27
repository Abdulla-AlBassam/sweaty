import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>sweaty</Text>
        </View>

        {/* Currently Playing Section - Inline Layout */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.currentlyPlayingSection}
          contentContainerStyle={styles.currentlyPlayingContent}
        >
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>{avatarInitial}</Text>
              </View>
            )}
          </TouchableOpacity>
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
              <TouchableOpacity
                key={log.id}
                style={styles.smallGameCard}
                onPress={() => handleGamePress(game.id)}
                activeOpacity={0.7}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.smallGameCover} />
                ) : (
                  <View style={[styles.smallGameCover, styles.gameCoverPlaceholder]}>
                    <Text style={styles.placeholderText}>?</Text>
                  </View>
                )}
              </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxl,
    color: Colors.accentLight,
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
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
