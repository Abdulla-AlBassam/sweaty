import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'
import { Colors } from '../constants/colors'

// Screens
import LoginScreen from '../screens/LoginScreen'
import SignupScreen from '../screens/SignupScreen'
import MainTabs from './MainTabs'
import GameDetailScreen from '../screens/GameDetailScreen'
import UserProfileScreen from '../screens/UserProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'
import CuratedListDetailScreen from '../screens/CuratedListDetailScreen'

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
  CuratedListDetail: { listSlug: string; listTitle: string; gameIds: number[] }
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
    </MainStack.Navigator>
  )
}

export default function Navigation() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  return user ? <MainNavigator /> : <AuthNavigator />
}
