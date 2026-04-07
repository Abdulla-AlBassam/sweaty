import React from 'react'
import { Text, TextStyle } from 'react-native'

interface GlitchTextProps {
  text: string
  style?: TextStyle
  intensity?: 'subtle' | 'medium' | 'heavy'
}

/**
 * Simple text component. Previously rendered RGB glitch effects;
 * now just renders clean text, matching the "quiet confidence" brand.
 * Props kept for API compatibility with callers.
 */
export default function GlitchText({
  text,
  style,
}: GlitchTextProps) {
  return <Text style={style}>{text}</Text>
}
