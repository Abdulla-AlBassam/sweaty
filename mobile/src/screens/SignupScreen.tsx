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
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { AuthStackParamList } from '../navigation'

// Hero background image - Resident Evil artwork
const heroBackground = require('../../assets/images/signup-hero.png')
const sweatyLogo = require('../../assets/images/sweaty-logo.png')

type SignupScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>
}

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)

  const validateUsername = (value: string): boolean => {
    // 3-20 characters, alphanumeric and underscore only
    const regex = /^[a-zA-Z0-9_]{3,20}$/
    return regex.test(value)
  }

  const handleSignup = async () => {
    // Reset error
    setError(null)

    // Validation
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('please fill in all fields')
      return
    }

    if (!email.includes('@')) {
      setError('please enter a valid email address')
      return
    }

    if (!validateUsername(username)) {
      setError('username must be 3-20 characters (letters, numbers, underscore)')
      return
    }

    if (password.length < 6) {
      setError('password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { error: signUpError, needsEmailVerification } = await signUp(
        email.trim(),
        password,
        username.toLowerCase().trim(),
        username.trim() // Use username as display name initially
      )

      if (signUpError) {
        // Handle specific errors
        if (signUpError.message.includes('already registered')) {
          setError('an account with this email already exists')
        } else if (signUpError.message.includes('username')) {
          setError('username is already taken')
        } else {
          setError(signUpError.message || 'failed to create account')
        }
      } else if (needsEmailVerification) {
        // Show verification message screen
        setShowVerificationMessage(true)
      }
      // If successful and no verification needed, AuthContext will update and navigation will switch to MainStack
    } catch (err) {
      setError('an error occurred. please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show verification message screen
  if (showVerificationMessage) {
    return (
      <ImageBackground
        source={heroBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <LinearGradient
          colors={['rgba(15, 15, 15, 0.9)', 'transparent']}
          style={styles.edgeGradientTop}
        />
        <LinearGradient
          colors={['transparent', 'rgba(15, 15, 15, 0.95)']}
          style={styles.edgeGradientBottom}
        />
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationIcon}>✉️</Text>
          <Text style={styles.verificationTitle}>Check your email</Text>
          <Text style={styles.verificationText}>
            We sent a verification link to{'\n'}
            <Text style={styles.verificationEmail}>{email}</Text>
          </Text>
          <Text style={styles.verificationSubtext}>
            Click the link in the email to verify your account, then come back and log in.
          </Text>
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={() => navigation.navigate('Login')}
            accessibilityLabel="Go to login"
            accessibilityRole="button"
          >
            <Text style={styles.verificationButtonText}>GO TO LOGIN</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    )
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
            <Text style={styles.tagline}>Create your account</Text>

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
                    placeholder="Email"
                    placeholderTextColor={Colors.textDim}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    accessibilityLabel="Email"
                  />
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Username"
                    placeholderTextColor={Colors.textDim}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Username"
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

                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textDim}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    accessibilityLabel="Confirm password"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton} accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'} accessibilityRole="button">
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSignup}
                  disabled={isLoading}
                  accessibilityLabel="Create account"
                  accessibilityRole="button"
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityLabel="Sign in to existing account" accessibilityRole="link">
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  verificationIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  verificationTitle: {
    fontFamily: Fonts.displaySemiBold,
    fontSize: FontSize.xxl,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  verificationText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  verificationEmail: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  verificationSubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  verificationButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  verificationButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
  },
})
