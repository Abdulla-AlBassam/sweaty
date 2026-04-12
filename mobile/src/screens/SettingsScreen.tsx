import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Switch,
  Linking,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import PressableScale from '../components/PressableScale'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MainStackParamList } from '../navigation'
import * as ImagePicker from 'expo-image-picker'
import * as Updates from 'expo-updates'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ONBOARDING_STORAGE_KEY } from './OnboardingScreen'
import { PAYWALL_STORAGE_KEY } from './PaywallScreen'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { usePremium } from '../hooks/usePremium'
import BannerSelector from '../components/BannerSelector'
import PremiumBadge from '../components/PremiumBadge'
import { GamingPlatform, NotificationPreferences } from '../types'
import { useNotifications } from '../hooks/useNotifications'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_PREVIEW_HEIGHT = 80

const PLATFORM_OPTIONS: { key: GamingPlatform; icon: string; iconLibrary: 'fa5' | 'mci' }[] = [
  { key: 'playstation', icon: 'playstation', iconLibrary: 'fa5' },
  { key: 'xbox', icon: 'xbox', iconLibrary: 'fa5' },
  { key: 'pc', icon: 'desktop-tower-monitor', iconLibrary: 'mci' },
  { key: 'nintendo', icon: 'nintendo-switch', iconLibrary: 'mci' },
]

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { isPremium } = usePremium(profile?.subscription_tier, profile?.subscription_expires_at)
  const {
    preferences: notifPrefs,
    isEnabled: notificationsEnabled,
    requestPermissions,
    updatePreference,
  } = useNotifications(user?.id)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [gamingPlatforms, setGamingPlatforms] = useState<GamingPlatform[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [bannerSelectorVisible, setBannerSelectorVisible] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [currentAppIcon, setCurrentAppIcon] = useState<string>('dark')

  // Read current app icon on mount (requires dev build with expo-dynamic-app-icon)
  useEffect(() => {
    try {
      const { getAppIcon } = require('expo-dynamic-app-icon')
      const name = getAppIcon()
      if (name && name !== 'DEFAULT') {
        setCurrentAppIcon(name)
      }
    } catch {
      // Module not available (e.g. Expo Go). Ignore — user sees default.
    }
  }, [])

  const handleAppIconChange = useCallback((name: 'light' | 'dark' | 'monochrome') => {
    try {
      const { setAppIcon } = require('expo-dynamic-app-icon')
      const result = setAppIcon(name)
      if (result === false) {
        Alert.alert('Unable to change icon', 'Please try again.')
        return
      }
      setCurrentAppIcon(name)
    } catch {
      Alert.alert(
        'Development build required',
        'Changing the app icon needs a new dev build with expo-dynamic-app-icon compiled in.'
      )
    }
  }, [])

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url || null)
      setBannerUrl(profile.banner_url || null)
      setDisplayName(profile.display_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setGamingPlatforms(profile.gaming_platforms || [])
    }
  }, [profile])

  const hasChanges = useMemo(() => {
    const originalDisplayName = profile?.display_name || ''
    const originalBio = profile?.bio || ''
    const originalUsername = profile?.username || ''
    const originalAvatar = profile?.avatar_url || null
    const originalBanner = profile?.banner_url || null
    const originalPlatforms = profile?.gaming_platforms || []

    const platformsChanged =
      gamingPlatforms.length !== originalPlatforms.length ||
      gamingPlatforms.some(p => !originalPlatforms.includes(p))

    return (
      displayName !== originalDisplayName ||
      bio !== originalBio ||
      username !== originalUsername ||
      avatarUrl !== originalAvatar ||
      bannerUrl !== originalBanner ||
      platformsChanged
    )
  }, [displayName, bio, username, avatarUrl, bannerUrl, gamingPlatforms, profile])

  // Warn on unsaved changes when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) return
      e.preventDefault()
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      )
    })
    return unsubscribe
  }, [hasChanges, navigation])

  const validateUsername = (value: string): boolean => {
    if (value.length < 3) {
      setUsernameError('username must be at least 3 characters')
      return false
    }
    if (value.length > 20) {
      setUsernameError('username must be 20 characters or less')
      return false
    }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameError('only lowercase letters, numbers, and underscores')
      return false
    }
    setUsernameError(null)
    return true
  }

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(cleaned)
    if (cleaned.length > 0) {
      validateUsername(cleaned)
    } else {
      setUsernameError(null)
    }
  }

  const togglePlatform = useCallback((platform: GamingPlatform) => {
    setGamingPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }, [])

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your avatar.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]

      // Validate file size (5MB limit)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select an image under 5MB.')
        return
      }

      // Validate file type
      const ext = asset.uri.split('.').pop()?.toLowerCase()
      const allowedTypes = ['jpg', 'jpeg', 'png', 'webp', 'heic']
      if (ext && !allowedTypes.includes(ext)) {
        Alert.alert('Unsupported format', 'Please select a JPG, PNG, or WEBP image.')
        return
      }

      await uploadAvatar(asset.uri)
    }
  }

  const uploadAvatar = async (uri: string) => {
    if (!user) return

    setIsUploadingAvatar(true)
    try {
      // Get the file extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${user.id}-${Date.now()}.${ext}`
      const filePath = `avatars/${fileName}`

      // Read the file
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      Alert.alert('Upload Failed', error.message || 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!user || !hasChanges || isSaving) return

    // Validate username
    if (!validateUsername(username)) {
      return
    }

    // Check if username is taken (if changed)
    if (username !== profile?.username) {
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

      // PGRST116 = no rows found (username available) — that's expected
      if (checkError && checkError.code !== 'PGRST116') {
        Alert.alert('Error', 'Could not verify username availability. Please try again.')
        return
      }

      if (existing) {
        setUsernameError('username is already taken')
        return
      }
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          display_name: displayName.trim() || null,
          username: username,
          bio: bio.trim().slice(0, 160) || null,
          gaming_platforms: gamingPlatforms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    )
  }

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset onboarding?',
      'This clears the onboarding and paywall flags and reloads the app so you can walk through the flow again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([ONBOARDING_STORAGE_KEY, PAYWALL_STORAGE_KEY])
              await Updates.reloadAsync()
            } catch (err) {
              console.error('Reset onboarding failed:', err)
              Alert.alert(
                'Reset partially complete',
                'Flags were cleared but the app could not auto-reload. Force-quit Sweaty and reopen it to see the tour.',
              )
            }
          },
        },
      ]
    )
  }

  const handleNotificationToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!notificationsEnabled) {
      // Permissions not granted - prompt user
      const granted = await requestPermissions()
      if (!granted) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in your device settings to receive updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        )
        return
      }
    }
    updatePreference(key, value)
  }

  const handleBannerSelect = (banner: { url: string; gameName: string }) => {
    setBannerUrl(banner.url)
    setBannerSelectorVisible(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} containerStyle={styles.backButton} haptic="light" accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to profile">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <PressableScale
          onPress={handleSave}
          disabled={!hasChanges || isSaving || !!usernameError}
          containerStyle={styles.saveButton}
          haptic="medium"
          accessibilityLabel="Save changes"
          accessibilityRole="button"
          accessibilityHint="Saves profile changes"
        >
          {isSaving ? (
            <LoadingSpinner size="small" color={Colors.cream} />
          ) : (
            <Text style={[styles.saveText, (!hasChanges || !!usernameError) && styles.saveTextDisabled]}>
              SAVE
            </Text>
          )}
        </PressableScale>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* ═══ Group 1: Avatar + Banner (base) ═══ */}
          <View style={[styles.sectionGroup, { backgroundColor: Colors.background }]}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <PressableScale onPress={pickImage} disabled={isUploadingAvatar} haptic="light" accessibilityLabel="Change profile picture" accessibilityRole="button">
              {isUploadingAvatar ? (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <LoadingSpinner size="large" color={Colors.cream} />
                </View>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityLabel="Your profile picture" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={50} color={Colors.textDim} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color={Colors.text} />
              </View>
            </PressableScale>
            <Text style={styles.changeAvatarText}>Change avatar</Text>
          </View>

          {/* Banner Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Banner</Text>

            <PressableScale
              style={styles.bannerPreviewContainer}
              onPress={() => setBannerSelectorVisible(true)}
              haptic="light"
              accessibilityLabel="Change profile banner"
              accessibilityRole="button"
            >
              {bannerUrl ? (
                <View style={styles.bannerPreviewWrapper}>
                  <Image
                    source={{ uri: bannerUrl }}
                    style={styles.bannerPreview}
                    resizeMode="cover"
                    accessibilityLabel="Current profile banner"
                  />
                  <LinearGradient
                    colors={['transparent', Colors.overlay]}
                    style={styles.bannerPreviewGradient}
                  />
                  <View style={styles.bannerEditOverlay}>
                    <Ionicons name="create-outline" size={18} color={Colors.text} />
                  </View>
                </View>
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.bannerPlaceholderText}>Tap to select a banner</Text>
                </View>
              )}
            </PressableScale>
          </View>
          </View>

          {/* ═══ Group 2: Profile fields (alternate) ═══ */}
          <View style={[styles.sectionGroup, { backgroundColor: Colors.alternate }]}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} nativeID="displayNameLabel">Display name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={Colors.textDim}
                maxLength={50}
                accessibilityLabel="Display name"
                accessibilityLabelledBy="displayNameLabel"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} nativeID="usernameLabel">Username</Text>
              <View style={styles.usernameInputContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="username"
                  placeholderTextColor={Colors.textDim}
                  maxLength={20}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Username"
                  accessibilityLabelledBy="usernameLabel"
                />
              </View>
              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} nativeID="bioLabel">Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={(text) => setBio(text.slice(0, 160))}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.textDim}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Bio"
                accessibilityLabelledBy="bioLabel"
              />
              <Text style={styles.charCount}>{bio.length}/160</Text>
            </View>
          </View>
          </View>

          {/* ═══ Group 3: Platforms + Notifications (base) ═══ */}
          <View style={[styles.sectionGroup, { backgroundColor: Colors.background }]}>
          {/* Gaming Platforms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platforms</Text>
            <View style={styles.platformsGrid}>
              {PLATFORM_OPTIONS.map((platform) => {
                const isSelected = gamingPlatforms.includes(platform.key)
                return (
                  <PressableScale
                    key={platform.key}
                    containerStyle={{ flex: 1 }}
                    style={[
                      styles.platformButton,
                      isSelected && styles.platformButtonSelected,
                    ]}
                    onPress={() => togglePlatform(platform.key)}
                    haptic="selection"
                    scale={0.94}
                    accessibilityLabel={platform.key.charAt(0).toUpperCase() + platform.key.slice(1)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    {platform.iconLibrary === 'fa5' ? (
                      <FontAwesome5 name={platform.icon} size={22} color={isSelected ? Colors.cream : Colors.textMuted} />
                    ) : (
                      <MaterialCommunityIcons name={platform.icon as any} size={22} color={isSelected ? Colors.cream : Colors.textMuted} />
                    )}
                  </PressableScale>
                )
              })}
            </View>

          </View>

          {/* App Icon */}
          <View style={styles.sectionCompact}>
            <Text style={styles.sectionTitle}>App Icon</Text>
            <View style={styles.iconPickerRow}>
              {([
                { key: 'light', label: 'Light', source: require('../../assets/app-icons/icon-light.png') },
                { key: 'dark', label: 'Dark', source: require('../../assets/app-icons/icon-dark.png') },
                { key: 'monochrome', label: 'Mono', source: require('../../assets/app-icons/icon-monochrome.png') },
              ] as const).map((opt) => {
                const selected = currentAppIcon === opt.key
                return (
                  <PressableScale
                    key={opt.key}
                    onPress={() => handleAppIconChange(opt.key)}
                    style={[styles.iconOption, selected && styles.iconOptionSelected]}
                    haptic="light"
                  >
                    <Image source={opt.source} style={styles.iconOptionImage} />
                    <Text style={[styles.iconOptionLabel, selected && styles.iconOptionLabelSelected]}>
                      {opt.label}
                    </Text>
                  </PressableScale>
                )
              })}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.sectionCompact}>
            <Text style={styles.sectionTitle}>Notifications</Text>

            <View style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>New followers</Text>
                <Text style={styles.notifSubtitle}>When someone follows you</Text>
              </View>
              <Switch
                value={notificationsEnabled && notifPrefs.new_followers}
                onValueChange={(v) => handleNotificationToggle('new_followers', v)}
                trackColor={{ false: '#39393D', true: Colors.cream }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#39393D"
              />
            </View>

            <View style={styles.notifRow}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Friend activity</Text>
                <Text style={styles.notifSubtitle}>When someone you follow logs a game</Text>
              </View>
              <Switch
                value={notificationsEnabled && notifPrefs.friend_activity}
                onValueChange={(v) => handleNotificationToggle('friend_activity', v)}
                trackColor={{ false: '#39393D', true: Colors.cream }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#39393D"
              />
            </View>

            <View style={[styles.notifRow, styles.notifRowLast]}>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Streak reminders</Text>
                <Text style={styles.notifSubtitle}>Reminder to keep your streak alive</Text>
              </View>
              <Switch
                value={notificationsEnabled && notifPrefs.streak_reminders}
                onValueChange={(v) => handleNotificationToggle('streak_reminders', v)}
                trackColor={{ false: '#39393D', true: Colors.cream }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#39393D"
              />
            </View>
          </View>
          </View>

          {/* ═══ Group 4: Developer Tools + Account (alternate) ═══ */}
          <View style={[styles.sectionGroup, { backgroundColor: Colors.alternate }]}>
          {/* Developer Tools - Only visible to developer */}
          {profile?.username === 'abdulla' && (
            <View style={styles.sectionCompact}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Developer Tools</Text>
                <PremiumBadge size="small" variant="developer" />
              </View>

              <PressableScale
                style={styles.devToolButton}
                onPress={() => navigation.navigate('AdminHeroBanners')}
                haptic="light"
              >
                <View style={styles.devToolContent}>
                  <Ionicons name="images-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                  <View style={styles.devToolText}>
                    <Text style={styles.devToolTitle}>Hero Banners</Text>
                    <Text style={styles.devToolSubtitle}>Manage homepage featured banners</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
              </PressableScale>

              <PressableScale
                style={[styles.devToolButton, { marginTop: Spacing.sm }]}
                onPress={() => navigation.navigate('AdminCuratedLists')}
                haptic="light"
              >
                <View style={styles.devToolContent}>
                  <Ionicons name="list-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                  <View style={styles.devToolText}>
                    <Text style={styles.devToolTitle}>Curated Lists</Text>
                    <Text style={styles.devToolSubtitle}>Manage discovery lists</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
              </PressableScale>

              <PressableScale
                style={[styles.devToolButton, { marginTop: Spacing.sm }]}
                onPress={handleResetOnboarding}
                haptic="medium"
              >
                <View style={styles.devToolContent}>
                  <Ionicons name="refresh-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                  <View style={styles.devToolText}>
                    <Text style={styles.devToolTitle}>Reset Onboarding</Text>
                    <Text style={styles.devToolSubtitle}>Clear flags and replay the tour</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
              </PressableScale>

              <PressableScale
                style={[styles.devToolButton, { marginTop: Spacing.sm }]}
                onPress={() => navigation.navigate('PersonalisationPreview')}
                haptic="light"
              >
                <View style={styles.devToolContent}>
                  <Ionicons name="person-circle-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                  <View style={styles.devToolText}>
                    <Text style={styles.devToolTitle}>Preview Personalisation</Text>
                    <Text style={styles.devToolSubtitle}>View the screen without saving</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
              </PressableScale>

              <PressableScale
                style={[styles.devToolButton, { marginTop: Spacing.sm }]}
                onPress={() => navigation.navigate('PaywallPreview')}
                haptic="light"
              >
                <View style={styles.devToolContent}>
                  <Ionicons name="ribbon-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                  <View style={styles.devToolText}>
                    <Text style={styles.devToolTitle}>Preview Paywall</Text>
                    <Text style={styles.devToolSubtitle}>View the supporter screen</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
              </PressableScale>
            </View>
          )}

          {/* Account */}
          <View style={styles.sectionCompact}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
              <Text style={styles.infoValue} selectable>{user?.email || 'Not available'}</Text>
            </View>

            <PressableScale
              style={styles.importGamesButton}
              onPress={() => navigation.navigate('PlatformConnections')}
              haptic="light"
            >
              <View style={styles.importGamesContent}>
                <Ionicons name="cloud-download-outline" size={24} color={'rgba(192, 200, 208, 0.6)'} />
                <View style={styles.importGamesText}>
                  <Text style={styles.importGamesTitle}>Import from platforms</Text>
                  <Text style={styles.importGamesSubtitle}>
                    Steam, PlayStation, Xbox
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </PressableScale>
          </View>

          {/* Actions */}
          <View style={styles.sectionCompact}>
            <PressableScale style={styles.signOutButton} onPress={handleSignOut} haptic="medium" accessibilityLabel="Sign out" accessibilityRole="button" accessibilityHint="Signs out of your account">
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.signOutText}>SIGN OUT</Text>
            </PressableScale>
          </View>
          </View>

          {/* Legal */}
          <View style={styles.legalRow}>
            <PressableScale
              onPress={() => Linking.openURL('https://sweaty-v1.vercel.app/terms')}
              hitSlop={8}
              haptic="light"
            >
              <Text style={styles.legalLink}>Terms of Use</Text>
            </PressableScale>
            <Text style={styles.legalDot}>&middot;</Text>
            <PressableScale
              onPress={() => Linking.openURL('https://sweaty-v1.vercel.app/privacy')}
              hitSlop={8}
              haptic="light"
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </PressableScale>
          </View>

          {/* App Version */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>sweaty v1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Banner Selector Modal */}
      <BannerSelector
        visible={bannerSelectorVisible}
        onClose={() => setBannerSelectorVisible(false)}
        onSelect={handleBannerSelect}
        currentBannerUrl={bannerUrl}
      />
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
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  saveButton: {
    padding: Spacing.sm,
    minWidth: 50,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.cream,
  },
  saveTextDisabled: {
    color: Colors.textDim,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  sectionGroup: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.surfaceBright,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  changeAvatarText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: 'rgba(192, 200, 208, 0.6)',
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionCompact: {
    marginBottom: Spacing.lg,
  },
  // zoneDivider removed — replaced by alternating section group backgrounds
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sectionHeaderBelow,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sectionHeaderBelow,
  },
  bannerPreviewContainer: {
    width: '100%',
    height: BANNER_PREVIEW_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  bannerPreviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPreviewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  bannerEditOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.xs,
  },
  bannerPlaceholderText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  bannerLockedContainer: {
    width: '100%',
    height: BANNER_PREVIEW_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  bannerLockedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  bannerLockedText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    fontSize: FontSize.md,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  usernamePrefix: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textDim,
  },
  usernameInput: {
    fontFamily: Fonts.body,
    flex: 1,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.xs,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: 0,
  },
  charCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  platformsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  platformButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  platformButtonSelected: {
    borderColor: Colors.cream,
    backgroundColor: 'rgba(192, 200, 208, 0.08)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  infoValue: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  devToolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devToolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  devToolText: {
    gap: 2,
  },
  devToolTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  devToolSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  importGamesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  importGamesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  importGamesText: {
    gap: 2,
  },
  importGamesTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  importGamesSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  signOutText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.error,
  },
  iconPickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  iconOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  iconOptionSelected: {
    borderColor: Colors.cream,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconOptionImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  iconOptionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  iconOptionLabelSelected: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  notifRowLast: {
    borderBottomWidth: 0,
  },
  notifInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  notifTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  notifSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  legalLink: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  legalDot: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  appVersion: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
})
