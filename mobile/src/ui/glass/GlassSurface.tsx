import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { GlassSurfaceNativeView } from '../../../modules/glass-surface-native/src'
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
  role = 'chrome',
  radius = GlassTokens.radius.card,
  bordered = true,
  style,
  children,
}: Props) {
  return (
    <View style={[styles.wrapper, { borderRadius: radius }, style]}>
      <GlassSurfaceNativeView
        style={StyleSheet.absoluteFill}
        cornerRadius={radius}
        tintColor={GlassTokens.tint[role]}
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
