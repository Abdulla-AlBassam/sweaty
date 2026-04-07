import React from 'react'
import { Text, TextStyle, StyleProp, Platform } from 'react-native'
import { Fonts } from '../constants/fonts'

interface FormattedTextProps {
  children: string
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}

type SegmentType = 'plain' | 'bold' | 'italic' | 'boldItalic'

interface Segment {
  text: string
  type: SegmentType
}

function parseFormatting(input: string): Segment[] {
  const segments: Segment[] = []
  // Order: *** first, then **, then * to avoid partial matches
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/gs
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), type: 'plain' })
    }

    if (match[2]) {
      segments.push({ text: match[2], type: 'boldItalic' })
    } else if (match[3]) {
      segments.push({ text: match[3], type: 'bold' })
    } else if (match[4]) {
      segments.push({ text: match[4], type: 'italic' })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), type: 'plain' })
  }

  return segments
}

function getSegmentStyle(type: SegmentType): TextStyle {
  switch (type) {
    case 'bold':
      return { fontFamily: Fonts.bodyBold }
    case 'italic':
      return { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontStyle: 'italic' }
    case 'boldItalic':
      return { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: 'bold', fontStyle: 'italic' }
    default:
      return {}
  }
}

export default function FormattedText({ children, style, numberOfLines }: FormattedTextProps) {
  if (!children) return null

  const segments = parseFormatting(children)

  if (segments.length === 1 && segments[0].type === 'plain') {
    return <Text style={style} numberOfLines={numberOfLines}>{children}</Text>
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, i) => {
        if (segment.type === 'plain') {
          return <Text key={i}>{segment.text}</Text>
        }
        return (
          <Text key={i} style={getSegmentStyle(segment.type)}>
            {segment.text}
          </Text>
        )
      })}
    </Text>
  )
}
