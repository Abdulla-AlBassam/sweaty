import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import SweatDropIcon from '../components/SweatDropIcon'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { usePlatformImport, ImportResult, MatchedGame } from '../hooks/usePlatformImport'
import LoadingSpinner from '../components/LoadingSpinner'
import LogGameModal from '../components/LogGameModal'

type ImportState = 'idle' | 'selected' | 'importing' | 'success' | 'error' | 'continue'

type PlayStationImportRouteParams = {
  continueLogging?: boolean
  unloggedGames?: MatchedGame[]
}

export default function PlayStationImportScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<{ params: PlayStationImportRouteParams }, 'params'>>()
  const { user } = useAuth()
  const { importPlayStationCSV, isLoading } = usePlatformImport(user?.id)

  // Check if we're continuing logging from previous import
  const continueLogging = route.params?.continueLogging
  const initialUnloggedGames = route.params?.unloggedGames || []

  const [importState, setImportState] = useState<ImportState>(
    continueLogging ? 'continue' : 'idle'
  )
  const [continueGames, setContinueGames] = useState<MatchedGame[]>(initialUnloggedGames)
  const [selectedFile, setSelectedFile] = useState<{
    uri: string
    name: string
    size: number
  } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingStage, setProcessingStage] = useState<'reading' | 'uploading' | 'matching'>('reading')
  const [rowCount, setRowCount] = useState(0)

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (importState === 'importing') {
      // Animate progress bar back and forth (indeterminate)
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      )
      animation.start()
      return () => animation.stop()
    } else {
      progressAnim.setValue(0)
    }
  }, [importState, progressAnim])

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
    setProcessingStage('reading')
    setProcessingStatus('Reading your file...')
    setRowCount(0)

    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri)

      // Count rows (excluding header)
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim())
      const dataRows = Math.max(0, lines.length - 1) // Subtract header row
      setRowCount(dataRows)
      setProcessingStatus(`Found ${dataRows} items in your library`)

      // Small delay to show the count
      await new Promise(resolve => setTimeout(resolve, 800))

      setProcessingStage('uploading')
      setProcessingStatus('Uploading to server...')

      // Another small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500))

      setProcessingStage('matching')
      setProcessingStatus('Matching games with IGDB database...')

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
      // If in continue mode, remove from continueGames for real-time update
      if (importState === 'continue') {
        setContinueGames(prev => prev.filter(g => g.igdb_id !== selectedGameForLog.id))
      }
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
    // cover_url from API is already a full URL
    const coverUrl = item.cover_url

    // Debug: Log cover URL for first few items
    if (item.igdb_id && !coverUrl) {
      console.log(`No cover for: ${item.name} (ID: ${item.igdb_id})`)
    }

    return (
      <View style={styles.gameItem}>
        <View style={styles.gameItemLeft}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.gameCover}
              resizeMode="cover"
              onError={(e) => console.log(`Image load error for ${item.name}:`, e.nativeEvent.error)}
              accessibilityLabel={`${item.name} cover art`}
            />
          ) : (
            <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
              <SweatDropIcon size={20} variant="static" />
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
            style={styles.logButtonWrapper}
            onPress={() => handleLogGame(item)}
            accessibilityLabel={`Log ${item.name}`}
            accessibilityRole="button"
          >
            {/* RGB Chromatic aberration layers */}
            <View style={[styles.logButtonLayer, styles.logButtonCyan]} />
            <View style={[styles.logButtonLayer, styles.logButtonGreen]} />
            <View style={styles.logButton}>
              <Text style={styles.logButtonText}>LOG</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // Importing state
  if (importState === 'importing') {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    })

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
            {processingStage === 'reading' && 'Reading your file...'}
            {processingStage === 'uploading' && 'Uploading...'}
            {processingStage === 'matching' && 'Matching games...'}
          </Text>

          <Text style={styles.processingStatus}>{processingStatus}</Text>

          {rowCount > 0 && (
            <Text style={styles.rowCountText}>Processing {rowCount} items</Text>
          )}

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidth },
              ]}
            />
          </View>

          {/* Stage indicators */}
          <View style={styles.stageIndicators}>
            <View style={styles.stageItem}>
              <View style={[
                styles.stageDot,
                processingStage === 'reading' && styles.stageDotActive,
                (processingStage === 'uploading' || processingStage === 'matching') && styles.stageDotComplete,
              ]} />
              <Text style={[
                styles.stageText,
                processingStage === 'reading' && styles.stageTextActive,
              ]}>Read</Text>
            </View>
            <View style={styles.stageLine} />
            <View style={styles.stageItem}>
              <View style={[
                styles.stageDot,
                processingStage === 'uploading' && styles.stageDotActive,
                processingStage === 'matching' && styles.stageDotComplete,
              ]} />
              <Text style={[
                styles.stageText,
                processingStage === 'uploading' && styles.stageTextActive,
              ]}>Upload</Text>
            </View>
            <View style={styles.stageLine} />
            <View style={styles.stageItem}>
              <View style={[
                styles.stageDot,
                processingStage === 'matching' && styles.stageDotActive,
              ]} />
              <Text style={[
                styles.stageText,
                processingStage === 'matching' && styles.stageTextActive,
              ]}>Match</Text>
            </View>
          </View>

          {/* Don't close app warning */}
          <Text style={styles.dontCloseWarning}>
            Please don't close the app — this may take a couple minutes
          </Text>
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
          <TouchableOpacity onPress={handleDone} style={styles.doneHeaderButton} accessibilityLabel="Done" accessibilityRole="button">
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
            <SweatDropIcon size={48} variant="static" />
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
              accessibilityLabel={`${expandedSection === 'unmatched' ? 'Collapse' : 'Expand'} unmatched games`}
              accessibilityRole="button"
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
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} accessibilityLabel={loggedCount > 0 ? `Finish with ${loggedCount} logged` : 'Skip for now'} accessibilityRole="button">
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

  // Continue logging state - for returning to log previously imported games
  if (importState === 'continue') {
    const remainingGames = continueGames
    const loggedCount = loggedGames.size
    const totalGames = initialUnloggedGames.length

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONTINUE LOGGING</Text>
          <TouchableOpacity onPress={handleDone} style={styles.doneHeaderButton} accessibilityLabel="Done" accessibilityRole="button">
            <Text style={styles.doneHeaderText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Banner */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryLeft}>
            <LoadingSpinner size={24} />
            <Text style={styles.summaryText}>
              {remainingGames.length} games remaining
            </Text>
          </View>
          <Text style={styles.summaryProgress}>
            {loggedCount} logged this session
          </Text>
        </View>

        {remainingGames.length > 0 ? (
          <FlatList
            data={remainingGames}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.igdb_id.toString()}
            contentContainerStyle={styles.gamesList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
            <Text style={styles.emptyText}>All done!</Text>
            <Text style={styles.emptySubtext}>
              You've logged all your imported games
            </Text>
          </View>
        )}

        {/* Bottom Done Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} accessibilityLabel={remainingGames.length === 0 ? 'Finish' : loggedCount > 0 ? `Finish with ${loggedCount} logged` : 'Skip for now'} accessibilityRole="button">
            <Text style={styles.doneButtonText}>
              {remainingGames.length === 0 ? 'FINISH' : loggedCount > 0 ? `FINISH (${loggedCount} logged)` : 'SKIP FOR NOW'}
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
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
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain} accessibilityLabel="Try again" accessibilityRole="button">
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IMPORT PLAYSTATION</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* PlayStation Logo */}
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="sony-playstation" size={48} color={Colors.platformPlayStation} />
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
              accessibilityLabel={`${expandedSection === 'howto' ? 'Collapse' : 'Expand'} export instructions`}
              accessibilityRole="button"
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
                <Text style={styles.timeEstimate}>Import all your games in less than 5 minutes and save yourself the hassle of manually logging</Text>

                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Step 1: Install the Chrome Extension</Text>
                  <Text style={styles.optionStep}>• On your computer, open Chrome browser</Text>
                  <Text style={styles.optionStep}>• Search "PSN Library Exporter" in the Chrome Web Store</Text>
                  <Text style={styles.optionStep}>• Click "Add to Chrome" to install</Text>
                </View>

                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Step 2: Sign in to PlayStation</Text>
                  <Text style={styles.optionStep}>• Go to store.playstation.com</Text>
                  <Text style={styles.optionStep}>• Sign in with your PSN account</Text>
                  <Text style={styles.optionStep}>• Make sure you're on the main store page</Text>
                </View>

                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Step 3: Export Your Library</Text>
                  <Text style={styles.optionStep}>• Click the extension icon (puzzle piece → PSN Library Exporter)</Text>
                  <Text style={styles.optionStep}>• Click "Export Library" or "Download CSV"</Text>
                  <Text style={styles.optionStep}>• A CSV file will download to your computer</Text>
                </View>

                <View style={styles.optionContainer}>
                  <Text style={styles.optionTitle}>Step 4: Transfer to Your Phone</Text>
                  <Text style={styles.optionStep}>• Email the CSV file to yourself, or</Text>
                  <Text style={styles.optionStep}>• Upload to iCloud/Google Drive, or</Text>
                  <Text style={styles.optionStep}>• AirDrop it to your phone (if on Mac)</Text>
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
            accessibilityLabel={selectedFile ? `Selected file: ${selectedFile.name}. Tap to change` : 'Choose CSV file'}
            accessibilityRole="button"
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
              accessibilityLabel="Import games"
              accessibilityRole="button"
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
  timeEstimate: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.lg,
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
  rowCountText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginTop: Spacing.xl,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  stageIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  stageItem: {
    alignItems: 'center',
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
    marginBottom: Spacing.xs,
  },
  stageDotActive: {
    backgroundColor: Colors.accent,
  },
  stageDotComplete: {
    backgroundColor: Colors.accent,
  },
  stageText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  stageTextActive: {
    color: Colors.accent,
    fontFamily: Fonts.bodySemiBold,
  },
  stageLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dontCloseWarning: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
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
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
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
  logButtonWrapper: {
    position: 'relative',
    width: 56,
    height: 32,
  },
  logButtonLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.sm,
  },
  logButtonCyan: {
    backgroundColor: Colors.cyan,
    opacity: 0.7,
    transform: [{ translateX: -1.5 }],
  },
  logButtonGreen: {
    backgroundColor: Colors.accent,
    opacity: 0.7,
    transform: [{ translateX: 1.5 }],
  },
  logButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.background,
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
