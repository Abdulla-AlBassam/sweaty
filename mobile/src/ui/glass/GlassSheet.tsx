import { ViewStyle, StyleProp } from 'react-native'
import { GlassSurface } from './GlassSurface'
import { GlassTokens } from './tokens'

type Props = {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

export function GlassSheet({ style, children }: Props) {
  return (
    <GlassSurface
      intensity="heavy"
      role="sheet"
      radius={GlassTokens.radius.sheet}
      style={[
        {
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: 32,
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  )
}
