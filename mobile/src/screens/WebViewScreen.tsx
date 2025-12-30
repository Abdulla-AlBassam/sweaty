import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { MainStackParamList } from '../navigation'
import PressableScale from '../components/PressableScale'

type WebViewRouteProp = RouteProp<MainStackParamList, 'WebView'>

export default function WebViewScreen() {
  const navigation = useNavigation()
  const route = useRoute<WebViewRouteProp>()
  const { url, title } = route.params

  const webViewRef = useRef<WebView>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  const handleShare = async () => {
    try {
      await Share.share({
        url,
        message: url,
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleOpenInBrowser = () => {
    Linking.openURL(url)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          haptic="light"
        >
          <Ionicons name="close" size={24} color={Colors.text} />
        </PressableScale>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <PressableScale
            style={styles.headerButton}
            onPress={handleShare}
            haptic="light"
          >
            <Ionicons name="share-outline" size={22} color={Colors.text} />
          </PressableScale>
          <PressableScale
            style={styles.headerButton}
            onPress={handleOpenInBrowser}
            haptic="light"
          >
            <Ionicons name="open-outline" size={22} color={Colors.text} />
          </PressableScale>
        </View>
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webView}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack)
          setCanGoForward(navState.canGoForward)
        }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        )}
      />

      {/* Bottom navigation bar */}
      <View style={styles.bottomBar}>
        <PressableScale
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goBack()}
          haptic="light"
          disabled={!canGoBack}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={canGoBack ? Colors.text : Colors.textDim}
          />
        </PressableScale>

        <PressableScale
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goForward()}
          haptic="light"
          disabled={!canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canGoForward ? Colors.text : Colors.textDim}
          />
        </PressableScale>

        <PressableScale
          style={styles.navButton}
          onPress={() => webViewRef.current?.reload()}
          haptic="light"
        >
          <Ionicons name="reload" size={22} color={Colors.text} />
        </PressableScale>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
  },
  loadingBar: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xl,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
})
