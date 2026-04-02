import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { GoogleSignInButton, isGoogleOAuthConfigured } from '@/components/auth/GoogleSignInButton';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { signInWithEmail, sendResetPassword } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Sign In
      </ThemedText>

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
        placeholder="••••••••"
      />

      {!!error && (
        <ThemedText style={styles.error} lightColor="#F43F5E" darkColor="#FB7185">
          {error}
        </ThemedText>
      )}

      <Pressable
        disabled={loading}
        onPress={() => void handleEmailSignIn()}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
      >
        <ThemedText type="defaultSemiBold">{loading ? 'Signing in...' : 'Sign In'}</ThemedText>
      </Pressable>

      <Pressable onPress={() => void handleForgotPassword()} style={styles.linkButton}>
        <ThemedText type="link">Forgot Password?</ThemedText>
      </Pressable>

      {isGoogleOAuthConfigured() ? (
        <GoogleSignInButton
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          onSignedIn={() => router.replace('/')}
        />
      ) : (
        <ThemedText style={styles.googleHint}>
          Google sign-in needs OAuth client IDs in .env (see .env.example).
        </ThemedText>
      )}

      <View style={styles.bottomRow}>
        <ThemedText>Don&apos;t have an account? </ThemedText>
        <Link href="/sign-up" asChild>
          <Pressable>
            <ThemedText type="link">Sign Up</ThemedText>
          </Pressable>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10, justifyContent: 'center' },
  title: { textAlign: 'center', marginBottom: 12 },
  label: { opacity: 0.9, marginTop: 6 },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  pressed: { opacity: 0.85 },
  linkButton: { alignSelf: 'center', marginTop: 6 },
  error: { textAlign: 'center', marginTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 },
  googleHint: { opacity: 0.75, fontSize: 13, textAlign: 'center', marginTop: 10 },
});
