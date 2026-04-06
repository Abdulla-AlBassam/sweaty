import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  Image,
  Modal,
  Alert,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { API_CONFIG } from '../constants'
import { AuthStackParamList } from '../navigation'

// Hero background image - Metal Gear Solid 3 artwork
const heroBackground = require('../../assets/images/login-hero.png')
const sweatyLogo = require('../../assets/images/sweaty-logo.png')

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const handleLogin = async () => {
    const input = emailOrUsername.trim()

    if (!input || !password.trim()) {
      setError('please fill in all fields')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let loginEmail = input

      // If input doesn't contain @, treat it as a username and look up the email
      if (!input.includes('@')) {
        const response = await fetch(`${API_CONFIG.baseUrl}/api/auth/lookup-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: input }),
        })

        if (!response.ok) {
          const data = await response.json()
          if (response.status === 404) {
            setError('username not found')
            setIsLoading(false)
            return
          }
          throw new Error(data.error || 'Failed to look up username')
        }

        const data = await response.json()
        loginEmail = data.email
      }

      const { error: signInError } = await signIn(loginEmail, password)

      if (signInError) {
        setError('invalid email/username or password')
      }
    } catch (err) {
      setError('an error occurred. please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      const { error: googleError, needsUsername } = await signInWithGoogle()

      if (googleError) {
        if (googleError.message !== 'Login cancelled') {
          setError('google sign-in failed. please try again.')
        }
      } else if (needsUsername) {
        // User signed in but needs to set up profile
        // Navigation will handle this via auth state
      }
    } catch (err) {
      setError('an error occurred. please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    if (!resetEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }

    setIsResetting(true)
    try {
      const { error } = await resetPassword(resetEmail.trim())
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send reset email')
      } else {
        Alert.alert(
          'Check your email',
          'We sent you a password reset link. Please check your email.',
          [{ text: 'OK', onPress: () => setShowForgotPassword(false) }]
        )
        setResetEmail('')
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <ImageBackground
      source={heroBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Dark overlay for text readability */}
      <View style={styles.overlay} />

      {/* Edge gradients for smooth blending */}
      <LinearGradient
        colors={['rgba(15, 15, 15, 0.9)', 'transparent']}
        style={styles.edgeGradientTop}
      />
      <LinearGradient
        colors={['transparent', 'rgba(15, 15, 15, 0.95)']}
        style={styles.edgeGradientBottom}
      />
      <LinearGradient
        colors={['rgba(15, 15, 15, 0.7)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.edgeGradientLeft}
      />
      <LinearGradient
        colors={['transparent', 'rgba(15, 15, 15, 0.7)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.edgeGradientRight}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <Image source={sweatyLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="Sweaty logo" />
            <Text style={styles.tagline}>Track your gaming journey</Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.formCard}>
              <View style={styles.form}>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email or Username"
                    placeholderTextColor={Colors.textDim}
                    value={emailOrUsername}
                    onChangeText={setEmailOrUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Email or username"
                  />
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Password"
                    placeholderTextColor={Colors.textDim}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    accessibilityLabel="Password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button">
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => setShowForgotPassword(true)}
                  accessibilityLabel="Forgot password"
                  accessibilityRole="button"
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  accessibilityLabel="Sign in"
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.buttonText}>LOG IN</Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Sign In */}
                <TouchableOpacity
                  style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  accessibilityLabel="Sign in with Google"
                  accessibilityRole="button"
                >
                  {isGoogleLoading ? (
                    <LoadingSpinner size="small" color={Colors.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={Colors.text} />
                      <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')} accessibilityLabel="Create an account" accessibilityRole="link">
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="fade"
        transparent
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor={Colors.textDim}
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoFocus
              accessibilityLabel="Email for password reset"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowForgotPassword(false)
                  setResetEmail('')
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitButton, isResetting && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={isResetting}
              >
                {isResetting ? (
                  <LoadingSpinner size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  edgeGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  edgeGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  edgeGradientLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 80,
  },
  edgeGradientRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 80,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    letterSpacing: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontFamily: Fonts.body,
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(21, 21, 21, 0.7)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  form: {
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputField: {
    flex: 1,
    fontFamily: Fonts.body,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  eyeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: Fonts.bodyBold,
    color: Colors.background,
    fontSize: FontSize.md,
    letterSpacing: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Fonts.body,
    color: Colors.textDim,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  googleButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
    fontSize: FontSize.sm,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  footerLink: {
    fontFamily: Fonts.bodyBold,
    color: Colors.accentSoft,
    fontSize: FontSize.md,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgotPasswordText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: FontSize.xl,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalInput: {
    fontFamily: Fonts.body,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
  },
})
