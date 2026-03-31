import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signInWithEmail, signInWithGoogleTokens, sendResetPassword } from '@/services/authService';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleRequest, googleResponse, promptGoogleAsync] = useIdTokenAuthRequest(
    {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      selectAccount: true,
    },
  );

  useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse) return;
      if (googleResponse.type !== 'success') {
        if (
          googleResponse.type === 'cancel' ||
          googleResponse.type === 'dismiss' ||
          googleResponse.type === 'error'
        ) {
          setLoading(false);
        }
        return;
      }

      const idToken = (googleResponse.params as any)?.id_token as string | undefined;
      const accessToken = (googleResponse.params as any)?.access_token as string | undefined;
      if (!idToken) {
        setError('Google sign-in failed: missing id_token.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await signInWithGoogleTokens({ idToken, accessToken });
      } catch (e: any) {
        setError(e?.message ?? 'Google sign-in failed');
        Alert.alert('Google sign-in failed', e?.message ?? 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    }

    void handleGoogleResponse();
  }, [googleResponse]);

  async function handleEmailSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      if (!googleRequest) {
        setError('Google sign-in is not ready yet. Try again in a moment.');
        setLoading(false);
        return;
      }

      await promptGoogleAsync();
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed');
      Alert.alert('Google sign-in', e?.message ?? 'Google sign-in failed');
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
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send reset email');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Sign In
      </ThemedText>

      <ThemedText style={styles.label}>Email address</ThemedText>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholder="you@example.com"
      />

      <ThemedText style={styles.label}>Password</ThemedText>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholder="••••••••"
      />

      {!!error && (
        <ThemedText style={styles.error} lightColor="#F43F5E" darkColor="#F43F5E">
          {error}
        </ThemedText>
      )}

      <Pressable
        disabled={loading}
        onPress={handleEmailSignIn}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
      >
        <ThemedText type="defaultSemiBold">{loading ? 'Signing in...' : 'Sign In'}</ThemedText>
      </Pressable>

      <Pressable onPress={handleForgotPassword} style={styles.linkButton}>
        <ThemedText type="link">Forgot Password?</ThemedText>
      </Pressable>

      <Pressable onPress={handleGoogleSignIn} style={styles.secondaryButton}>
        <ThemedText type="defaultSemiBold">Continue with Google</ThemedText>
      </Pressable>

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
  input: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.4)',
    marginTop: 10,
  },
  disabled: { opacity: 0.7 },
  pressed: { opacity: 0.85 },
  linkButton: { alignSelf: 'center', marginTop: 6 },
  error: { textAlign: 'center', marginTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 },
});

