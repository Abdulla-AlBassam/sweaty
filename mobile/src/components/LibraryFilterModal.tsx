import React, { useState, useEffect } from 'react'
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
export type LibrarySortType =
  | 'recent'
  | 'oldest'
  | 'rating_high'
  | 'rating_low'
  | 'my_rating_high'
  | 'my_rating_low'
  | 'release_newest'
  | 'release_oldest'
  | 'alphabetical_az'
  | 'alphabetical_za'

export type LibraryStatusFilterType = 'all_statuses' | 'playing' | 'completed' | 'played' | 'want_to_play' | 'on_hold' | 'dropped'

type FilterPage = 'main' | 'sort' | 'status' | 'show'

interface LibraryFilterModalProps {
  visible: boolean
  onClose: () => void
  filterType: LibraryFilterType
  sortType: LibrarySortType
  onFilterChange: (filter: LibraryFilterType) => void
  onSortChange: (sort: LibrarySortType) => void
  onReset: () => void
  showStatusFilter?: boolean
  statusFilter?: LibraryStatusFilterType
  onStatusFilterChange?: (status: LibraryStatusFilterType) => void
  hideFilterSection?: boolean
  /** When true, shows "Their Rating" + "My Rating" instead of "Your Rating" */
  isOtherUser?: boolean
  /** Restrict sort groups to only those whose titles are in this list */
  allowedSortGroups?: string[]
}

// Sort options grouped by category
type SortGroup = { title: string; options: { value: LibrarySortType; label: string }[] }

const BASE_SORT_GROUPS: SortGroup[] = [
  {
    title: 'GAME NAME',
    options: [
      { value: 'alphabetical_az', label: 'A-Z' },
      { value: 'alphabetical_za', label: 'Z-A' },
    ],
  },
  {
    title: 'WHEN LOGGED',
    options: [
      { value: 'recent', label: 'Newest first' },
      { value: 'oldest', label: 'Earliest first' },
    ],
  },
  {
    title: 'RELEASE DATE',
    options: [
      { value: 'release_newest', label: 'Newest first' },
      { value: 'release_oldest', label: 'Earliest first' },
    ],
  },
]

function getSortGroups(isOtherUser: boolean): SortGroup[] {
  if (isOtherUser) {
    return [
      ...BASE_SORT_GROUPS,
      {
        title: 'THEIR RATING',
        options: [
          { value: 'rating_high', label: 'Highest first' },
          { value: 'rating_low', label: 'Lowest first' },
        ],
      },
      {
        title: 'MY RATING',
        options: [
          { value: 'my_rating_high', label: 'Highest first' },
          { value: 'my_rating_low', label: 'Lowest first' },
        ],
      },
    ]
  }
  return [
    ...BASE_SORT_GROUPS,
    {
      title: 'YOUR RATING',
      options: [
        { value: 'rating_high', label: 'Highest first' },
        { value: 'rating_low', label: 'Lowest first' },
      ],
    },
  ]
}

const STATUS_FILTER_OPTIONS: { value: LibraryStatusFilterType; label: string }[] = [
  { value: 'all_statuses', label: 'All Statuses' },
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'played', label: 'Played' },
  { value: 'want_to_play', label: 'Want to Play' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
]

const FILTER_OPTIONS: { value: LibraryFilterType; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'played', label: 'Played' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'unrated', label: 'Unrated' },
]

const SORT_LABELS: Record<LibrarySortType, string> = {
  recent: 'Newest first',
  oldest: 'Earliest first',
  rating_high: 'Highest first',
  rating_low: 'Lowest first',
  my_rating_high: 'Highest first',
  my_rating_low: 'Lowest first',
  release_newest: 'Newest first',
  release_oldest: 'Earliest first',
  alphabetical_az: 'A-Z',
  alphabetical_za: 'Z-A',
}

const STATUS_LABELS: Record<LibraryStatusFilterType, string> = {
  all_statuses: 'All',
  playing: 'Playing',
  completed: 'Completed',
  played: 'Played',
  want_to_play: 'Want to Play',
  on_hold: 'On Hold',
  dropped: 'Dropped',
}

const FILTER_LABELS: Record<LibraryFilterType, string> = {
  all: 'All Games',
  played: 'Played',
  backlog: 'Backlog',
  reviewed: 'Reviewed',
  unrated: 'Unrated',
}

export default function LibraryFilterModal({
  visible,
  onClose,
  filterType,
  sortType,
  onFilterChange,
  onSortChange,
  onReset,
  showStatusFilter,
  statusFilter,
  onStatusFilterChange,
  hideFilterSection,
  isOtherUser = false,
  allowedSortGroups,
}: LibraryFilterModalProps) {
  const allSortGroups = getSortGroups(isOtherUser)
  const sortGroups = allowedSortGroups
    ? allSortGroups.filter((g) => allowedSortGroups.includes(g.title))
    : allSortGroups
  const [page, setPage] = useState<FilterPage>('main')

  const hasActiveFilters =
    filterType !== 'all' ||
    sortType !== 'recent' ||
    (showStatusFilter && statusFilter !== 'all_statuses')

  // Reset to main page when modal opens
  useEffect(() => {
    if (visible) {
      setPage('main')
    }
  }, [visible])

  const getPageTitle = () => {
    switch (page) {
      case 'sort': return 'Sort By'
      case 'status': return 'Status'
      case 'show': return 'Show'
      default: return 'Filter & Sort'
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            {page !== 'main' ? (
              <TouchableOpacity
                onPress={() => setPage('main')}
                style={styles.backButton}
                accessibilityLabel="Back to filters"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={22} color={Colors.textMuted} />
                <Text style={styles.backLabel}>Filters</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerLeft} />
            )}

            <Text style={styles.headerTitle}>{getPageTitle()}</Text>

            <View style={styles.headerRight}>
              {hasActiveFilters && page === 'main' && (
                <TouchableOpacity
                  onPress={onReset}
                  style={styles.resetButton}
                  accessibilityLabel="Reset all filters"
                  accessibilityRole="button"
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content -- only the active page renders */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            {page === 'main' && (
              <>
                {/* Sort By */}
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={() => setPage('sort')}
                  accessibilityLabel="Sort by"
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.menuLabel}>Sort By</Text>
                    <Text style={styles.menuValue}>{SORT_LABELS[sortType]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
                </TouchableOpacity>

                {/* Status (only in All view) */}
                {showStatusFilter && onStatusFilterChange && (
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => setPage('status')}
                    accessibilityLabel="Filter by status"
                    accessibilityRole="button"
                  >
                    <View>
                      <Text style={styles.menuLabel}>Status</Text>
                      <Text style={styles.menuValue}>
                        {STATUS_LABELS[statusFilter || 'all_statuses']}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
                  </TouchableOpacity>
                )}

                {/* Show */}
                {!hideFilterSection && (
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => setPage('show')}
                    accessibilityLabel="Filter games"
                    accessibilityRole="button"
                  >
                    <View>
                      <Text style={styles.menuLabel}>Show</Text>
                      <Text style={styles.menuValue}>{FILTER_LABELS[filterType]}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {page === 'sort' && (
              <>
                {sortGroups.map((group) => (
                  <View key={group.title} style={styles.sortGroup}>
                    <Text style={styles.sortGroupTitle}>{group.title}</Text>
                    {group.options.map((option, idx) => {
                      const isSelected = sortType === option.value
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionRow,
                            idx < group.options.length - 1 && styles.optionRowBorder,
                          ]}
                          onPress={() => onSortChange(option.value)}
                          accessibilityLabel={`Sort by ${option.label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark" size={20} color={Colors.accent} />
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                ))}
              </>
            )}

            {page === 'status' && (
              <>
                {STATUS_FILTER_OPTIONS.map((option, idx) => {
                  const isSelected = statusFilter === option.value
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionRow,
                        idx < STATUS_FILTER_OPTIONS.length - 1 && styles.optionRowBorder,
                      ]}
                      onPress={() => onStatusFilterChange?.(option.value)}
                      accessibilityLabel={`Status: ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={Colors.accent} />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </>
            )}

            {page === 'show' && (
              <>
                {FILTER_OPTIONS.map((option, idx) => {
                  const isSelected = filterType === option.value
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionRow,
                        idx < FILTER_OPTIONS.length - 1 && styles.optionRowBorder,
                      ]}
                      onPress={() => onFilterChange(option.value)}
                      accessibilityLabel={`Show: ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={Colors.accent} />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </>
            )}
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={onClose}
              accessibilityLabel="Apply filters"
              accessibilityRole="button"
            >
              <Text style={styles.applyButtonText}>Apply</Text>
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
    backgroundColor: Colors.overlay,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  resetButton: {
    paddingHorizontal: Spacing.sm,
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

  // Content
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  // Main page menu rows
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  menuValue: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Sub-page options
  sortGroup: {
    marginBottom: Spacing.xl,
  },
  sortGroupTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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

  // Footer
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
