import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SweatDropIcon from '../components/SweatDropIcon'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { MainStackParamList } from '../navigation'
import PressableScale from '../components/PressableScale'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

interface Game {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
  genres?: string[]
  platforms?: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  games?: Game[]
}

const AI_USED_KEY = 'sweaty_ai_used'

const EXAMPLE_PROMPTS = [
  "2025 releases similar to God of War",
  "Games like Zelda but shorter",
  "Couch co-op for beginners",
  "Challenging roguelikes",
  "Story-driven games under 20 hours",
]

export default function AIRecommendScreen() {
  const navigation = useNavigation<NavigationProp>()
  const scrollViewRef = useRef<ScrollView>(null)

  const pulseAnim = useRef(new Animated.Value(1)).current

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  // Check if this is the user's first visit
  useEffect(() => {
    AsyncStorage.getItem(AI_USED_KEY).then((value) => {
      if (!value) {
        setIsFirstVisit(true)
      }
    })
  }, [])

  // Pulse animation for loading state
  useEffect(() => {
    if (isLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isLoading])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    // Mark AI as used after first message
    if (isFirstVisit) {
      AsyncStorage.setItem(AI_USED_KEY, 'true')
      setIsFirstVisit(false)
    }

    const userMessage: ChatMessage = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInputText('')
    setIsLoading(true)
    setError(null)
    Keyboard.dismiss()

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/ai/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get recommendations')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || "Here are some games you might enjoy!",
        games: data.games || [],
      }

      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      console.error('AI recommend error:', err)
      setError('Failed to get recommendations. Please try again.')
      setMessages(messages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user'

    return (
      <View key={index} style={styles.messageContainer}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {message.content}
          </Text>
        </View>

        {!isUser && message.games && message.games.length > 0 && (
          <View style={styles.gamesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesScroll}
            >
              {message.games.map((game, gameIndex) => {
                const coverUrl = game.coverUrl || game.cover_url
                const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverBig') : null

                return (
                  <PressableScale
                    key={`${game.id}-${gameIndex}`}
                    onPress={() => handleGamePress(game.id)}
                    haptic="light"
                    scale={0.95}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.gameCover} />
                    ) : (
                      <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                        <SweatDropIcon size={24} variant="static" />
                      </View>
                    )}
                  </PressableScale>
                )
              })}
            </ScrollView>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic="light">
          <View style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </View>
        </PressableScale>

        <SweatDropIcon size={24} variant="static" />

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          /* Empty state - logo centered, text at bottom */
          <View style={styles.emptyState}>
            <View style={styles.emptyCenter}>
              <SweatDropIcon size={56} variant="static" />
            </View>
            <View style={styles.emptyBottom}>
              <Text style={styles.welcomeTitle}>What do you want to play?</Text>
              <Text style={styles.welcomeSubtitle}>
                Describe your mood and I'll find the perfect game for you.
              </Text>

              {isFirstVisit && (
                <View style={styles.promptsContainer}>
                  {EXAMPLE_PROMPTS.map((prompt, index) => (
                    <PressableScale
                      key={index}
                      onPress={() => sendMessage(prompt)}
                      haptic="light"
                      scale={0.98}
                    >
                      <View style={styles.promptCard}>
                        <Text style={styles.promptText}>{prompt}</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.textDim} />
                      </View>
                    </PressableScale>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message, index) => renderMessage(message, index))}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <SweatDropIcon size={28} variant="static" />
                </Animated.View>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <PressableScale
                  onPress={() => {
                    setError(null)
                    if (messages.length > 0) {
                      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
                      if (lastUserMessage) {
                        sendMessage(lastUserMessage.content)
                      }
                    }
                  }}
                  haptic="light"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </PressableScale>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Describe your ideal game..."
              placeholderTextColor={Colors.textDim}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => sendMessage(inputText)}
            />
            <PressableScale
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              haptic="medium"
              scale={0.9}
            >
              <View style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}>
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={inputText.trim() && !isLoading ? Colors.background : Colors.textDim}
                />
              </View>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  // Empty state (no messages)
  emptyState: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBottom: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  welcomeTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xl,
    lineHeight: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  // Prompts
  promptsContainer: {
    gap: Spacing.sm,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promptText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  // Messages
  messageContainer: {
    marginBottom: Spacing.lg,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.surfaceLight,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  userMessageText: {
    color: Colors.text,
  },
  assistantMessageText: {
    color: Colors.text,
  },
  // Games
  gamesContainer: {
    marginTop: Spacing.md,
  },
  gamesScroll: {
    gap: Spacing.sm,
  },
  gameCover: {
    width: 100,
    height: 133,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Loading
  loadingContainer: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Input
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
})
