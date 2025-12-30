import React from 'react'
import { View, StyleSheet } from 'react-native'
import SweatDropIcon from './SweatDropIcon'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
}

/**
 * Loading spinner using SweatDropIcon with loading pulse animation
 * Features RGB chromatic aberration glitch effect
 */
export default function LoadingSpinner({
  size = 'small',
}: LoadingSpinnerProps) {
  const iconSize = size === 'small' ? 22 : 36

  return (
    <View style={styles.container}>
      <SweatDropIcon size={iconSize} variant="loading" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
