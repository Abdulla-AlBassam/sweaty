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
import GlitchAddButton from './GlitchAddButton'
import { GlassSurface, GlassTokens } from '../ui/glass'

const SCREEN_WIDTH = Dimensions.get('window').width
const SIDE_MARGIN = 16
const PILL_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2
const TAB_COUNT = 5
const TAB_WIDTH = PILL_WIDTH / TAB_COUNT
const PILL_HEIGHT = 64
const PILL_TOP_GAP = 10

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

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start()
  }, [state.index])

  const handleTabPress = (route: { name: string; key: string }, index: number) => {
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

  const bottomInset = insets.bottom > 0 ? insets.bottom : 12
  const reservedHeight = PILL_HEIGHT + bottomInset + PILL_TOP_GAP

  return (
    <View style={[styles.outer, { height: reservedHeight }]}>
      <View
        style={[
          styles.floater,
          {
            bottom: bottomInset,
            paddingHorizontal: SIDE_MARGIN,
          },
        ]}
        pointerEvents="box-none"
      >
        <GlassSurface
          intensity="heavy"
          role="chrome"
          radius={PILL_HEIGHT / 2}
          style={styles.pill}
        >
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
                  accessibilityHint={
                    route.name === 'Add'
                      ? 'Opens quick game log'
                      : 'Navigates to ' + route.name + ' tab'
                  }
                  onPress={() => handleTabPress(route, index)}
                  onLongPress={() => handleTabLongPress(route)}
                  style={styles.tab}
                  activeOpacity={0.7}
                >
                  {isAddTab ? (
                    <GlitchAddButton onPress={() => handleTabPress(route, index)} />
                  ) : (
                    <View style={styles.iconContainer}>
                      {iconConfig &&
                        renderIcon(iconConfig, 22, isFocused ? Colors.cream : Colors.textDim)}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </GlassSurface>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.background,
  },
  floater: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    top: (PILL_HEIGHT - 44) / 2,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleInner: {
    width: 52,
    height: 36,
    borderRadius: 18,
    backgroundColor: GlassTokens.stroke.active,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: PILL_HEIGHT,
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
})
