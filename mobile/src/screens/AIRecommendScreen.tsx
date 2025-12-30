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
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
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

// Example prompts with icons
const EXAMPLE_PROMPTS = [
  { text: "2025 releases similar to God of War", icon: "sword-cross" },
  { text: "Games like Zelda but shorter", icon: "clock-outline" },
  { text: "Couch co-op for beginners", icon: "account-group" },
  { text: "Challenging roguelikes", icon: "skull" },
  { text: "Story-driven games under 20 hours", icon: "book-open-variant" },
]

export default function AIRecommendScreen() {
  const navigation = useNavigation<NavigationProp>()
  const scrollViewRef = useRef<ScrollView>(null)

  // Animated values for glitch effect
  const pulseAnim = useRef(new Animated.Value(1)).current
  const glitchAnim = useRef(new Animated.Value(0)).current

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pulse animation for the AI icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  // Glitch animation
  useEffect(() => {
    const glitch = Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glitchAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ])
    )
    glitch.start()
    return () => glitch.stop()
  }, [])

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

  const handleExamplePrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user'

    return (
      <View key={index} style={styles.messageContainer}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}>
          {!isUser && (
            <View style={styles.aiIconSmall}>
              <SweatDropIcon size={14} variant="static" />
            </View>
          )}
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
      {/* Header with RGB Glitch */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} haptic="light">
          <View style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </View>
        </PressableScale>

        {/* Title with RGB layers */}
        <View style={styles.headerTitleContainer}>
          <View style={styles.titleWrapper}>
            {/* Cyan layer */}
            <Animated.Text style={[
              styles.headerTitleLayer,
              styles.headerTitleCyan,
              {
                transform: [{
                  translateX: glitchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -2],
                  })
                }],
                opacity: glitchAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.6, 0.3],
                }),
              }
            ]}>
              SWEATY AI
            </Animated.Text>
            {/* Pink layer */}
            <Animated.Text style={[
              styles.headerTitleLayer,
              styles.headerTitlePink,
              {
                transform: [{
                  translateX: glitchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 2],
                  })
                }],
                opacity: glitchAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.5, 0.3],
                }),
              }
            ]}>
              SWEATY AI
            </Animated.Text>
            {/* Main title */}
            <Text style={styles.headerTitle}>SWEATY AI</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              {/* SweatDrop Icon with pulse */}
              <Animated.View style={[styles.aiIconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <SweatDropIcon size={64} variant="default" />
              </Animated.View>

              <Text style={styles.welcomeTitle}>What do you want to play?</Text>
              <Text style={styles.welcomeSubtitle}>
                Describe your mood and I'll find the perfect game for you.
              </Text>

              {/* Example Prompts with Chrome Glitch style */}
              <View style={styles.promptsContainer}>
                <Text style={styles.promptsLabel}>TRY ASKING</Text>
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <PressableScale
                    key={index}
                    onPress={() => handleExamplePrompt(prompt.text)}
                    haptic="light"
                    scale={0.98}
                  >
                    <View style={styles.promptCardWrapper}>
                      {/* RGB Border layers */}
                      <View style={[styles.promptBorderLayer, styles.promptBorderCyan]} />
                      <View style={[styles.promptBorderLayer, styles.promptBorderGreen]} />
                      <View style={[styles.promptBorderLayer, styles.promptBorderPink]} />

                      <View style={styles.promptCard}>
                        <MaterialCommunityIcons
                          name={prompt.icon as any}
                          size={18}
                          color={Colors.cyan}
                          style={styles.promptIcon}
                        />
                        <Text style={styles.promptText}>{prompt.text}</Text>
                        <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                      </View>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <SweatDropIcon size={20} variant="loading" />
                <Text style={styles.loadingText}>Searching games...</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.pink} />
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

        {/* Input Area with RGB Glitch border */}
        <View style={styles.inputContainer}>
          <View style={styles.inputOuterWrapper}>
            {/* RGB Border layers */}
            <View style={[styles.inputBorderLayer, styles.inputBorderCyan]} />
            <View style={[styles.inputBorderLayer, styles.inputBorderGreen]} />
            <View style={[styles.inputBorderLayer, styles.inputBorderPink]} />

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
                    size={22}
                    color={inputText.trim() && !isLoading ? Colors.background : Colors.textDim}
                  />
                </View>
              </PressableScale>
            </View>
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
  headerTitleContainer: {
    alignItems: 'center',
  },
  titleWrapper: {
    position: 'relative',
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 3,
  },
  headerTitleLayer: {
    position: 'absolute',
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerTitleCyan: {
    color: Colors.cyan,
  },
  headerTitlePink: {
    color: Colors.pink,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  // Welcome state
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  aiIconContainer: {
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  // Prompts
  promptsContainer: {
    width: '100%',
  },
  promptsLabel: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  promptCardWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  promptBorderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  promptBorderCyan: {
    borderColor: Colors.cyan,
    opacity: 0.4,
    transform: [{ translateX: -1 }],
  },
  promptBorderGreen: {
    borderColor: Colors.accent,
    opacity: 0.4,
    transform: [{ translateX: 1 }],
  },
  promptBorderPink: {
    borderColor: Colors.pink,
    opacity: 0.3,
    transform: [{ translateY: 0.5 }],
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  promptIcon: {
    marginRight: Spacing.md,
  },
  promptText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
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
    backgroundColor: Colors.accent,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiIconSmall: {
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.background,
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
    marginBottom: Spacing.md,
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.pink + '15',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.pink + '30',
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.pink,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.cyan,
  },
  // Input
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
  },
  inputOuterWrapper: {
    position: 'relative',
  },
  inputBorderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 2,
  },
  inputBorderCyan: {
    borderColor: Colors.cyan,
    opacity: 0.4,
    transform: [{ translateX: -1.5 }],
  },
  inputBorderGreen: {
    borderColor: Colors.accent,
    opacity: 0.4,
    transform: [{ translateX: 1.5 }],
  },
  inputBorderPink: {
    borderColor: Colors.pink,
    opacity: 0.3,
    transform: [{ translateY: 0.5 }],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
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
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
})
