import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface HeartIconProps {
  size?: number
  color?: string
  filled?: boolean
  strokeWidth?: number
}

const HEART_PATH =
  'M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z'

export default function HeartIcon({ size = 22, color = '#FFFFFF', filled = false, strokeWidth = 2 }: HeartIconProps) {
  return (
    <Svg width={size} height={size} viewBox="1 2 22 20" fill="none">
      <Path
        d={HEART_PATH}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  )
}
