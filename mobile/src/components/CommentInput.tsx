import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
  replyingTo?: string | null
  onCancelReply?: () => void
  autoFocus?: boolean
}

export default function CommentInput({
  onSubmit,
  placeholder = 'Add a comment...',
  replyingTo,
  onCancelReply,
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [replyingTo])

  const handleSubmit = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(trimmedContent)
      setContent('')
      Keyboard.dismiss()
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = content.trim().length > 0 && !isSubmitting

  return (
    <View style={styles.container}>
      {replyingTo && (
        <View style={styles.replyingToContainer}>
          <Text style={styles.replyingToText}>
            Replying to <Text style={styles.replyingToUsername}>@{replyingTo}</Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDim}
          value={content}
          onChangeText={(text) => setContent(text.slice(0, 500))}
          multiline
          maxLength={500}
          autoFocus={autoFocus}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={canSubmit ? Colors.background : Colors.textDim}
            />
          )}
        </TouchableOpacity>
      </View>
      {content.length > 400 && (
        <Text style={styles.charCount}>{content.length}/500</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  replyingToText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  replyingToUsername: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  cancelReply: {
    padding: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
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
  charCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
})
