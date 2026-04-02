import { useEffect } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';
import type { AuthSessionResult } from 'expo-auth-session';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { signInWithGoogleTokens } from '@/services/authService';
import { getFirebaseAuthMessage } from '@/utils/authErrors';

export function isGoogleOAuthConfigured(): boolean {
  const web = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'web') return !!web;
  if (Platform.OS === 'android') return !!android;
  if (Platform.OS === 'ios') return !!ios;
  return false;
}

function extractGoogleIdToken(result: AuthSessionResult): string | undefined {
  if (result.type !== 'success') return undefined;
  const params = result.params as { id_token?: string };
  if (params.id_token) return params.id_token;
  const auth = (result as { authentication?: { idToken?: string | null } }).authentication;
  return auth?.idToken ?? undefined;
}

function isPendingCodeExchange(result: AuthSessionResult): boolean {
  if (result.type !== 'success') return false;
  const params = result.params as { id_token?: string; code?: string };
  return Boolean(params.code && !params.id_token);
}

type Props = {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  label?: string;
  /** White pill button for welcome screen */
  variant?: 'default' | 'welcome';
  onSignedIn?: () => void;
};

export function GoogleSignInButton({
  loading,
  setLoading,
  setError,
  label = 'Continue with Google',
  variant = 'default',
  onSignedIn,
}: Props) {
  const borderColor = useThemeColor({}, 'inputBorder');
  const [googleRequest, googleResponse, promptGoogleAsync] = useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    selectAccount: true,
  });

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

      if (isPendingCodeExchange(googleResponse)) {
        return;
      }

      const idToken = extractGoogleIdToken(googleResponse);
      const accessToken = (googleResponse.params as { access_token?: string })?.access_token;
      if (!idToken) {
        setError('Google sign-in failed: no ID token yet. Try again.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await signInWithGoogleTokens({ idToken, accessToken });
        onSignedIn?.();
      } catch (e: unknown) {
        const message = getFirebaseAuthMessage(e, 'Google sign-in failed');
        setError(message);
        Alert.alert('Google sign-in failed', message);
      } finally {
        setLoading(false);
      }
    }

    void handleGoogleResponse();
  }, [googleResponse, onSignedIn, setError, setLoading]);

  async function onPress() {
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Google sign-in failed';
      setError(message);
      Alert.alert('Google sign-in', message);
      setLoading(false);
    }
  }

  if (variant === 'welcome') {
    return (
      <Pressable
        onPress={() => void onPress()}
        disabled={loading}
        style={[styles.welcomeButton, loading && styles.disabledWelcome]}
      >
        <Text style={styles.welcomeG}>G</Text>
        <Text style={styles.welcomeLabel}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => void onPress()}
      disabled={loading}
      style={[styles.secondaryButton, { borderColor }]}
    >
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  welcomeButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  disabledWelcome: { opacity: 0.7 },
  welcomeG: { fontSize: 22, fontWeight: '800', color: '#EA4335' },
  welcomeLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
});
