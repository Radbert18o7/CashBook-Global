import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleSignInButton, isGoogleOAuthConfigured } from '@/components/auth/GoogleSignInButton';
import { signInAsGuest } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';
import { primitive } from '@/theme/designTokens';

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://www.cashbookglobal.app/terms';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://www.cashbookglobal.app/privacy';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metro resolves this at bundle time (see app.json icon path).
  const iconSource = require('../../assets/images/icon.png') as number;

  async function onGuest() {
    setLoading(true);
    setError(null);
    try {
      await signInAsGuest();
      router.replace('/');
    } catch (e: unknown) {
      setError(getFirebaseAuthMessage(e, 'Guest sign-in failed'));
      Alert.alert('Guest sign-in', getFirebaseAuthMessage(e, 'Could not continue as guest'));
    } finally {
      setLoading(false);
    }
  }

  const shellBg = primitive.slate[900];

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 12), backgroundColor: shellBg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.top}>
        <Image source={iconSource} style={styles.icon} resizeMode="cover" />
        <Text style={styles.title}>CashBook Global</Text>
        <Text style={styles.tagline}>Track your business finances</Text>
      </View>

      <View style={styles.bottom}>
        {error ? <Text style={styles.err}>{error}</Text> : null}

        {isGoogleOAuthConfigured() ? (
          <GoogleSignInButton
            loading={loading}
            setLoading={setLoading}
            setError={setError}
            variant="welcome"
            onSignedIn={() => router.replace('/')}
          />
        ) : (
          <Text style={styles.oauthHint}>Add Google OAuth client IDs in .env to enable Google sign-in.</Text>
        )}

        <Link href="/sign-in" asChild>
          <Pressable style={({ pressed }) => [styles.emailBtn, pressed && styles.pressed]}>
            <Text style={styles.emailBtnText}>Continue with Email</Text>
          </Pressable>
        </Link>

        <Pressable onPress={() => void onGuest()} disabled={loading}>
          <Text style={styles.guest}>Continue as Guest</Text>
        </Pressable>

        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.link} onPress={() => void Linking.openURL(TERMS_URL)}>
            Terms
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  top: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  title: {
    marginTop: 20,
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: primitive.slate[400],
    textAlign: 'center',
  },
  bottom: {
    paddingHorizontal: 32,
    paddingTop: 16,
    gap: 12,
  },
  emailBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: primitive.slate[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emailBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  guest: {
    marginTop: 12,
    textAlign: 'center',
    color: primitive.slate[500],
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legal: {
    marginTop: 20,
    textAlign: 'center',
    color: primitive.slate[500],
    fontSize: 12,
    lineHeight: 18,
  },
  link: { color: primitive.slate[400], textDecorationLine: 'underline' },
  err: { color: '#F87171', textAlign: 'center', marginBottom: 4 },
  oauthHint: { color: primitive.slate[400], textAlign: 'center', fontSize: 13 },
  pressed: { opacity: 0.88 },
});
