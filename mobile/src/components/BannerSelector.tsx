import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { BANNER_OPTIONS, BannerOption } from '../constants/banners'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2
const BANNER_HEIGHT = BANNER_WIDTH * 0.5  // 2:1 aspect ratio

interface BannerSelectorProps {
  visible: boolean
  onClose: () => void
  onSelect: (banner: BannerOption) => void
  currentBannerUrl?: string | null
  isLoading?: boolean
}

export default function BannerSelector({
  visible,
  onClose,
  onSelect,
  currentBannerUrl,
  isLoading = false,
}: BannerSelectorProps) {
  const [selectedBanner, setSelectedBanner] = useState<BannerOption | null>(null)

  const handleSelect = (banner: BannerOption) => {
    setSelectedBanner(banner)
  }

  const handleConfirm = () => {
    if (selectedBanner) {
      onSelect(selectedBanner)
    }
  }

  const renderBannerItem = ({ item }: { item: BannerOption }) => {
    const isSelected = selectedBanner?.id === item.id
    const isCurrent = currentBannerUrl === item.url

    return (
      <TouchableOpacity
        style={[
          styles.bannerItem,
          isSelected && styles.bannerItemSelected,
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.url }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.accent} />
          </View>
        )}
        <View style={styles.bannerNameContainer}>
          <Text style={styles.bannerName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose Banner</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selectedBanner || isLoading}
              style={[
                styles.confirmButton,
                (!selectedBanner || isLoading) && styles.confirmButtonDisabled,
              ]}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color={Colors.text} />
              ) : (
                <Text style={styles.confirmText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Banner Grid */}
          <FlatList
            data={BANNER_OPTIONS}
            renderItem={renderBannerItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  confirmText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  bannerItem: {
    width: BANNER_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bannerItemSelected: {
    borderColor: Colors.accent,
  },
  bannerImage: {
    width: '100%',
    height: BANNER_HEIGHT,
    backgroundColor: Colors.surfaceLight,
  },
  currentBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.background,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerNameContainer: {
    padding: Spacing.xs,
  },
  bannerName: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
