import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { MainStackParamList } from '../navigation'

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

// Example prompts to help users get started
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

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // Remove the user message if we failed
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
        {/* Message bubble */}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}>
          {!isUser && (
            <View style={styles.aiIconContainer}>
              <Ionicons name="sparkles" size={14} color={Colors.accent} />
            </View>
          )}
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {message.content}
          </Text>
        </View>

        {/* Games grid (only for assistant messages with games) */}
        {!isUser && message.games && message.games.length > 0 && (
          <View style={styles.gamesContainer}>
            <View style={styles.gamesGrid}>
              {message.games.map((game, gameIndex) => {
                const coverUrl = game.coverUrl || game.cover_url
                const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverBig') : null

                return (
                  <TouchableOpacity
                    key={`${game.id}-${gameIndex}`}
                    style={styles.gameCard}
                    onPress={() => handleGamePress(game.id)}
                    activeOpacity={0.8}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.gameCover} />
                    ) : (
                      <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                        <Ionicons name="game-controller-outline" size={24} color={Colors.textDim} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="sparkles" size={18} color={Colors.accent} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Sweaty AI</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            // Welcome state with example prompts
            <View style={styles.welcomeContainer}>
              <LinearGradient
                colors={[Colors.accent + '20', Colors.accent + '05']}
                style={styles.welcomeGradient}
              >
                <View style={styles.welcomeIconContainer}>
                  <Ionicons name="sparkles" size={32} color={Colors.accent} />
                </View>
                <Text style={styles.welcomeTitle}>Ask Sweaty AI</Text>
                <Text style={styles.welcomeSubtitle}>
                  Describe what kind of game you're in the mood for and I'll find the perfect match.
                </Text>
              </LinearGradient>

              <Text style={styles.examplePromptsLabel}>Try asking...</Text>
              <View style={styles.examplePrompts}>
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.examplePromptChip}
                    onPress={() => handleExamplePrompt(prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.examplePromptText}>{prompt}</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            // Chat messages
            messages.map((message, index) => renderMessage(message, index))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.loadingText}>Finding games for you...</Text>
              </View>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null)
                  if (messages.length > 0) {
                    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
                    if (lastUserMessage) {
                      sendMessage(lastUserMessage.content)
                    }
                  }
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
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
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isLoading ? Colors.background : Colors.textDim}
              />
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
    width: 40,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: Spacing.xs,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
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
    paddingHorizontal: Spacing.md,
  },
  // Welcome state
  welcomeContainer: {
    paddingTop: Spacing.xl,
  },
  welcomeGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  examplePromptsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  examplePrompts: {
    gap: Spacing.sm,
  },
  examplePromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  examplePromptText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  // Messages
  messageContainer: {
    marginBottom: Spacing.lg,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  aiIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Games grid
  gamesContainer: {
    marginTop: Spacing.md,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gameCard: {
    width: '31%',
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
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
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // Error
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  // Input
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
})
