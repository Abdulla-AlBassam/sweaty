import { requireNativeView } from 'expo'
import { ViewProps } from 'react-native'

export type GlassSurfaceNativeProps = ViewProps & {
  cornerRadius?: number
  tintColor?: string | null
}

export const GlassSurfaceNativeView =
  requireNativeView<GlassSurfaceNativeProps>('GlassSurfaceNative')
