import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { usePlatformImport, ImportResult } from '../hooks/usePlatformImport'
import LoadingSpinner from '../components/LoadingSpinner'

type ImportState = 'idle' | 'selected' | 'importing' | 'success' | 'error'
type ImportMethod = 'username' | 'csv'

export default function PlayStationImportScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const { importPlayStationCSV, importPlayStationByUsername, isLoading } = usePlatformImport(user?.id)

  const [importState, setImportState] = useState<ImportState>('idle')
  const [importMethod, setImportMethod] = useState<ImportMethod>('username')
  const [psnUsername, setPsnUsername] = useState('')
  const [selectedFile, setSelectedFile] = useState<{
    uri: string
    name: string
    size: number
  } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [processingStatus, setProcessingStatus] = useState('')

  const handleUsernameImport = async () => {
    const trimmedUsername = psnUsername.trim()
    if (!trimmedUsername) {
      Alert.alert('Missing Username', 'Please enter your PSN username.')
      return
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 16) {
      Alert.alert('Invalid Username', 'PSN username must be 3-16 characters.')
      return
    }

    Keyboard.dismiss()
    setImportState('importing')
    setImportMethod('username')
    setProcessingStatus('Looking up your profile...')

    try {
      const result = await importPlayStationByUsername(trimmedUsername)

      setImportResult(result)

      if (result.success) {
        setImportState('success')
      } else {
        setImportState('error')
      }
    } catch (err: any) {
      console.error('Username import error:', err)
      setImportResult({ success: false, error: err.message || 'Import failed' })
      setImportState('error')
    }
  }

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDir: true,
      })

      if (result.canceled) {
        return
      }

      const file = result.assets[0]

      // Check file extension
      if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
        Alert.alert('Invalid File', 'Please select a CSV file.')
        return
      }

      // Check file size (5MB max)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a file smaller than 5MB.')
        return
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
      })
      setImportState('selected')
    } catch (err) {
      console.error('Error picking file:', err)
      Alert.alert('Error', 'Failed to select file. Please try again.')
    }
  }

  const handleCSVImport = async () => {
    if (!selectedFile) return

    setImportState('importing')
    setImportMethod('csv')
    setProcessingStatus('Reading file...')

    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri)

      setProcessingStatus('Uploading and processing...')

      const result = await importPlayStationCSV(
        selectedFile.uri,
        selectedFile.name,
        fileContent
      )

      setImportResult(result)

      if (result.success) {
        setImportState('success')
      } else {
        setImportState('error')
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setImportResult({ success: false, error: err.message || 'Import failed' })
      setImportState('error')
    }
  }

  const handleDone = () => {
    navigation.goBack()
  }

  const handleTryAgain = () => {
    setImportState('idle')
    setSelectedFile(null)
    setImportResult(null)
    setPsnUsername('')
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getErrorMessage = (result: ImportResult): { title: string; message: string; hint?: string } => {
    if (result.error_type === 'psn_not_found') {
      return {
        title: 'Profile Not Found',
        message: result.error || 'Username not found',
        hint: 'Check the spelling or make sure your profile exists on PSNProfiles.com',
      }
    }
    if (result.error_type === 'profile_private') {
      return {
        title: 'Private Profile',
        message: 'Your PSN profile is set to private',
        hint: 'Change your privacy settings to Public on PlayStation, then update your PSNProfiles page.',
      }
    }
    return {
      title: 'Import Failed',
      message: result.error || 'Something went wrong',
    }
  }

  // Importing state
  if (importState === 'importing') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>IMPORTING</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <LoadingSpinner size="large" color={Colors.accent} />
          <Text style={styles.processingTitle}>
            {importMethod === 'username' ? 'Finding your games...' : 'Processing your games...'}
          </Text>
          <Text style={styles.processingStatus}>{processingStatus}</Text>
          {importMethod === 'username' && (
            <Text style={styles.processingHint}>This may take a minute</Text>
          )}
        </View>
      </SafeAreaView>
    )
  }

  // Success state
  if (importState === 'success' && importResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>IMPORT COMPLETE</Text>
          <View style={styles.backButton} />
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
            </View>
            <Text style={styles.successTitle}>
              Imported {importResult.total_games || importResult.imported} games
            </Text>
            <Text style={styles.successSubtitle}>
              {importResult.psn_username ? `from @${importResult.psn_username}` : 'from PlayStation'}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total games found</Text>
              <Text style={styles.statValue}>{importResult.total_games || importResult.total_rows}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Matched to database</Text>
              <Text style={[styles.statValue, { color: Colors.accent }]}>
                {importResult.matched}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Unmatched</Text>
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {importResult.unmatched}
              </Text>
            </View>
            {(importResult.skipped || 0) > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Skipped (DLC/themes)</Text>
                <Text style={[styles.statValue, { color: Colors.textMuted }]}>
                  {importResult.skipped}
                </Text>
              </View>
            )}
          </View>

          {importResult.unmatched_games && importResult.unmatched_games.length > 0 && (
            <View style={styles.unmatchedContainer}>
              <TouchableOpacity
                style={styles.unmatchedHeader}
                onPress={() => toggleSection('unmatched')}
              >
                <Text style={styles.unmatchedTitle}>
                  Unmatched Games ({importResult.unmatched_games.length})
                </Text>
                <Ionicons
                  name={expandedSection === 'unmatched' ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
              {expandedSection === 'unmatched' && (
                <View style={styles.unmatchedList}>
                  {importResult.unmatched_games.map((game, index) => (
                    <Text key={index} style={styles.unmatchedGame}>
                      • {game}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>DONE</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Error state
  if (importState === 'error' && importResult) {
    const errorInfo = getErrorMessage(importResult)

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{errorInfo.title.toUpperCase()}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <Ionicons
              name={importResult.error_type === 'profile_private' ? 'lock-closed' : 'close-circle'}
              size={64}
              color={Colors.error}
            />
          </View>
          <Text style={styles.errorTitle}>{errorInfo.title}</Text>
          <Text style={styles.errorMessage}>{errorInfo.message}</Text>
          {errorInfo.hint && (
            <Text style={styles.errorHint}>{errorInfo.hint}</Text>
          )}
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Default/idle state - Redesigned with username as primary
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IMPORT PLAYSTATION</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* PlayStation Logo */}
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="sony-playstation" size={48} color="#006FCD" />
        </View>

        {/* Primary: Username Lookup */}
        <View style={styles.primarySection}>
          <Text style={styles.sectionTitle}>Enter your PSN username</Text>
          <Text style={styles.sectionSubtitle}>
            We'll import your games from PSNProfiles
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.usernameInput}
              placeholder="Your PSN username"
              placeholderTextColor={Colors.textDim}
              value={psnUsername}
              onChangeText={setPsnUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={16}
              returnKeyType="go"
              onSubmitEditing={handleUsernameImport}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.findButton,
              (!psnUsername.trim() || isLoading) && styles.findButtonDisabled,
            ]}
            onPress={handleUsernameImport}
            disabled={!psnUsername.trim() || isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color={Colors.text} />
            ) : (
              <>
                <Ionicons name="search" size={20} color={Colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.findButtonText}>FIND MY GAMES</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Privacy Help Accordion */}
        <View style={styles.accordionContainer}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('privacy')}
          >
            <View style={styles.accordionHeaderContent}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.accordionTitle}>Profile not showing up?</Text>
            </View>
            <Ionicons
              name={expandedSection === 'privacy' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {expandedSection === 'privacy' && (
            <View style={styles.accordionContent}>
              <Text style={styles.privacyIntro}>
                Your profile needs to be public on PSNProfiles for this to work:
              </Text>
              <View style={styles.stepContainer}>
                <Text style={styles.privacyStep}>
                  <Text style={styles.stepNumber}>1.</Text> On your PlayStation, go to Settings → Users and Accounts → Privacy
                </Text>
                <Text style={styles.privacyStep}>
                  <Text style={styles.stepNumber}>2.</Text> Set "Anyone" for "View your game activities"
                </Text>
                <Text style={styles.privacyStep}>
                  <Text style={styles.stepNumber}>3.</Text> Go to psnprofiles.com and search for your username
                </Text>
                <Text style={styles.privacyStep}>
                  <Text style={styles.stepNumber}>4.</Text> Click "Update" to sync your latest games
                </Text>
              </View>
              <Text style={styles.privacyNote}>
                Don't want to make your profile public? Use the CSV import option below instead.
              </Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Secondary: CSV Import */}
        <View style={styles.secondarySection}>
          <TouchableOpacity
            style={styles.csvOption}
            onPress={() => toggleSection('csv')}
          >
            <View style={styles.csvOptionContent}>
              <Ionicons name="document-text-outline" size={24} color={Colors.textMuted} />
              <View style={styles.csvOptionText}>
                <Text style={styles.csvOptionTitle}>Import from file</Text>
                <Text style={styles.csvOptionSubtitle}>Upload a CSV export</Text>
              </View>
            </View>
            <Ionicons
              name={expandedSection === 'csv' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {expandedSection === 'csv' && (
            <View style={styles.csvContent}>
              {/* How to get CSV Accordion */}
              <TouchableOpacity
                style={styles.howToHeader}
                onPress={() => toggleSection('howto')}
              >
                <Text style={styles.howToTitle}>How to export your games</Text>
                <Ionicons
                  name={expandedSection === 'howto' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textDim}
                />
              </TouchableOpacity>

              {expandedSection === 'howto' && (
                <View style={styles.howToContent}>
                  <View style={styles.optionContainer}>
                    <Text style={styles.optionTitle}>Browser Extension (Easiest)</Text>
                    <Text style={styles.optionStep}>1. Install "PSN Library Exporter" for Chrome</Text>
                    <Text style={styles.optionStep}>2. Go to store.playstation.com</Text>
                    <Text style={styles.optionStep}>3. Click the extension → Download CSV</Text>
                  </View>
                  <View style={styles.optionContainer}>
                    <Text style={styles.optionTitle}>PSNProfiles Export</Text>
                    <Text style={styles.optionStep}>1. Go to psnprofiles.com</Text>
                    <Text style={styles.optionStep}>2. Find your profile → Games</Text>
                    <Text style={styles.optionStep}>3. Click Export → Download CSV</Text>
                  </View>
                </View>
              )}

              {/* File Upload Area */}
              <TouchableOpacity
                style={[
                  styles.uploadArea,
                  selectedFile && styles.uploadAreaSelected,
                ]}
                onPress={handlePickFile}
              >
                {selectedFile ? (
                  <View style={styles.selectedFileContainer}>
                    <Ionicons name="document-text" size={24} color={Colors.accent} />
                    <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                    <Text style={styles.selectedFileSize}>
                      {formatFileSize(selectedFile.size)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadContent}>
                    <Ionicons name="cloud-upload-outline" size={32} color={Colors.textDim} />
                    <Text style={styles.uploadText}>Choose CSV File</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Import Button */}
              {selectedFile && (
                <TouchableOpacity
                  style={[styles.csvImportButton, isLoading && styles.findButtonDisabled]}
                  onPress={handleCSVImport}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" color={Colors.text} />
                  ) : (
                    <Text style={styles.csvImportButtonText}>IMPORT FROM FILE</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  // Primary Section (Username)
  primarySection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  usernameInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  findButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findButtonDisabled: {
    opacity: 0.5,
  },
  findButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  // Privacy Accordion
  accordionContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  accordionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accordionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  accordionContent: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  privacyIntro: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  stepContainer: {
    marginBottom: Spacing.md,
  },
  privacyStep: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  stepNumber: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  privacyNote: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    fontStyle: 'italic',
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    paddingHorizontal: Spacing.md,
  },
  // Secondary Section (CSV)
  secondarySection: {
    marginBottom: Spacing.xl,
  },
  csvOption: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  csvOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  csvOptionText: {
    gap: 2,
  },
  csvOptionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  csvOptionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  csvContent: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  howToHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  howToTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  howToContent: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionContainer: {
    marginBottom: Spacing.md,
  },
  optionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    marginBottom: Spacing.xs,
  },
  optionStep: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 2,
    paddingLeft: Spacing.sm,
  },
  uploadArea: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  uploadAreaSelected: {
    borderColor: Colors.accent,
    borderStyle: 'solid',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  selectedFileContainer: {
    alignItems: 'center',
  },
  selectedFileName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  selectedFileSize: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  csvImportButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  csvImportButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Processing state
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  processingTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xl,
    color: Colors.text,
    marginTop: Spacing.xl,
  },
  processingStatus: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  processingHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  // Success state
  successContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xxl,
    color: Colors.text,
  },
  successSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  statsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  statValue: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  unmatchedContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  unmatchedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  unmatchedTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.warning,
  },
  unmatchedList: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  unmatchedGame: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingVertical: Spacing.xs,
  },
  doneButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  // Error state
  errorIcon: {
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xl,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  errorHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  tryAgainButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tryAgainButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
})
