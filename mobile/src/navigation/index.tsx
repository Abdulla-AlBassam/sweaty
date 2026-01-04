import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { View } from 'react-native'
import { Colors } from '../constants/colors'
import LoadingSpinner from '../components/LoadingSpinner'

// Screens
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
import NewsScreen from '../screens/NewsScreen'
import WebViewScreen from '../screens/WebViewScreen'
import AdminHeroBannersScreen from '../screens/AdminHeroBannersScreen'
import AdminCuratedListsScreen from '../screens/AdminCuratedListsScreen'

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
  AIRecommend: undefined
  PlatformConnections: undefined
  PlayStationImport: undefined
  News: undefined
  WebView: { url: string; title: string }
  // Admin routes (developer only)
  AdminHeroBanners: undefined
  AdminCuratedLists: undefined
}

const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()

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
        name="News"
        component={NewsScreen}
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
    </MainStack.Navigator>
  )
}

export default function Navigation() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <LoadingSpinner size="large" color={Colors.accent} />
      </View>
    )
  }

  return user ? <MainNavigator /> : <AuthNavigator />
}
