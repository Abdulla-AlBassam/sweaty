import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { AuthStackParamList } from '../navigation'

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
      setError('Please fill in all fields')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters (letters, numbers, underscore)')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { error: signUpError } = await signUp(
        email.trim(),
        password,
        username.toLowerCase().trim(),
        username.trim() // Use username as display name initially
      )

      if (signUpError) {
        // Handle specific errors
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists')
        } else if (signUpError.message.includes('username')) {
          setError('Username is already taken')
        } else {
          setError(signUpError.message || 'Failed to create account')
        }
      }
      // If successful, AuthContext will update and navigation will switch to MainStack
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
          <Text style={styles.logo}>sweaty</Text>
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
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.buttonText}>Create account</Text>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
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
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
})
