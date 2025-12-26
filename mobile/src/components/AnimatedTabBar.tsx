import React, { useRef, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons'
import { Colors } from '../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuickLog } from '../contexts/QuickLogContext'

const SCREEN_WIDTH = Dimensions.get('window').width
const TAB_COUNT = 5
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT

// Icon configuration for each tab
type IconConfig = {
  library: 'Feather' | 'FontAwesome5' | 'Ionicons'
  name: string
}

const iconMap: Record<string, IconConfig> = {
  Home: { library: 'Feather', name: 'home' },
  Search: { library: 'FontAwesome5', name: 'search' },
  Add: { library: 'Ionicons', name: 'add-circle' },
  Activity: { library: 'Feather', name: 'activity' },
  Profile: { library: 'Ionicons', name: 'person' },
}

// Render icon based on library
const renderIcon = (config: IconConfig, size: number, color: string) => {
  switch (config.library) {
    case 'Feather':
      return <Feather name={config.name as keyof typeof Feather.glyphMap} size={size} color={color} />
    case 'FontAwesome5':
      return <FontAwesome5 name={config.name as keyof typeof FontAwesome5.glyphMap} size={size} color={color} />
    case 'Ionicons':
    default:
      return <Ionicons name={config.name as keyof typeof Ionicons.glyphMap} size={size} color={color} />
  }
}

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { openQuickLog } = useQuickLog()
  const translateX = useRef(new Animated.Value(0)).current

  // Calculate initial position on mount and when state changes
  useEffect(() => {
    // Find the actual visual index (excluding Add tab from bubble animation)
    const currentIndex = state.index

    // Animate to new position
    Animated.spring(translateX, {
      toValue: currentIndex * TAB_WIDTH,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start()
  }, [state.index])

  const handleTabPress = (route: { name: string; key: string }, index: number) => {
    // Handle Add button specially - open QuickLog modal
    if (route.name === 'Add') {
      openQuickLog()
      return
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    })

    if (!event.defaultPrevented) {
      navigation.navigate(route.name)
    }
  }

  const handleTabLongPress = (route: { key: string }) => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    })
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
      {/* Animated bubble indicator - hidden for Add tab */}
      {state.index !== 2 && (
        <Animated.View
          style={[
            styles.bubble,
            {
              transform: [{ translateX }],
              width: TAB_WIDTH,
            },
          ]}
        >
          <View style={styles.bubbleInner} />
        </Animated.View>
      )}

      {/* Tab buttons */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const isFocused = state.index === index
          const isAddTab = route.name === 'Add'

          const iconConfig = iconMap[route.name]

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => handleTabPress(route, index)}
              onLongPress={() => handleTabLongPress(route)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              {isAddTab ? (
                // Special Add button with green circle
                <View style={styles.addButton}>
                  <Ionicons name="add" size={22} color={Colors.background} />
                </View>
              ) : (
                // Regular tab icon
                <Animated.View style={styles.iconContainer}>
                  {iconConfig && renderIcon(iconConfig, 22, isFocused ? Colors.text : Colors.textDim)}
                </Animated.View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    top: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleInner: {
    width: 52,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 52,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: Colors.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    // Subtle shadow for elevation
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
})
