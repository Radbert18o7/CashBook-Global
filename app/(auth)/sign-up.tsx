import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { signUpWithEmail } from '@/services/authService';

function strengthScore(password: string) {
  const len = password.length;
  let score = 0;
  if (len >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => strengthScore(password), [password]);
  const percent = useMemo(() => (password.length ? (score / 4) * 100 : 0), [score, password.length]);

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed');
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
      <TextInput value={name} onChangeText={setName} autoCapitalize="words" style={styles.input} placeholder="John Doe" />

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
        placeholder="Create a password"
      />

      <View style={styles.strengthRow}>
        <View style={styles.strengthTrack}>
          <View style={[styles.strengthFill, { width: `${percent}%` }]} />
        </View>
        <ThemedText style={{ opacity: 0.8 }}>{score}/4</ThemedText>
      </View>

      {!!error && (
        <ThemedText style={styles.error} lightColor="#F43F5E" darkColor="#F43F5E">
          {error}
        </ThemedText>
      )}

      <Pressable
        disabled={loading}
        onPress={handleSignUp}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
      >
        <ThemedText type="defaultSemiBold">{loading ? 'Creating...' : 'Create Account'}</ThemedText>
      </Pressable>

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
  strengthRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthTrack: { flex: 1, height: 8, backgroundColor: 'rgba(127,127,127,0.2)', borderRadius: 999 },
  strengthFill: { height: 8, backgroundColor: '#4F46E5', borderRadius: 999 },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.7 },
  error: { textAlign: 'center', marginTop: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 },
});

