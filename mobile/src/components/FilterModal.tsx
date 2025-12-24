import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

interface FilterModalProps {
  visible: boolean
  onClose: () => void
  filterType: 'genre' | 'year' | 'platform'
  selectedValues: string[]
  onApply: (values: string[]) => void
}

const GENRES = [
  'Action',
  'Adventure',
  'RPG',
  'Horror',
  'Shooter',
  'Sports',
  'Puzzle',
  'Strategy',
  'Racing',
  'Fighting',
  'Simulation',
  'Platformer',
  'Indie',
  'MOBA',
  'Music',
]

const YEARS = [
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2010s',
  '2000s',
  '1990s',
  '1980s',
]

const PLATFORMS = [
  'PlayStation 5',
  'PlayStation 4',
  'Xbox Series X|S',
  'Xbox One',
  'Nintendo Switch',
  'PC (Microsoft Windows)',
  'iOS',
  'Android',
]

const FILTER_OPTIONS: Record<string, string[]> = {
  genre: GENRES,
  year: YEARS,
  platform: PLATFORMS,
}

const FILTER_TITLES: Record<string, string> = {
  genre: 'Select Genre',
  year: 'Select Year',
  platform: 'Select Platform',
}

export default function FilterModal({
  visible,
  onClose,
  filterType,
  selectedValues,
  onApply,
}: FilterModalProps) {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedValues)

  // Sync local state when modal opens or selectedValues change
  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedValues)
    }
  }, [visible, selectedValues])

  const options = FILTER_OPTIONS[filterType] || []
  const title = FILTER_TITLES[filterType] || 'Select'

  const toggleOption = (option: string) => {
    setLocalSelected((prev) =>
      prev.includes(option)
        ? prev.filter((v) => v !== option)
        : [...prev, option]
    )
  }

  const handleClear = () => {
    setLocalSelected([])
  }

  const handleApply = () => {
    onApply(localSelected)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Options List */}
              <ScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
              >
                {options.map((option) => {
                  const isSelected = localSelected.includes(option)
                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() => toggleOption(option)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={Colors.accent}
                        />
                      )}
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                >
                  <Text style={styles.applyButtonText}>
                    Apply{localSelected.length > 0 ? ` (${localSelected.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34, // Safe area bottom
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  optionsList: {
    paddingHorizontal: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionRowSelected: {
    backgroundColor: Colors.surface,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.accentLight,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
})
