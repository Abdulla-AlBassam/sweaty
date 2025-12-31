import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, BorderRadius, Glow } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface TerminalCardProps {
  title?: string
  children: React.ReactNode
  style?: ViewStyle
  showDots?: boolean
  showBorder?: boolean
}

export default function TerminalCard({
  title,
  children,
  style,
  showDots = true,
  showBorder = true,
}: TerminalCardProps) {
  return (
    <View style={[styles.container, showBorder && styles.borderGlow, style]}>
      <LinearGradient
        colors={[Colors.surfaceLight, Colors.surface, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Terminal header */}
        {(showDots || title) && (
          <View style={styles.header}>
            {showDots && (
              <View style={styles.dots}>
                <View style={[styles.dot, styles.dotRed]} />
                <View style={[styles.dot, styles.dotYellow]} />
                <View style={[styles.dot, styles.dotGreen]} />
              </View>
            )}
            {title && <Text style={styles.title}>{title}</Text>}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>{children}</View>

        {/* Inner border glow */}
        <View style={styles.innerBorder} />
      </LinearGradient>
    </View>
  )
}

// Terminal-style section header component
export function TerminalSectionHeader({ title }: { title: string }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.bracket}>[</Text>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.bracket}>]</Text>
      <View style={sectionStyles.line} />
    </View>
  )
}

// Terminal-style status line
export function TerminalStatus({
  status = 'OK',
  message,
}: {
  status?: 'OK' | 'WARN' | 'ERR'
  message: string
}) {
  const statusColor =
    status === 'OK' ? Colors.accent : status === 'WARN' ? Colors.warning : Colors.error

  return (
    <View style={statusStyles.container}>
      <Text style={statusStyles.bracket}>[</Text>
      <Text style={[statusStyles.status, { color: statusColor }]}>{status}</Text>
      <Text style={statusStyles.bracket}>]</Text>
      <Text style={statusStyles.message}> {message}</Text>
    </View>
  )
}

// Terminal prompt line
export function TerminalPrompt({ command }: { command: string }) {
  return (
    <View style={promptStyles.container}>
      <Text style={promptStyles.prompt}>{'>'}</Text>
      <Text style={promptStyles.command}>{command}</Text>
      <Text style={promptStyles.cursor}>_</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  borderGlow: {
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    ...Glow.subtle,
  },
  gradient: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + '20',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginRight: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotRed: {
    backgroundColor: '#ff5f57',
  },
  dotYellow: {
    backgroundColor: '#ffbd2e',
  },
  dotGreen: {
    backgroundColor: Colors.accent,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textDim,
    textTransform: 'lowercase',
  },
  content: {
    padding: Spacing.md,
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '15',
    pointerEvents: 'none',
  },
})

const sectionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bracket: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.textDim,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginHorizontal: 4,
    ...Glow.text,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.accent + '30',
    marginLeft: Spacing.sm,
  },
})

const statusStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bracket: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
  },
  status: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  message: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
})

const promptStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prompt: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.accent,
    marginRight: 8,
    ...Glow.text,
  },
  command: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.accent,
    letterSpacing: 1,
    ...Glow.text,
  },
  cursor: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    color: Colors.accent,
    marginLeft: 2,
  },
})
