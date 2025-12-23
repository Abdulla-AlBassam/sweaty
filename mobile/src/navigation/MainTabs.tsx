import React from 'react'
import { View, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

// Screens
import DashboardScreen from '../screens/DashboardScreen'
import SearchScreen from '../screens/SearchScreen'
import QuickLogScreen from '../screens/QuickLogScreen'
import ActivityScreen from '../screens/ActivityScreen'
import ProfileScreen from '../screens/ProfileScreen'

export type MainTabsParamList = {
  Home: undefined
  Search: undefined
  Add: undefined
  Activity: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<MainTabsParamList>()

type IconName = keyof typeof Ionicons.glyphMap

// Tab icon component using Ionicons
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap: Record<string, { outline: IconName; filled: IconName }> = {
    Home: { outline: 'home-outline', filled: 'home' },
    Search: { outline: 'search-outline', filled: 'search' },
    Activity: { outline: 'notifications-outline', filled: 'notifications' },
    Profile: { outline: 'person-outline', filled: 'person' },
  }

  const icons = iconMap[name]
  if (!icons) return null

  return (
    <Ionicons
      name={focused ? icons.filled : icons.outline}
      size={24}
      color={focused ? Colors.accent : Colors.textDim}
    />
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textDim,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Search" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Add"
        component={QuickLogScreen}
        options={{
          tabBarIcon: () => <AddTabIcon />,
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Activity" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
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
