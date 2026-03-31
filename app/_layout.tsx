import { useEffect } from 'react';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/i18n';
import { useUiStore } from '@/store/uiStore';
import { OfflineNetworkBanner } from '@/components/OfflineNetworkBanner';
import '@/services/firebase';

const webCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://*.cloudinary.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.google.com",
].join('; ');

export default function RootLayout() {
  useEffect(() => {
    const sync = () => useUiStore.getState().setLanguage(i18n.language);
    i18n.on('languageChanged', sync);
    sync();
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <View style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <Head>
            <meta httpEquiv="Content-Security-Policy" content={webCsp} />
          </Head>
        ) : null}
        <OfflineNetworkBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="firebase-test" options={{ headerShown: true, title: 'Firebase test' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        </Stack>
      <StatusBar style="auto" />
        </View>
      </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
