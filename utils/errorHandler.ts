import { Alert } from 'react-native';
import type { FirebaseError } from 'firebase/app';

type ErrorHandlerResult = { message: string };

function getFriendlyMessage(err: unknown): string {
  const code = (err as Partial<FirebaseError> | null)?.code;
  switch (code) {
    case 'permission-denied':
      return 'Permission denied';
    case 'unavailable':
      return 'Service unavailable. Please try again.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Authentication failed';
    case 'auth/wrong-password':
      return 'Incorrect password';
    default:
      return 'Something went wrong';
  }
}

export async function runFirebaseSafely<T>(fn: () => Promise<T>, onError?: (r: ErrorHandlerResult) => void) {
  try {
    return await fn();
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    const message = getFriendlyMessage(err);
    onError?.({ message });
    Alert.alert('Error', message);
    throw err;
  }
}

