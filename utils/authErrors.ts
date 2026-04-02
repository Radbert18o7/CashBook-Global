import { FirebaseError } from 'firebase/app';

export function getFirebaseAuthMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'That email address looks invalid.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/invalid-verification-code':
      case 'auth/invalid-verification-id':
        return 'The verification code is invalid.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/weak-password':
        return 'Password is too weak. Use a stronger password.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled for the app.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/requires-recent-login':
        return 'Please sign in again to continue.';
      default:
        return error.message || fallback;
    }
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
