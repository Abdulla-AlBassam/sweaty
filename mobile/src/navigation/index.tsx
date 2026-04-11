import React, { useCallback, useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../constants/colors'
import LoadingSpinner from '../components/LoadingSpinner'

// Screens
import OnboardingScreen, { ONBOARDING_STORAGE_KEY } from '../screens/OnboardingScreen'
import PersonalisationScreen from '../screens/PersonalisationScreen'
import PaywallScreen, { PAYWALL_STORAGE_KEY } from '../screens/PaywallScreen'
import LoginScreen from '../screens/LoginScreen'
import SignupScreen from '../screens/SignupScreen'
import MainTabs from './MainTabs'
import GameDetailScreen from '../screens/GameDetailScreen'
import UserProfileScreen from '../screens/UserProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'
import CuratedListDetailScreen from '../screens/CuratedListDetailScreen'
import ListDetailScreen from '../screens/ListDetailScreen'
import AIRecommendScreen from '../screens/AIRecommendScreen'
import PlatformConnectionsScreen from '../screens/PlatformConnectionsScreen'
import PlayStationImportScreen from '../screens/PlayStationImportScreen'
import WatchScreen from '../screens/WatchScreen'
import WebViewScreen from '../screens/WebViewScreen'
import AllReviewsScreen from '../screens/AllReviewsScreen'
import ReviewDetailScreen from '../screens/ReviewDetailScreen'
import AdminHeroBannersScreen from '../screens/AdminHeroBannersScreen'
import AdminCuratedListsScreen from '../screens/AdminCuratedListsScreen'
import LibraryStatusScreen from '../screens/LibraryStatusScreen'
import RankProgressScreen from '../screens/RankProgressScreen'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

// Types
export type AuthStackParamList = {
  Login: undefined
  Signup: undefined
}

export type MainStackParamList = {
  MainTabs: undefined
  GameDetail: { gameId: number }
  UserProfile: { username: string; userId?: string }
  Settings: undefined
  CuratedListDetail: {
    listSlug: string
    listTitle: string
    gameIds: number[]
    // Optional: pass full game data to skip games_cache fetch (for recommendations)
    games?: Array<{ id: number; name: string; coverUrl: string | null }>
  }
  ListDetail: { listId: string }
  AllReviews: { gameId: number; gameName: string }
  ReviewDetail: { gameLogId: string; gameName: string; gameId: number; coverUrl?: string }
  AIRecommend: undefined
  PlatformConnections: undefined
  PlayStationImport: undefined
  Watch: { initialTab?: 'all' | 'videos' | 'news' } | undefined
  WebView: { url: string; title: string }
  LibraryStatus: { userId: string; status: string }
  RankProgress: undefined
  // Admin / onboarding previews (developer only)
  AdminHeroBanners: undefined
  AdminCuratedLists: undefined
  PersonalisationPreview: undefined
  PaywallPreview: undefined
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()

function PersonalisationPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  return <PersonalisationScreen previewMode onFinish={() => navigation.goBack()} />
}

function PaywallPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  return <PaywallScreen onFinish={() => navigation.goBack()} />
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  )
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="CuratedListDetail"
        component={CuratedListDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="AllReviews"
        component={AllReviewsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="ReviewDetail"
        component={ReviewDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="AIRecommend"
        component={AIRecommendScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name="PlatformConnections"
        component={PlatformConnectionsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="PlayStationImport"
        component={PlayStationImportScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="Watch"
        component={WatchScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="WebView"
        component={WebViewScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name="LibraryStatus"
        component={LibraryStatusScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="RankProgress"
        component={RankProgressScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Admin screens (developer only) */}
      <MainStack.Screen
        name="AdminHeroBanners"
        component={AdminHeroBannersScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <MainStack.Screen
        name="AdminCuratedLists"
        component={AdminCuratedListsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* Onboarding previews (developer only — not part of the gated flow) */}
      <MainStack.Screen
        name="PersonalisationPreview"
        component={PersonalisationPreviewScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name="PaywallPreview"
        component={PaywallPreviewScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
    </MainStack.Navigator>
  )
}

function AuthedArea() {
  const { profile } = useAuth()
  const [hasSeenPaywall, setHasSeenPaywall] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(PAYWALL_STORAGE_KEY)
      .then((value) => setHasSeenPaywall(value === 'true'))
      .catch(() => setHasSeenPaywall(false))
  }, [])

  const handlePaywallFinish = useCallback(async () => {
    await AsyncStorage.setItem(PAYWALL_STORAGE_KEY, 'true')
    setHasSeenPaywall(true)
  }, [])

  if (!profile || hasSeenPaywall === null) {
    return <CenteredSpinner />
  }

  const needsPersonalisation =
    !profile.gaming_platforms || profile.gaming_platforms.length === 0

  if (needsPersonalisation) {
    // PersonalisationScreen calls refreshProfile() internally before onFinish,
    // so once it finishes the profile gains platforms and we fall through
    // to the paywall check on the next render.
    return <PersonalisationScreen onFinish={async () => { /* no-op: profile refresh re-renders */ }} />
  }

  if (!hasSeenPaywall) {
    return <PaywallScreen onFinish={handlePaywallFinish} />
  }

  return <MainNavigator />
}

function CenteredSpinner() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
      }}
    >
      <LoadingSpinner size="large" color={Colors.accent} />
    </View>
  )
}

export default function Navigation() {
  const { user, isLoading } = useAuth()
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false))
  }, [])

  const handleOnboardingFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setHasSeenOnboarding(true)
  }, [])

  if (isLoading || hasSeenOnboarding === null) {
    return <CenteredSpinner />
  }

  // Onboarding tour sits above the auth check so it shows on first launch
  // regardless of whether the user happens to already be signed in.
  if (!hasSeenOnboarding) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />
  }

  return user ? <AuthedArea /> : <AuthNavigator />
}
