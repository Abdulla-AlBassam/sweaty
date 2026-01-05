import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'

export type LibraryFilterType = 'all' | 'played' | 'backlog' | 'reviewed' | 'unrated'
export type LibrarySortType = 'rating' | 'recent' | 'alphabetical' | 'release_date'

interface LibraryFilterModalProps {
  visible: boolean
  onClose: () => void
  filterType: LibraryFilterType
  sortType: LibrarySortType
  onFilterChange: (filter: LibraryFilterType) => void
  onSortChange: (sort: LibrarySortType) => void
  onReset: () => void
}

const FILTER_OPTIONS: { value: LibraryFilterType; label: string; description: string }[] = [
  { value: 'all', label: 'All Games', description: 'Show all logged games' },
  { value: 'played', label: 'Played', description: 'Playing, Played, Completed, Dropped' },
  { value: 'backlog', label: 'Backlog', description: 'Want to Play, On Hold' },
  { value: 'reviewed', label: 'Reviewed', description: 'Games with written reviews' },
  { value: 'unrated', label: 'Unrated', description: 'Games without a rating' },
]

const SORT_OPTIONS: { value: LibrarySortType; label: string }[] = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'alphabetical', label: 'Alphabetical A-Z' },
  { value: 'release_date', label: 'Release Date' },
]

export default function LibraryFilterModal({
  visible,
  onClose,
  filterType,
  sortType,
  onFilterChange,
  onSortChange,
  onReset,
}: LibraryFilterModalProps) {
  const hasActiveFilters = filterType !== 'all' || sortType !== 'rating'

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filter & Sort</Text>
            <View style={styles.headerButtons}>
              {hasActiveFilters && (
                <TouchableOpacity onPress={onReset} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Filter By Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FILTER BY</Text>
              {FILTER_OPTIONS.map((option) => {
                const isSelected = filterType === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => onFilterChange(option.value)}
                  >
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={22} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Sort By Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SORT BY</Text>
              {SORT_OPTIONS.map((option) => {
                const isSelected = sortType === option.value
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => onSortChange(option.value)}
                  >
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={22} color={Colors.accent} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  resetButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: Colors.background,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  optionLabelSelected: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  optionDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.background,
  },
})
