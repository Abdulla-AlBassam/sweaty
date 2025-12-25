import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { usePremium } from '../hooks/usePremium'
import BannerSelector from '../components/BannerSelector'
import PremiumBadge from '../components/PremiumBadge'
import { BannerOption } from '../constants/banners'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_PREVIEW_HEIGHT = 80

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { isPremium } = usePremium(profile?.subscription_tier, profile?.subscription_expires_at)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingBanner, setIsSavingBanner] = useState(false)
  const [bannerSelectorVisible, setBannerSelectorVisible] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url || null)
      setBannerUrl(profile.banner_url || null)
      setDisplayName(profile.display_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
    }
  }, [profile])

  useEffect(() => {
    const originalDisplayName = profile?.display_name || ''
    const originalBio = profile?.bio || ''
    const originalUsername = profile?.username || ''
    const originalAvatar = profile?.avatar_url || null

    setHasChanges(
      displayName !== originalDisplayName ||
      bio !== originalBio ||
      username !== originalUsername ||
      avatarUrl !== originalAvatar
    )
  }, [displayName, bio, username, avatarUrl, profile])

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
      await uploadAvatar(result.assets[0].uri)
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

      // Read the file as base64
      const response = await fetch(uri)
      const blob = await response.blob()

      // Convert blob to ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer()

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
    if (!user || !hasChanges) return

    // Validate username
    if (!validateUsername(username)) {
      return
    }

    // Check if username is taken (if changed)
    if (username !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

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
          display_name: displayName.trim() || null,
          username: username,
          bio: bio.trim() || null,
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
      'sign out',
      'are you sure you want to sign out?',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'sign out', style: 'destructive', onPress: signOut },
      ]
    )
  }

  const handleBannerSelect = async (banner: BannerOption) => {
    if (!user) return

    setIsSavingBanner(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          banner_url: banner.url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setBannerUrl(banner.url)
      setBannerSelectorVisible(false)
      await refreshProfile()
      Alert.alert('Success', 'Banner updated successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update banner')
    } finally {
      setIsSavingBanner(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || isSaving || !!usernameError}
          style={styles.saveButton}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={[styles.saveText, (!hasChanges || !!usernameError) && styles.saveTextDisabled]}>
              save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <ActivityIndicator size="large" color={Colors.accent} />
                </View>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={50} color={Colors.textDim} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color={Colors.text} />
              </View>
            </TouchableOpacity>
            <Text style={styles.changeAvatarText}>change avatar</Text>
          </View>

          {/* Banner Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>profile banner</Text>
              <PremiumBadge size="small" />
            </View>

            {isPremium ? (
              <TouchableOpacity
                style={styles.bannerPreviewContainer}
                onPress={() => setBannerSelectorVisible(true)}
              >
                {bannerUrl ? (
                  <View style={styles.bannerPreviewWrapper}>
                    <Image
                      source={{ uri: bannerUrl }}
                      style={styles.bannerPreview}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={styles.bannerPreviewGradient}
                    />
                    <View style={styles.bannerEditOverlay}>
                      <Ionicons name="create-outline" size={20} color={Colors.text} />
                      <Text style={styles.bannerEditText}>Change Banner</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
                    <Text style={styles.bannerPlaceholderText}>Tap to select a banner</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.bannerLockedContainer}>
                <View style={styles.bannerLockedContent}>
                  <Ionicons name="lock-closed" size={24} color={Colors.textDim} />
                  <Text style={styles.bannerLockedText}>
                    Upgrade to Premium to customize your profile banner
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>display name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={Colors.textDim}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>username</Text>
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
                />
              </View>
              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={(text) => setBio(text.slice(0, 160))}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.textDim}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/160</Text>
            </View>
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>account</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.signOutText}>sign out</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appName}>sweaty</Text>
            <Text style={styles.appVersion}>version 1.0.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Banner Selector Modal */}
      <BannerSelector
        visible={bannerSelectorVisible}
        onClose={() => setBannerSelectorVisible(false)}
        onSelect={handleBannerSelect}
        currentBannerUrl={bannerUrl}
        isLoading={isSavingBanner}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
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
    color: Colors.accentLight,
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
    padding: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    backgroundColor: Colors.accent,
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
    color: Colors.accentLight,
    marginTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  bannerEditText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
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
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  usernamePrefix: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    paddingLeft: Spacing.md,
  },
  usernameInput: {
    fontFamily: Fonts.body,
    flex: 1,
    padding: Spacing.md,
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
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  charCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  appName: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.accentLight,
  },
  appVersion: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
})
