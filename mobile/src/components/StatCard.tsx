import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'

interface StatCardProps {
  label: string
  value: string | number
  icon?: string
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>
        {icon && `${icon} `}
        {value}
      </Text>
      <Text style={styles.label}>{label.toLowerCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.accentLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
