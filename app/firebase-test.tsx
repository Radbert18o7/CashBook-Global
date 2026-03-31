import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { firebaseApp, firebaseAuth, firestore, testFirestoreConnectivity } from '@/services/firebase';

type Status =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'ok'; message: string }
  | { state: 'error'; message: string };

export default function FirebaseTestScreen() {
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const appInfo = useMemo(() => {
    const options = firebaseApp.options;
    return {
      projectId: options.projectId ?? '(missing)',
      appId: options.appId ?? '(missing)',
    };
  }, []);

  useEffect(() => {
    setStatus({ state: 'running' });
    testFirestoreConnectivity()
      .then((res) => {
        if (res.ok) {
          if (res.kind === 'configured_only') {
            setStatus({
              state: 'error',
              message:
                'Firebase config is still placeholder. Paste your Firebase config into services/firebaseConfig.ts to run the live connectivity test.',
            });
            return;
          }

          setStatus({
            state: 'ok',
            message: res.note ?? 'Firestore request succeeded (connectivity confirmed).',
          });
          return;
        }

        setStatus({
          state: 'error',
          message: `${res.code ? `${res.code}: ` : ''}${res.message}`,
        });
      })
      .catch((err: unknown) => {
        setStatus({
          state: 'error',
          message: (err as { message?: string } | null)?.message ?? 'Unknown error.',
        });
      });
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Firebase connectivity</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">App</ThemedText>
        <ThemedText>projectId: {appInfo.projectId}</ThemedText>
        <ThemedText>appId: {appInfo.appId}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">SDK objects</ThemedText>
        <ThemedText>Auth: {firebaseAuth ? 'initialized' : 'missing'}</ThemedText>
        <ThemedText>Firestore: {firestore ? 'initialized' : 'missing'}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Live test</ThemedText>
        <ThemedText>
          {status.state === 'idle' && 'Not started.'}
          {status.state === 'running' && 'Running Firestore connectivity test…'}
          {status.state === 'ok' && status.message}
          {status.state === 'error' && status.message}
        </ThemedText>
      </ThemedView>

      <Pressable
        onPress={() => {
          setStatus({ state: 'running' });
          testFirestoreConnectivity()
            .then((res) => {
              if (res.ok) {
                if (res.kind === 'configured_only') {
                  setStatus({
                    state: 'error',
                    message:
                      'Firebase config is still placeholder. Paste your Firebase config into services/firebaseConfig.ts to run the live connectivity test.',
                  });
                  return;
                }
                setStatus({
                  state: 'ok',
                  message: res.note ?? 'Firestore request succeeded (connectivity confirmed).',
                });
                return;
              }
              setStatus({
                state: 'error',
                message: `${res.code ? `${res.code}: ` : ''}${res.message}`,
              });
            })
            .catch((err: unknown) => {
              setStatus({
                state: 'error',
                message: (err as { message?: string } | null)?.message ?? 'Unknown error.',
              });
            });
        }}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <ThemedText type="defaultSemiBold">Re-run test</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});

