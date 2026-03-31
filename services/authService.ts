import { Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firebaseAuth, firestore } from './firebase';

import type { UserProfile } from '@/utils/models';

function toUserProfile(u: User): UserProfile {
  return {
    uid: u.uid,
    email: u.email ?? '',
    name: u.displayName ?? '',
    avatar_url: u.photoURL ?? undefined,
    language: 'en',
    currency: 'USD',
    theme: 'system',
  };
}

async function upsertUserProfile(profile: UserProfile) {
  // Security rules require user document access via `users/{uid}`.
  await setDoc(doc(firestore, 'users', profile.uid), {
    firebase_uid: profile.uid,
    email: profile.email,
    name: profile.name,
    avatar_url: profile.avatar_url ?? null,
    language: profile.language,
    currency: profile.currency,
    theme: profile.theme,
    created_at: serverTimestamp(),
  }, { merge: true });
}

export async function signInWithGoogleTokens(params: { idToken: string; accessToken?: string }): Promise<void> {
  const credential = GoogleAuthProvider.credential(params.idToken, params.accessToken);
  const userCred = await signInWithCredential(firebaseAuth, credential);
  const user = userCred.user;

  const profile = toUserProfile(user);
  await upsertUserProfile(profile);
}

export async function signInWithGoogle(): Promise<void> {
  // Deprecated in this scaffold: Google OAuth is handled in the UI using Expo Auth Session.
  if (Platform.OS !== 'web') {
    throw new Error('Use the sign-in screen to perform Google OAuth.');
  }
  throw new Error('Web popup Google sign-in is not implemented in this scaffold. Use UI flow.');
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const user = cred.user;
  const profile = toUserProfile(user);
  await upsertUserProfile(profile);
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  const user = cred.user;
  await setDoc(doc(firestore, 'users', user.uid), {
    firebase_uid: user.uid,
    email: email,
    name,
    avatar_url: null,
    language: 'en',
    currency: 'USD',
    theme: 'system',
    onboarding_complete: false,
    created_at: serverTimestamp(),
  }, { merge: true });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebaseAuth);
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

export function onAuthStateChanged(callback: (u: User | null) => void) {
  return firebaseOnAuthStateChanged(firebaseAuth, callback);
}

export function getCurrentUser(): UserProfile | null {
  const u = firebaseAuth.currentUser;
  if (!u) return null;
  return toUserProfile(u);
}

export async function getOnboardingComplete(uid: string): Promise<boolean> {
  const s = await getDoc(doc(firestore, 'users', uid));
  if (!s.exists()) return false;
  return s.data()?.onboarding_complete === true;
}

export async function setOnboardingComplete(uid: string): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), { onboarding_complete: true });
}

