import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { GoogleSignInButton, isGoogleOAuthConfigured } from '@/components/auth/GoogleSignInButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { signUpWithEmail } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';
import { getPasswordChecks, passwordMeetsPolicy } from '@/utils/passwordPolicy';

export default function SignUpScreen() {
  const router = useRouter();
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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Sign Up
      </ThemedText>

      <ThemedText style={styles.label}>Full name</ThemedText>
      <ThemedTextInput value={name} onChangeText={setName} autoCapitalize="words" placeholder="John Doe" />

      <ThemedText style={styles.label}>Email address</ThemedText>
      <ThemedTextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />

      <ThemedText style={styles.label}>Password</ThemedText>
      <ThemedTextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Create a password"
        textContentType="newPassword"
        autoComplete="password-new"
      />

      <ThemedText style={styles.hintTitle}>Password requirements</ThemedText>
      {checks.map((c) => (
        <ThemedText
          key={c.id}
          style={[styles.rule, !c.ok && styles.ruleMuted]}
          lightColor={c.ok ? '#059669' : undefined}
          darkColor={c.ok ? '#34D399' : undefined}
        >
          {c.ok ? '✓ ' : '○ '}
          {c.label}
        </ThemedText>
      ))}

      <View style={styles.strengthRow}>
        <View style={styles.strengthTrack}>
          <View style={[styles.strengthFill, { width: `${percent}%` }]} />
        </View>
        <ThemedText style={styles.strengthLabel}>
          {score}/{checks.length}
        </ThemedText>
      </View>

      <ThemedText style={styles.label}>Confirm password</ThemedText>
      <ThemedTextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Re-enter password"
        textContentType="newPassword"
        autoComplete="password-new"
      />
      {confirmMismatch ? (
        <ThemedText style={styles.warn} lightColor="#B45309" darkColor="#FBBF24">
          Passwords do not match.
        </ThemedText>
      ) : null}
      {passwordsMatch && passwordMeetsPolicy(password) ? (
        <ThemedText style={styles.okHint} lightColor="#059669" darkColor="#34D399">
          Passwords match.
        </ThemedText>
      ) : null}

      {!!error && (
        <ThemedText style={styles.error} lightColor="#F43F5E" darkColor="#FB7185">
          {error}
        </ThemedText>
      )}

      <Pressable
        disabled={!canSubmit}
        onPress={() => void handleSignUp()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          (!canSubmit || loading) && styles.disabled,
        ]}
      >
        <ThemedText type="defaultSemiBold">{loading ? 'Creating...' : 'Create Account'}</ThemedText>
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
        <ThemedText style={styles.googleHint}>
          Google sign-up needs OAuth client IDs in .env (see .env.example).
        </ThemedText>
      )}

      <View style={styles.bottomRow}>
        <ThemedText>Already have an account? </ThemedText>
        <Link href="/sign-in" asChild>
          <Pressable>
            <ThemedText type="link">Sign In</ThemedText>
          </Pressable>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8, justifyContent: 'center' },
  title: { textAlign: 'center', marginBottom: 12 },
  label: { opacity: 0.9, marginTop: 6 },
  hintTitle: { marginTop: 6, fontSize: 13, opacity: 0.85, fontWeight: '600' },
  rule: { fontSize: 14, lineHeight: 20 },
  ruleMuted: { opacity: 0.65 },
  strengthRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthTrack: { flex: 1, height: 8, backgroundColor: 'rgba(127,127,127,0.2)', borderRadius: 999 },
  strengthFill: { height: 8, backgroundColor: '#4F46E5', borderRadius: 999 },
  strengthLabel: { marginLeft: 8, opacity: 0.85, minWidth: 36, textAlign: 'right' },
  warn: { fontSize: 13, marginTop: 4 },
  okHint: { fontSize: 13, marginTop: 4 },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  error: { textAlign: 'center', marginTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 },
  googleHint: { opacity: 0.75, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
