import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'
import { Colors } from '../constants/colors'

// Screens
import LoginScreen from '../screens/LoginScreen'
import SignupScreen from '../screens/SignupScreen'
import DashboardScreen from '../screens/DashboardScreen'

// Types
export type AuthStackParamList = {
  Login: undefined
  Signup: undefined
}

export type MainStackParamList = {
  Dashboard: undefined
  // Add more screens later: Search, Profile, GameDetail, etc.
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
      <MainStack.Screen name="Dashboard" component={DashboardScreen} />
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
