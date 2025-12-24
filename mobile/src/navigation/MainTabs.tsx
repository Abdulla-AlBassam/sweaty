import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { Colors } from '../constants/colors'
import { useQuickLog } from '../contexts/QuickLogContext'

// Screens
import DashboardScreen from '../screens/DashboardScreen'
import SearchScreen from '../screens/SearchScreen'
import ActivityScreen from '../screens/ActivityScreen'
import ProfileScreen from '../screens/ProfileScreen'

// Placeholder component for Add tab (never rendered, modal opens instead)
function EmptyScreen() {
  return null
}

export type MainTabsParamList = {
  Home: undefined
  Search: undefined
  Add: undefined
  Activity: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabsParamList>()

type IconName = keyof typeof Ionicons.glyphMap

// Animated tab icon component with bounce effect
function AnimatedTabIcon({ name, focused }: { name: string; focused: boolean }) {
  const scale = useSharedValue(1)

  const iconMap: Record<string, { outline: IconName; filled: IconName }> = {
    Home: { outline: 'home-outline', filled: 'home' },
    Search: { outline: 'search-outline', filled: 'search' },
    Activity: { outline: 'notifications-outline', filled: 'notifications' },
    Profile: { outline: 'person-outline', filled: 'person' },
  }

  const icons = iconMap[name]
  if (!icons) return null

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  // Trigger bounce animation when focused changes to true
  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 8, stiffness: 300 })
      )
    }
  }, [focused, scale])

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={focused ? icons.filled : icons.outline}
        size={24}
        color={focused ? Colors.accentLight : Colors.textDim}
      />
    </Animated.View>
  )
}

// Add button with green circle
function AddTabIcon() {
  return (
    <View style={styles.addIconContainer}>
      <Ionicons name="add" size={28} color={Colors.background} />
    </View>
  )
}


export default function MainTabs() {
  const { openQuickLog } = useQuickLog()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textDim,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon name="Search" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={EmptyScreen}
        options={{
          tabBarIcon: () => <AddTabIcon />,
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default navigation
            e.preventDefault()
            // Open the quick log modal instead
            openQuickLog()
          },
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon name="Activity" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <AnimatedTabIcon name="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  addIconContainer: {
    backgroundColor: Colors.accent,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
})
