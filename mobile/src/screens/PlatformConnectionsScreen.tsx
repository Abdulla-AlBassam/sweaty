import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { usePlatformImport, PlatformStatus, MatchedGame } from '../hooks/usePlatformImport'
import { MainStackParamList } from '../navigation'
import LoadingSpinner from '../components/LoadingSpinner'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

interface PlatformCardProps {
  platform: 'steam' | 'playstation' | 'xbox'
  status: PlatformStatus | null
  isLoading: boolean
  onConnect: () => void
  onSync?: () => void
  onClear: () => void
  onContinueLogging?: () => void
  unloggedCount?: number
}

function PlatformCard({ platform, status, isLoading, onConnect, onSync, onClear, onContinueLogging, unloggedCount }: PlatformCardProps) {
  const isConnected = platform === 'playstation'
    ? status?.has_imported
    : status?.connected

  const getPlatformIcon = () => {
    switch (platform) {
      case 'steam':
        return <FontAwesome5 name="steam" size={32} color="#ffffff" />
      case 'playstation':
        return <MaterialCommunityIcons name="sony-playstation" size={32} color="#006FCD" />
      case 'xbox':
        return <MaterialCommunityIcons name="microsoft-xbox" size={32} color="#107C10" />
    }
  }

  const getPlatformName = () => {
    switch (platform) {
      case 'steam':
        return 'Steam'
      case 'playstation':
        return 'PlayStation'
      case 'xbox':
        return 'Xbox'
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusText = () => {
    if (platform === 'playstation') {
      if (status?.has_imported) {
        return `${status.game_count || 0} games imported`
      }
      return 'No games imported'
    } else {
      if (status?.connected) {
        return status.username ? `@${status.username}` : 'Connected'
      }
      return 'Not connected'
    }
  }

  const getLastSyncText = () => {
    if (platform === 'playstation') {
      return status?.last_import ? `Last import: ${formatDate(status.last_import)}` : null
    }
    return status?.last_synced_at ? `Last sync: ${formatDate(status.last_synced_at)}` : null
  }

  return (
    <View style={styles.platformCard}>
      <View style={styles.platformHeader}>
        <View style={styles.platformIconContainer}>
          {getPlatformIcon()}
        </View>
        <View style={styles.platformInfo}>
          <Text style={styles.platformName}>{getPlatformName()}</Text>
          <Text style={[
            styles.platformStatus,
            isConnected && styles.platformStatusConnected
          ]}>
            {getStatusText()}
          </Text>
          {isConnected && getLastSyncText() && (
            <Text style={styles.lastSync}>{getLastSyncText()}</Text>
          )}
          {isConnected && status?.matched_count !== undefined && (
            <Text style={styles.matchedCount}>
              {status.matched_count} matched to database
            </Text>
          )}
        </View>
      </View>

      <View style={styles.platformActionsContainer}>
        {/* Continue Logging button - show on its own row if there are unlogged games */}
        {isConnected && platform === 'playstation' && unloggedCount !== undefined && unloggedCount > 0 && onContinueLogging && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, styles.actionButtonFullWidth]}
            onPress={onContinueLogging}
            disabled={isLoading}
          >
            <Ionicons name="game-controller-outline" size={18} color={Colors.text} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Continue Logging ({unloggedCount} games)
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.platformActions}>
        {isConnected ? (
          <>
            {platform === 'playstation' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger, styles.actionButtonFullWidth]}
                onPress={onClear}
                disabled={isLoading}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            ) : onSync ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onSync}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={Colors.accent} />
                ) : (
                  <>
                    <Ionicons name="sync-outline" size={18} color={Colors.accent} />
                    <Text style={styles.actionButtonText}>Sync</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            {/* Clear Data for non-PlayStation platforms */}
            {platform !== 'playstation' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={onClear}
                disabled={isLoading}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={onConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color={Colors.text} />
            ) : (
              <>
                <Ionicons
                  name={platform === 'playstation' ? 'cloud-upload-outline' : 'link-outline'}
                  size={18}
                  color={Colors.text}
                />
                <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                  {platform === 'playstation' ? 'Import CSV' : 'Connect'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  )
}

export default function PlatformConnectionsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuth()
  const {
    isLoading,
    getSteamStatus,
    getSteamAuthUrl,
    syncSteamLibrary,
    clearSteamData,
    getPlayStationStatus,
    clearPlayStationData,
    getUnloggedImportedGames,
  } = usePlatformImport(user?.id)

  const [refreshing, setRefreshing] = useState(false)
  const [steamStatus, setSteamStatus] = useState<PlatformStatus | null>(null)
  const [playstationStatus, setPlaystationStatus] = useState<PlatformStatus | null>(null)
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null)
  const [playstationUnloggedGames, setPlaystationUnloggedGames] = useState<MatchedGame[]>([])

  const loadStatuses = async () => {
    const [steam, playstation, unloggedPS] = await Promise.all([
      getSteamStatus(),
      getPlayStationStatus(),
      getUnloggedImportedGames('playstation'),
    ])
    setSteamStatus(steam)
    setPlaystationStatus(playstation)
    setPlaystationUnloggedGames(unloggedPS)
  }

  // Load statuses when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadStatuses()
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStatuses()
    setRefreshing(false)
  }

  const handleSteamConnect = async () => {
    const authUrl = await getSteamAuthUrl()
    if (authUrl) {
      // Open in browser
      const canOpen = await Linking.canOpenURL(authUrl)
      if (canOpen) {
        await Linking.openURL(authUrl)
      } else {
        Alert.alert('Error', 'Cannot open Steam authentication page')
      }
    } else {
      Alert.alert('Error', 'Failed to get Steam authentication URL')
    }
  }

  const handleSteamSync = async () => {
    setSyncingPlatform('steam')
    const result = await syncSteamLibrary()

    if (result.success) {
      Alert.alert(
        'Sync Complete',
        `Imported ${result.imported} games\n${result.matched} matched to database`,
        [{ text: 'OK', onPress: loadStatuses }]
      )
    } else if (result.is_private) {
      Alert.alert(
        'Profile Private',
        'Your Steam profile appears to be private. Please make your game details public in Steam privacy settings and try again.',
        [{ text: 'OK' }]
      )
    } else {
      Alert.alert('Sync Failed', result.error || 'Failed to sync Steam library')
    }

    setSyncingPlatform(null)
  }

  const handleSteamClear = () => {
    Alert.alert(
      'Clear Steam Data',
      'This will remove all imported Steam games. You can re-sync anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const success = await clearSteamData()
            if (success) {
              Alert.alert('Cleared', 'Steam data has been removed')
              loadStatuses()
            } else {
              Alert.alert('Error', 'Failed to clear Steam data')
            }
          },
        },
      ]
    )
  }

  const handlePlayStationConnect = () => {
    navigation.navigate('PlayStationImport' as never)
  }

  const handlePlayStationContinueLogging = () => {
    // Navigate to PlayStation import screen with unlogged games
    navigation.navigate('PlayStationImport' as never, {
      continueLogging: true,
      unloggedGames: playstationUnloggedGames,
    } as never)
  }

  const handlePlayStationClear = () => {
    Alert.alert(
      'Clear PlayStation Data',
      'This will remove all imported PlayStation games. You can import again anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const success = await clearPlayStationData()
            if (success) {
              Alert.alert('Cleared', 'PlayStation data has been removed')
              loadStatuses()
            } else {
              Alert.alert('Error', 'Failed to clear PlayStation data')
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IMPORT GAMES</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        <Text style={styles.description}>
          Import your game libraries from other platforms. Your playtime and achievements will be tracked separately from your Sweaty game logs.
        </Text>

        {/* Steam */}
        <PlatformCard
          platform="steam"
          status={steamStatus}
          isLoading={syncingPlatform === 'steam'}
          onConnect={handleSteamConnect}
          onSync={handleSteamSync}
          onClear={handleSteamClear}
        />

        {/* PlayStation */}
        <PlatformCard
          platform="playstation"
          status={playstationStatus}
          isLoading={false}
          onConnect={handlePlayStationConnect}
          onClear={handlePlayStationClear}
          onContinueLogging={handlePlayStationContinueLogging}
          unloggedCount={playstationUnloggedGames.length}
        />

        {/* Xbox - Coming Soon */}
        <View style={[styles.platformCard, styles.platformCardDisabled]}>
          <View style={styles.platformHeader}>
            <View style={styles.platformIconContainer}>
              <MaterialCommunityIcons name="microsoft-xbox" size={32} color="#107C10" />
            </View>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>Xbox</Text>
              <Text style={styles.platformStatusDisabled}>Coming soon</Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textDim} />
          <Text style={styles.infoText}>
            Imported games are separate from your game logs. Use them to track your full gaming history across platforms.
          </Text>
        </View>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  platformCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  platformCardDisabled: {
    opacity: 0.6,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  platformIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  platformStatus: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  platformStatusConnected: {
    color: Colors.accent,
  },
  platformStatusDisabled: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  lastSync: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  matchedCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  platformActionsContainer: {
    gap: Spacing.sm,
  },
  platformActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButtonFullWidth: {
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  actionButtonDanger: {
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  actionButtonTextPrimary: {
    color: Colors.text,
  },
  actionButtonTextDanger: {
    color: Colors.error,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  comingSoonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  infoText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    lineHeight: 20,
  },
})
