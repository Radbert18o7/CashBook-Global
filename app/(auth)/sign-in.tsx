import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleSignInButton, isGoogleOAuthConfigured } from '@/components/auth/GoogleSignInButton';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useColors } from '@/hooks/useColors';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { signInWithEmail, sendResetPassword } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const theme = useSettingsTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  }

  async function handleEmailSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/');
    } catch (e: unknown) {
      setError(getFirebaseAuthMessage(e, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email to reset password.');
      return;
    }
    setError(null);
    try {
      await sendResetPassword(email.trim());
      Alert.alert('Password reset', 'Check your email for reset instructions.');
    } catch (e: unknown) {
      setError(getFirebaseAuthMessage(e, 'Failed to send reset email'));
    }
  }

  const bottomPad = 24 + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sign In" theme={theme} colors={colors} onBack={goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        >
          <ThemedText style={[styles.lead, { color: colors.textSecondary }]}>
            Welcome back — sign in with email or Google.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>Email address</ThemedText>
            <ThemedTextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              accessibilityLabel="Email address"
            />

            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Password
            </ThemedText>
            <ThemedTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              accessibilityLabel="Password"
            />
          </View>

          {!!error && (
            <ThemedText style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={loading}
            onPress={() => void handleEmailSignIn()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
          >
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {loading ? 'Signing in...' : 'Sign In'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => void handleForgotPassword()} style={styles.linkButton} accessibilityRole="button">
            <ThemedText type="link" style={{ color: colors.primary }}>
              Forgot Password?
            </ThemedText>
          </Pressable>

          {isGoogleOAuthConfigured() ? (
            <GoogleSignInButton
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              onSignedIn={() => router.replace('/')}
            />
          ) : (
            <ThemedText style={[styles.googleHint, { color: colors.textTertiary }]}>
              Google sign-in needs OAuth client IDs in .env (see .env.example).
            </ThemedText>
          )}

          <View style={styles.bottomRow}>
            <ThemedText style={{ color: colors.textSecondary }}>Don&apos;t have an account? </ThemedText>
            <Link href="/sign-up" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Go to sign up">
                <ThemedText type="link" style={{ color: colors.primary }}>
                  Sign Up
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  fieldLabelSpaced: { marginTop: 12 },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF' },
  disabled: { opacity: 0.7 },
  pressed: { opacity: 0.9 },
  linkButton: { alignSelf: 'center', marginTop: 4 },
  error: { textAlign: 'center', marginTop: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, flexWrap: 'wrap', gap: 4 },
  googleHint: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});
