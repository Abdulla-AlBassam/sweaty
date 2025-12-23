import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Colors } from '../constants/colors'

// Screens
import DashboardScreen from '../screens/DashboardScreen'
import SearchScreen from '../screens/SearchScreen'
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

// Simple icon components using text/emoji (can be replaced with vector icons later)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Search: '🔍',
    Add: '➕',
    Activity: '🔔',
    Profile: '👤',
  }

  return (
    <View style={[styles.iconContainer, name === 'Add' && styles.addIconContainer]}>
      <Text style={[
        styles.icon,
        { color: focused ? Colors.accent : Colors.textDim },
        name === 'Add' && styles.addIcon,
      ]}>
        {icons[name]}
      </Text>
    </View>
  )
}

// Placeholder for Add screen (opens modal)
function AddPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Quick Log Coming Soon</Text>
    </View>
  )
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
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
        component={AddPlaceholder}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="Add" focused={focused} />,
          tabBarLabel: '',
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
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  addIconContainer: {
    backgroundColor: Colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  addIcon: {
    color: Colors.background,
    fontSize: 24,
  },
  placeholder: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
})
