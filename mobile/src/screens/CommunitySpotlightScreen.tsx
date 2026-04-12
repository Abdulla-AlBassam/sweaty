import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import PressableScale from '../components/PressableScale'
import { useCommunitySpotlight, SpotlightUser } from '../hooks/useCommunitySpotlight'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import type { MainStackParamList } from '../navigation'

type Nav = NativeStackNavigationProp<MainStackParamList>
type TabKey = 'supporters' | 'streak' | 'rank'

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'supporters', label: 'SUPPORTERS' },
  { key: 'streak', label: 'STREAK' },
  { key: 'rank', label: 'RANK' },
]

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = Spacing.screenPadding
const COLUMNS = 5
const ITEM_GAP = 10
const ROW_GAP = 14
const ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_GAP * (COLUMNS - 1)) / COLUMNS
)
const BADGE_SIZE = 24

export default function CommunitySpotlightScreen() {
  const navigation = useNavigation<Nav>()
  const {
    supporters,
    streakLeaders,
    rankLeaders,
    isLoading,
    error,
    refetch,
  } = useCommunitySpotlight()

  const [activeTab, setActiveTab] = useState<TabKey>('supporters')

  const data = useMemo(() => {
    if (activeTab === 'supporters') return supporters
    if (activeTab === 'streak') return streakLeaders
    return rankLeaders
  }, [activeTab, supporters, streakLeaders, rankLeaders])

  const handleUserPress = useCallback(
    (user: SpotlightUser) => {
      navigation.navigate('UserProfile', {
        username: user.username,
        userId: user.id,
      })
    },
    [navigation]
  )

  const renderItem = useCallback(
    ({ item, index }: { item: SpotlightUser; index: number }) => (
      <AvatarTile user={item} place={index + 1} onPress={handleUserPress} />
    ),
    [handleUserPress]
  )

  const keyExtractor = useCallback((item: SpotlightUser) => item.id, [])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          containerStyle={styles.backButton}
          haptic="light"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>COMMUNITY SPOTLIGHT</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.cream}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

interface AvatarTileProps {
  user: SpotlightUser
  place: number
  onPress: (user: SpotlightUser) => void
}

function AvatarTile({ user, place, onPress }: AvatarTileProps) {
  const initial = (user.display_name || user.username || '?')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <PressableScale
      onPress={() => onPress(user)}
      haptic="light"
      containerStyle={styles.tileWrapper}
      accessibilityRole="button"
      accessibilityLabel={`${user.display_name || user.username}, place ${place}`}
    >
      <View style={styles.avatarContainer}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
        )}
        <View style={styles.placeBadge}>
          <Text
            style={styles.placeBadgeText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {place}
          </Text>
        </View>
      </View>
    </PressableScale>
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
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: 'rgba(192, 200, 208, 0.08)',
  },
  tabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.cream,
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Spacing.xxxl,
  },
  columnWrapper: {
    gap: ITEM_GAP,
    marginBottom: ROW_GAP,
  },
  tileWrapper: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  avatarContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    position: 'relative',
  },
  avatar: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  avatarLetter: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  placeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  placeBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs + 2,
    color: Colors.text,
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  emptyState: {
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
})
