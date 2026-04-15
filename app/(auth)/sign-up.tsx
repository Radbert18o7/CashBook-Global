import { useMemo, useState } from 'react';
import {
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
import { signUpWithEmail } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';
import { getPasswordChecks, passwordMeetsPolicy } from '@/utils/passwordPolicy';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const theme = useSettingsTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const score = useMemo(() => checks.filter((c) => c.ok).length, [checks]);
  const percent = useMemo(
    () => (password.length ? (score / checks.length) * 100 : 0),
    [password.length, score, checks.length],
  );
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordMeetsPolicy(password) &&
    passwordsMatch &&
    !loading;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  }

  async function handleSignUp() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      router.replace('/');
    } catch (e: unknown) {
      setError(getFirebaseAuthMessage(e, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  }

  const bottomPad = 24 + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sign Up" theme={theme} colors={colors} onBack={goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        >
          <ThemedText style={[styles.lead, { color: colors.textSecondary }]}>
            Create your account — passwords must meet the rules below.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>Full name</ThemedText>
            <ThemedTextInput value={name} onChangeText={setName} autoCapitalize="words" placeholder="John Doe" />

            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Email address
            </ThemedText>
            <ThemedTextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />

            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Password
            </ThemedText>
            <ThemedTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Create a password"
              textContentType="newPassword"
              autoComplete="password-new"
            />
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.hintTitle, { color: colors.textSecondary }]}>Password requirements</ThemedText>
            {checks.map((c) => (
              <ThemedText
                key={c.id}
                style={[styles.rule, !c.ok && styles.ruleMuted, { color: c.ok ? colors.success : colors.textSecondary }]}
              >
                {c.ok ? '✓ ' : '○ '}
                {c.label}
              </ThemedText>
            ))}

            <View style={styles.strengthRow}>
              <View style={[styles.strengthTrack, { backgroundColor: colors.surfaceSecondary }]}>
                <View style={[styles.strengthFill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
              </View>
              <ThemedText style={[styles.strengthLabel, { color: colors.textSecondary }]}>
                {score}/{checks.length}
              </ThemedText>
            </View>

            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Confirm password
            </ThemedText>
            <ThemedTextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter password"
              textContentType="newPassword"
              autoComplete="password-new"
            />
            {confirmMismatch ? (
              <ThemedText style={[styles.warn, { color: colors.warning }]}>Passwords do not match.</ThemedText>
            ) : null}
            {passwordsMatch && passwordMeetsPolicy(password) ? (
              <ThemedText style={[styles.okHint, { color: colors.success }]}>Passwords match.</ThemedText>
            ) : null}
          </View>

          {!!error && (
            <ThemedText style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={!canSubmit}
            onPress={() => void handleSignUp()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              (!canSubmit || loading) && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Creating account' : 'Create account'}
          >
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              {loading ? 'Creating...' : 'Create Account'}
            </ThemedText>
          </Pressable>

          {isGoogleOAuthConfigured() ? (
            <GoogleSignInButton
              loading={loading}
              setLoading={setLoading}
              setError={setError}
              label="Continue with Google"
              onSignedIn={() => router.replace('/')}
            />
          ) : (
            <ThemedText style={[styles.googleHint, { color: colors.textTertiary }]}>
              Google sign-up needs OAuth client IDs in .env (see .env.example).
            </ThemedText>
          )}

          <View style={styles.bottomRow}>
            <ThemedText style={{ color: colors.textSecondary }}>Already have an account? </ThemedText>
            <Link href="/sign-in" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Go to sign in">
                <ThemedText type="link" style={{ color: colors.primary }}>
                  Sign In
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
    gap: 6,
  },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  fieldLabelSpaced: { marginTop: 12 },
  hintTitle: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  rule: { fontSize: 14, lineHeight: 20 },
  ruleMuted: { opacity: 0.85 },
  strengthRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthTrack: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  strengthFill: { height: 8, borderRadius: 999 },
  strengthLabel: { marginLeft: 8, minWidth: 36, textAlign: 'right', fontSize: 13 },
  warn: { fontSize: 13, marginTop: 6 },
  okHint: { fontSize: 13, marginTop: 6 },
  primaryButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.55 },
  error: { textAlign: 'center', marginTop: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, flexWrap: 'wrap', gap: 4 },
  googleHint: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});
