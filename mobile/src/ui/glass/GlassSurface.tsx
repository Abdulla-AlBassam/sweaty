import { BlurView } from 'expo-blur'
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { GlassTokens, GlassIntensity, GlassRole } from './tokens'

type Props = {
  intensity?: GlassIntensity
  role?: GlassRole
  radius?: number
  bordered?: boolean
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export function GlassSurface({
  intensity = 'medium',
  role = 'chrome',
  radius = GlassTokens.radius.card,
  bordered = true,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.wrapper, { borderRadius: radius }, style]}>
      <BlurView
        intensity={GlassTokens.blur[intensity]}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: GlassTokens.tint[role], borderRadius: radius },
        ]}
      />
      {bordered && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: GlassTokens.stroke.edge,
            },
          ]}
        />
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
})
