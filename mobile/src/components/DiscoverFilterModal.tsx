import React, { useEffect, useState } from 'react'
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
import { DISCOVER_FILTERS, DiscoverFacet } from '../constants/discoverFilters'
import type { DiscoverFilterState } from '../hooks/useDiscoverFilters'
import { GlassSurface, GlassTokens } from '../ui/glass'

interface DiscoverFilterModalProps {
  visible: boolean
  active: DiscoverFilterState
  available: DiscoverFilterState
  onClose: () => void
  onApply: (next: DiscoverFilterState) => void
  onReset: () => void
}

const SECTION_TITLES: Record<DiscoverFacet, string> = {
  platform: 'PLATFORM',
  genre: 'GENRE',
  release: 'RELEASE',
}

const FACET_ORDER: DiscoverFacet[] = ['platform', 'genre', 'release']

export default function DiscoverFilterModal({
  visible,
  active,
  available,
  onClose,
  onApply,
  onReset,
}: DiscoverFilterModalProps) {
  // Local draft — commits only on Apply. Overlay/close discards.
  const [draft, setDraft] = useState<DiscoverFilterState>(active)

  // Initialise draft from the committed `active` state whenever the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(active)
    }
  }, [visible, active])

  const toggle = (facet: DiscoverFacet, value: string) => {
    setDraft((prev) => {
      const selected = prev[facet]
      const exists = selected.includes(value)
      return {
        ...prev,
        [facet]: exists ? selected.filter((v) => v !== value) : [...selected, value],
      }
    })
  }

  const facetsWithOptions = FACET_ORDER.filter((facet) => available[facet].length > 0)

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
        <GlassSurface
          intensity="heavy"
          role="sheet"
          radius={GlassTokens.radius.sheet}
          style={styles.glassSheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <Text style={styles.headerTitle}>Filter</Text>
            <View style={styles.headerRight}>
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

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            {facetsWithOptions.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No filters available yet.</Text>
              </View>
            ) : (
              facetsWithOptions.map((facet) => {
                const options = (DISCOVER_FILTERS[facet] as readonly string[]).filter((v) =>
                  available[facet].includes(v)
                )
                return (
                  <View key={facet} style={styles.sortGroup}>
                    <Text style={styles.sortGroupTitle}>{SECTION_TITLES[facet]}</Text>
                    {options.map((option, idx) => {
                      const isSelected = draft[facet].includes(option)
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.optionRow,
                            idx < options.length - 1 && styles.optionRowBorder,
                          ]}
                          onPress={() => toggle(facet, option)}
                          accessibilityLabel={`${SECTION_TITLES[facet]}: ${option}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                          >
                            {option}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark" size={20} color={Colors.cream} />
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={onReset}
              accessibilityLabel="Reset all filters"
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => onApply(draft)}
              accessibilityLabel="Apply filters"
              accessibilityRole="button"
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </GlassSurface>
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
    maxHeight: '80%',
  },
  glassSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  emptyWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
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
    color: Colors.cream,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  resetButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  resetButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  applyButton: {
    flex: 1,
    backgroundColor: Colors.cream,
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
