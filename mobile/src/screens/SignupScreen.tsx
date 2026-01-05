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
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { AuthStackParamList } from '../navigation'

// Hero background image - Resident Evil artwork
const heroBackground = require('../../assets/images/signup-hero.png')

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
            <Text style={styles.logo}>SWEATY</Text>
            <Text style={styles.tagline}>Create your account</Text>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={Colors.textDim}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textDim}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    fontFamily: Fonts.display,
    fontSize: 48,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  form: {
    gap: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
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
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerLink: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
    fontSize: FontSize.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
