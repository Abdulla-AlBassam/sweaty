import React from 'react'
import { Text, TextStyle } from 'react-native'

interface GlitchTextProps {
  text: string
  style?: TextStyle
  intensity?: 'subtle' | 'medium' | 'heavy'
}

/** Plain text; the `intensity` prop is accepted but ignored for API compatibility. */
export default function GlitchText({
  text,
  style,
}: GlitchTextProps) {
  return <Text style={style}>{text}</Text>
}
