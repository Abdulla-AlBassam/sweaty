import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native'
import YoutubePlayer from 'react-native-youtube-iframe'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

interface Video {
  videoId: string
  name: string
}

interface TrailerSectionProps {
  videos: Video[]
}

export default function TrailerSection({ videos }: TrailerSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  console.log('=== TRAILER SECTION ===')
  console.log('Videos received:', videos?.length || 0)
  if (videos?.length > 0) {
    console.log('First video:', videos[0].videoId, videos[0].name)
  }

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setPlaying(false)
    }
  }, [])

  if (!videos || videos.length === 0) {
    console.log('TrailerSection: No videos, returning null')
    return null
  }

  const screenWidth = Dimensions.get('window').width
  const playerWidth = screenWidth - (Spacing.lg * 2)
  const playerHeight = playerWidth * (9 / 16) // 16:9 aspect ratio

  const currentVideo = videos[selectedIndex]

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>trailers</Text>

      {/* YouTube Player */}
      <View style={styles.playerContainer}>
        <YoutubePlayer
          height={playerHeight}
          width={playerWidth}
          videoId={currentVideo.videoId}
          play={playing}
          onChangeState={onStateChange}
          webViewProps={{
            allowsInlineMediaPlayback: true,
          }}
        />
      </View>

      {/* Video title */}
      <Text style={styles.videoTitle}>{currentVideo.name || 'trailer'}</Text>

      {/* Video selector if multiple trailers */}
      {videos.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.videoSelectorScroll}
          contentContainerStyle={styles.videoSelectorContent}
        >
          {videos.map((video, index) => (
            <TouchableOpacity
              key={video.videoId}
              style={[
                styles.selectorButton,
                index === selectedIndex && styles.selectorButtonActive,
              ]}
              onPress={() => {
                setSelectedIndex(index)
                setPlaying(false)
              }}
            >
              <Ionicons
                name="play-circle"
                size={16}
                color={index === selectedIndex ? Colors.background : Colors.textMuted}
              />
              <Text
                style={[
                  styles.selectorText,
                  index === selectedIndex && styles.selectorTextActive,
                ]}
                numberOfLines={1}
              >
                {video.name || `trailer ${index + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  playerContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  videoTitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  videoSelectorScroll: {
    marginTop: Spacing.md,
  },
  videoSelectorContent: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  selectorText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    maxWidth: 100,
  },
  selectorTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
})
