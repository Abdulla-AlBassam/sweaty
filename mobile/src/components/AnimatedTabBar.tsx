import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons'
import { Colors, Glow } from '../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuickLog } from '../contexts/QuickLogContext'

// Glitchy Add Button Component with burst animation
function GlitchAddButton({ onPress }: { onPress: () => void }) {
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const scaleAnim = useRef(new Animated.Value(1)).current
  const rotationAnim = useRef(new Animated.Value(0)).current

  // Burst animation values
  const burstScale = useRef(new Animated.Value(1)).current
  const cyanBurst = useRef(new Animated.Value(0)).current
  const greenBurst = useRef(new Animated.Value(0)).current
  const pinkBurst = useRef(new Animated.Value(0)).current

  // Glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 3,
        })

        // Scale flicker
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95 + Math.random() * 0.15,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
        ]).start()

        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 60 + Math.random() * 80)
      }
    }, 300)

    return () => clearInterval(glitchInterval)
  }, [scaleAnim])

  // Handle press with burst animation
  const handlePress = () => {
    // Play burst animation
    Animated.parallel([
      // Scale: grow big, shrink small, normalize
      Animated.sequence([
        Animated.timing(burstScale, {
          toValue: 1.4,
          duration: 100,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(burstScale, {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(burstScale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]),
      // Rotation: quick spin
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Cyan layer burst outward (left-up)
      Animated.sequence([
        Animated.timing(cyanBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cyanBurst, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Green layer burst outward (right-down)
      Animated.sequence([
        Animated.timing(greenBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(greenBurst, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Pink glow pulse
      Animated.sequence([
        Animated.timing(pinkBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pinkBurst, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    // Call onPress after a slight delay for visual feedback
    setTimeout(() => {
      onPress()
    }, 80)
  }

  // Interpolations for burst animation
  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  const cyanBurstX = cyanBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  })

  const cyanBurstY = cyanBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  const cyanBurstOpacity = cyanBurst.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.9, 0],
  })

  const greenBurstX = greenBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  })

  const greenBurstY = greenBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  })

  const greenBurstOpacity = greenBurst.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.9, 0],
  })

  const pinkGlowScale = pinkBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  })

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.addButtonContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, burstScale) },
              { rotate: rotationInterpolate },
            ],
          },
        ]}
      >
        {/* Cyan layer with burst (offset left) */}
        <Animated.View
          style={[
            styles.addButtonLayer,
            styles.addButtonCyan,
            {
              opacity: cyanBurstOpacity,
              transform: [
                {
                  translateX: Animated.add(
                    cyanBurstX,
                    isGlitching ? -2 + glitchOffset.x : -1.5
                  ),
                },
                {
                  translateY: Animated.add(
                    cyanBurstY,
                    isGlitching ? glitchOffset.y : 0
                  ),
                },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>

        {/* Green layer with burst (offset right) */}
        <Animated.View
          style={[
            styles.addButtonLayer,
            styles.addButtonGreen,
            {
              opacity: greenBurstOpacity,
              transform: [
                {
                  translateX: Animated.add(
                    greenBurstX,
                    isGlitching ? 2 - glitchOffset.x : 1.5
                  ),
                },
                {
                  translateY: Animated.add(
                    greenBurstY,
                    isGlitching ? -glitchOffset.y : 0
                  ),
                },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>

        {/* Main white button */}
        <Animated.View
          style={[
            styles.addButtonMain,
            {
              transform: [{ scale: pinkGlowScale }],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  )
}

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
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : 4 }]}>
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
                // Special Add button with RGB glitch effect
                <GlitchAddButton onPress={() => handleTabPress(route, index)} />
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
  // Glitch Add Button styles
  addButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  addButtonLayer: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCyan: {
    backgroundColor: Colors.cyan,
    opacity: 0.7,
  },
  addButtonGreen: {
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },
  addButtonMain: {
    backgroundColor: Colors.text,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
