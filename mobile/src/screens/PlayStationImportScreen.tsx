import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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

export default function PlayStationImportScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const { importPlayStationCSV, isLoading } = usePlatformImport(user?.id)

  const [importState, setImportState] = useState<ImportState>('idle')
  const [selectedFile, setSelectedFile] = useState<{
    uri: string
    name: string
    size: number
  } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [processingStatus, setProcessingStatus] = useState('')

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

  const handleImport = async () => {
    if (!selectedFile) return

    setImportState('importing')
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
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
          <Text style={styles.processingTitle}>Processing your games...</Text>
          <Text style={styles.processingStatus}>{processingStatus}</Text>
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
              Imported {importResult.imported} games
            </Text>
            <Text style={styles.successSubtitle}>from PlayStation</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total rows processed</Text>
              <Text style={styles.statValue}>{importResult.total_rows}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Games imported</Text>
              <Text style={styles.statValue}>{importResult.imported}</Text>
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
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IMPORT FAILED</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={64} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Import Failed</Text>
          <Text style={styles.errorMessage}>{importResult.error}</Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Default/idle state
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

        {/* Instructions */}
        <Text style={styles.instructions}>
          Export your games from PlayStation, then upload the CSV file here.
        </Text>

        {/* How to Export Accordion */}
        <View style={styles.accordionContainer}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('howto')}
          >
            <Text style={styles.accordionTitle}>How to export your games</Text>
            <Ionicons
              name={expandedSection === 'howto' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {expandedSection === 'howto' && (
            <View style={styles.accordionContent}>
              {/* Option 1 */}
              <View style={styles.optionContainer}>
                <Text style={styles.optionTitle}>Option 1: Browser Extension (Easiest)</Text>
                <Text style={styles.optionStep}>1. On your computer, install "PSN Library Exporter" for Chrome</Text>
                <Text style={styles.optionStep}>2. Go to store.playstation.com and sign in</Text>
                <Text style={styles.optionStep}>3. Click the extension icon</Text>
                <Text style={styles.optionStep}>4. Download the CSV file</Text>
                <Text style={styles.optionStep}>5. Transfer to your phone or upload from computer</Text>
              </View>

              {/* Option 2 */}
              <View style={styles.optionContainer}>
                <Text style={styles.optionTitle}>Option 2: PSNProfiles Export</Text>
                <Text style={styles.optionStep}>1. Go to psnprofiles.com</Text>
                <Text style={styles.optionStep}>2. Search for your PSN username</Text>
                <Text style={styles.optionStep}>3. Go to your profile → Games</Text>
                <Text style={styles.optionStep}>4. Click Export → Download CSV</Text>
              </View>

              {/* Option 3 */}
              <View style={styles.optionContainer}>
                <Text style={styles.optionTitle}>Option 3: Request from Sony</Text>
                <Text style={styles.optionStepNote}>(Takes a few days)</Text>
                <Text style={styles.optionStep}>1. Go to PlayStation account settings</Text>
                <Text style={styles.optionStep}>2. Request your personal data (GDPR)</Text>
                <Text style={styles.optionStep}>3. Sony will email you a download link</Text>
                <Text style={styles.optionStep}>4. Extract the games CSV from the zip</Text>
              </View>
            </View>
          )}
        </View>

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
              <Ionicons name="document-text" size={32} color={Colors.accent} />
              <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
              <Text style={styles.selectedFileSize}>
                {formatFileSize(selectedFile.size)}
              </Text>
              <Text style={styles.tapToChange}>Tap to change file</Text>
            </View>
          ) : (
            <View style={styles.uploadContent}>
              <Ionicons name="cloud-upload-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.uploadText}>Choose CSV File</Text>
              <Text style={styles.uploadSubtext}>or drag and drop your file here</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Import Button */}
        {selectedFile && (
          <TouchableOpacity
            style={[styles.importButton, isLoading && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="small" color={Colors.text} />
            ) : (
              <Text style={styles.importButtonText}>IMPORT GAMES</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Note */}
        <Text style={styles.noteText}>
          This is a one-time import. Your games will be matched to our database
          for cover art and details. You can import again anytime to add new games.
        </Text>
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
    marginBottom: Spacing.lg,
  },
  instructions: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
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
  accordionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  accordionContent: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionContainer: {
    marginBottom: Spacing.lg,
  },
  optionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
    marginBottom: Spacing.sm,
  },
  optionStep: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  optionStepNote: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  uploadArea: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    marginBottom: Spacing.lg,
  },
  uploadAreaSelected: {
    borderColor: Colors.accent,
    borderStyle: 'solid',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  uploadSubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  selectedFileContainer: {
    alignItems: 'center',
  },
  selectedFileName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  selectedFileSize: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  tapToChange: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  importButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  noteText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
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
