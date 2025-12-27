import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { createList } from '../hooks/useLists'
import { GameList } from '../types'

interface CreateListModalProps {
  visible: boolean
  onClose: () => void
  onCreated?: (list: GameList) => void
}

export default function CreateListModal({ visible, onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle('')
      setDescription('')
      setIsPublic(true)
      setError(null)
    }
  }, [visible])

  const handleCreate = async () => {
    if (!user) return
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsCreating(true)
    setError(null)

    const { data, error: createError } = await createList(
      user.id,
      title.trim(),
      description.trim() || undefined,
      isPublic
    )

    setIsCreating(false)

    if (createError) {
      setError(createError)
      return
    }

    if (data) {
      onCreated?.(data)
    }
    onClose()
  }

  const canCreate = title.trim().length > 0

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New List</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!canCreate || isCreating}
            style={[styles.createButton, (!canCreate || isCreating) && styles.createButtonDisabled]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={[styles.createButtonText, !canCreate && styles.createButtonTextDisabled]}>
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="My awesome list"
              placeholderTextColor={Colors.textDim}
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this list about?"
              placeholderTextColor={Colors.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Public Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={22}
                color={Colors.text}
              />
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>
                  {isPublic ? 'Public' : 'Private'}
                </Text>
                <Text style={styles.toggleDescription}>
                  {isPublic
                    ? 'Anyone can see this list'
                    : 'Only you can see this list'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.surfaceLight, true: Colors.accent + '50' }}
              thumbColor={isPublic ? Colors.accent : Colors.textMuted}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  createButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  createButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.background,
  },
  createButtonTextDisabled: {
    color: Colors.textDim,
  },
  form: {
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  toggleLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  toggleDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
})
