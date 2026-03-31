import { getApp, getApps, initializeApp } from 'firebase/app';
import {
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
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

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
    // Default persistence is fine for this scaffold.
    // React Native persistence strategy can be implemented later.
    return initializeAuth(firebaseApp);
  }
}

export const firebaseAuth = ensureAuth();
export const firestore = getFirestore(firebaseApp);

/** Same region as `functions/src/index.ts` (`setGlobalOptions`). */
export const firebaseFunctions = getFunctions(firebaseApp, 'us-central1');

// Firestore offline persistence (web only).
// React Native doesn't use IndexedDB, so this is safe to guard by platform.
if (Platform.OS === 'web') {
  // Fire-and-forget: if it fails (e.g. multiple tabs), Firestore still works.
  void (async () => {
    try {
      await enableIndexedDbPersistence(firestore);
    } catch {
      try {
        await enableMultiTabIndexedDbPersistence(firestore);
      } catch {
        // Ignore.
      }
    }
  })();
}

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

