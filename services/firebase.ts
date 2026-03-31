import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getReactNativePersistence,
  initializeAuth,
  type Auth,
  type AuthError,
  getAuth,
} from 'firebase/auth';
import {
  type FirestoreError,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { firebaseConfig, isFirebaseConfigPlaceholder } from './firebaseConfig';

function initializeFirebaseApp() {
  if (isFirebaseConfigPlaceholder) {
    // Create a minimal placeholder app; calls will fail until env vars are set.
    // This avoids crashing at import time.
    const placeholder = { apiKey: '', authDomain: '', projectId: '', appId: '' } as const;
    return getApps().length ? getApp() : initializeApp(placeholder);
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseApp = initializeFirebaseApp();

function ensureAuth(): Auth {
  try {
    return getAuth(firebaseApp);
  } catch {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
}

export const firebaseAuth = ensureAuth();
export const firestore = getFirestore(firebaseApp);

function getFirebaseErrorCode(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const maybe = err as { code?: unknown };
  return typeof maybe.code === 'string' ? maybe.code : null;
}

export type FirestoreConnectivityResult =
  | { ok: true; kind: 'configured_only' }
  | { ok: true; kind: 'reached_backend'; note?: string }
  | { ok: false; kind: 'error'; code?: string; message: string };

export async function testFirestoreConnectivity(): Promise<FirestoreConnectivityResult> {
  if (isFirebaseConfigPlaceholder) {
    return { ok: true, kind: 'configured_only' };
  }

  try {
    const ref = doc(firestore, '_meta', 'connectivity');
    await setDoc(ref, { ping: serverTimestamp() }, { merge: true });
    await getDoc(ref);
    return { ok: true, kind: 'reached_backend' };
  } catch (err) {
    const code = getFirebaseErrorCode(err);

    // If we got a rules/auth error, the request still reached Firestore successfully.
    if (code === 'permission-denied' || code === 'unauthenticated') {
      return {
        ok: true,
        kind: 'reached_backend',
        note: `Firestore replied with ${code} (rules/auth), which confirms connectivity.`,
      };
    }

    const message =
      (err as Partial<FirestoreError & AuthError> | null)?.message ??
      'Unknown error while contacting Firestore.';
    return { ok: false, kind: 'error', code: code ?? undefined, message };
  }
}

