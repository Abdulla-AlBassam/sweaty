import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { usePlatformImport, ImportResult, MatchedGame } from '../hooks/usePlatformImport'
import LoadingSpinner from '../components/LoadingSpinner'
import LogGameModal from '../components/LogGameModal'
import { IGDB_IMAGE_SIZES } from '../constants'

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

  // Review & Log state
  const [loggedGames, setLoggedGames] = useState<Set<number>>(new Set())
  const [selectedGameForLog, setSelectedGameForLog] = useState<{
    id: number
    name: string
    coverUrl: string | null
    platform: string | null
  } | null>(null)
  const [showLogModal, setShowLogModal] = useState(false)

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
    setLoggedGames(new Set())
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleLogGame = (game: MatchedGame) => {
    setSelectedGameForLog({
      id: game.igdb_id,
      name: game.name,
      coverUrl: game.cover_url,
      platform: game.platform,
    })
    setShowLogModal(true)
  }

  const handleLogSaved = () => {
    if (selectedGameForLog) {
      setLoggedGames(prev => new Set(prev).add(selectedGameForLog.id))
    }
    setShowLogModal(false)
    setSelectedGameForLog(null)
  }

  const handleLogModalClose = () => {
    setShowLogModal(false)
    setSelectedGameForLog(null)
  }

  const renderGameItem = ({ item }: { item: MatchedGame }) => {
    const isLogged = loggedGames.has(item.igdb_id)
    const coverUrl = item.cover_url
      ? `${IGDB_IMAGE_SIZES.coverBig}${item.cover_url.split('/').pop()}`
      : null

    return (
      <View style={styles.gameItem}>
        <View style={styles.gameItemLeft}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.gameCover} />
          ) : (
            <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
              <Ionicons name="game-controller" size={20} color={Colors.textDim} />
            </View>
          )}
          <View style={styles.gameInfo}>
            <Text style={styles.gameName} numberOfLines={2}>{item.name}</Text>
            {item.platform && (
              <Text style={styles.gamePlatform}>{item.platform}</Text>
            )}
          </View>
        </View>

        {isLogged ? (
          <View style={styles.loggedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => handleLogGame(item)}
          >
            <Text style={styles.logButtonText}>LOG</Text>
          </TouchableOpacity>
        )}
      </View>
    )
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

  // Success state - Review & Log UI
  if (importState === 'success' && importResult) {
    const matchedGames = importResult.matched_games || []
    const loggedCount = loggedGames.size
    const totalMatched = matchedGames.length

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton} />
          <Text style={styles.headerTitle}>REVIEW & LOG</Text>
          <TouchableOpacity onPress={handleDone} style={styles.doneHeaderButton}>
            <Text style={styles.doneHeaderText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryLeft}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
            <Text style={styles.summaryText}>
              Found {totalMatched} games
            </Text>
          </View>
          <Text style={styles.summaryProgress}>
            {loggedCount}/{totalMatched} logged
          </Text>
        </View>

        {matchedGames.length > 0 ? (
          <FlatList
            data={matchedGames}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.igdb_id.toString()}
            contentContainerStyle={styles.gamesList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No games matched</Text>
            <Text style={styles.emptySubtext}>
              Try importing a different CSV file
            </Text>
          </View>
        )}

        {/* Unmatched Games Accordion */}
        {importResult.unmatched_games && importResult.unmatched_games.length > 0 && (
          <View style={styles.unmatchedSection}>
            <TouchableOpacity
              style={styles.unmatchedHeader}
              onPress={() => toggleSection('unmatched')}
            >
              <Text style={styles.unmatchedTitle}>
                Couldn't match ({importResult.unmatched_games.length})
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

        {/* Bottom Done Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>
              {loggedCount > 0 ? `FINISH (${loggedCount} logged)` : 'SKIP FOR NOW'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Log Game Modal */}
        {selectedGameForLog && (
          <LogGameModal
            visible={showLogModal}
            onClose={handleLogModalClose}
            game={{
              id: selectedGameForLog.id,
              name: selectedGameForLog.name,
              coverUrl: selectedGameForLog.coverUrl || undefined,
              platforms: selectedGameForLog.platform ? [selectedGameForLog.platform] : [],
            }}
            onSaveSuccess={handleLogSaved}
          />
        )}
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
          <Text style={styles.errorMessage}>{importResult.error || 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Default/idle state - CSV import
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
          Export your PlayStation games and import them here to track your collection.
        </Text>

        {/* Primary: CSV Import */}
        <View style={styles.primarySection}>
          <Text style={styles.sectionTitle}>Import from file</Text>
          <Text style={styles.sectionSubtitle}>
            Upload a CSV export of your games
          </Text>

          {/* How to Export Accordion */}
          <View style={styles.howToAccordion}>
            <TouchableOpacity
              style={styles.howToAccordionHeader}
              onPress={() => toggleSection('howto')}
            >
              <View style={styles.accordionHeaderContent}>
                <Ionicons name="help-circle-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.accordionTitle}>How to export your games</Text>
              </View>
              <Ionicons
                name={expandedSection === 'howto' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {expandedSection === 'howto' && (
              <View style={styles.howToAccordionContent}>
                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Option 1: Browser Extension (Easiest)</Text>
                  <Text style={styles.optionStep}>1. On your computer, install "PSN Library Exporter" for Chrome</Text>
                  <Text style={styles.optionStep}>2. Go to store.playstation.com and sign in</Text>
                  <Text style={styles.optionStep}>3. Click the extension icon</Text>
                  <Text style={styles.optionStep}>4. Download the CSV file</Text>
                </View>
                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Option 2: PSNProfiles Export</Text>
                  <Text style={styles.optionStep}>1. Go to psnprofiles.com on your computer</Text>
                  <Text style={styles.optionStep}>2. Search for your PSN username</Text>
                  <Text style={styles.optionStep}>3. Go to your profile → Games tab</Text>
                  <Text style={styles.optionStep}>4. Click Export → Download CSV</Text>
                </View>
                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Option 3: Request from Sony</Text>
                  <Text style={styles.optionStepNote}>(Takes a few days)</Text>
                  <Text style={styles.optionStep}>1. Go to PlayStation account settings</Text>
                  <Text style={styles.optionStep}>2. Request your personal data (GDPR)</Text>
                  <Text style={styles.optionStep}>3. Sony will email you a download link</Text>
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
                <Text style={styles.uploadSubtext}>Tap to select your exported file</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Import Button */}
          {selectedFile && (
            <TouchableOpacity
              style={[styles.findButton, isLoading && styles.findButtonDisabled]}
              onPress={handleCSVImport}
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color={Colors.text} />
              ) : (
                <Text style={styles.findButtonText}>IMPORT GAMES</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Note */}
        <Text style={styles.noteText}>
          After importing, you'll be able to review and log each game to your library
          with status, rating, and more.
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
  doneHeaderButton: {
    width: 60,
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
  },
  doneHeaderText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.accent,
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
  // Primary Section
  primarySection: {
    marginBottom: Spacing.lg,
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
  // How to accordion
  howToAccordion: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  howToAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  howToAccordionContent: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  // Accordion
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
    fontSize: FontSize.sm,
    color: Colors.text,
    marginTop: Spacing.xs,
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
  // Success/Review state
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  summaryProgress: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  gamesList: {
    padding: Spacing.md,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  gameItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameCover: {
    width: 45,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  gameName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  gamePlatform: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  logButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  loggedBadge: {
    paddingHorizontal: Spacing.sm,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  unmatchedSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  unmatchedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  unmatchedTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
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
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    paddingVertical: 2,
  },
  bottomButtonContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
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
