import { ViewStyle, StyleProp } from 'react-native'
import { GlassSurface } from './GlassSurface'
import { GlassTokens } from './tokens'

type Props = {
  height?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export function GlassCapsule({ height = 44, style, children }: Props) {
  return (
    <GlassSurface
      intensity="medium"
      role="capsule"
      radius={GlassTokens.radius.capsule}
      style={[{ height, justifyContent: 'center', paddingHorizontal: 16 }, style]}
    >
      {children}
    </GlassSurface>
  )
}
