import { signInWithEmail, signUpWithEmail, signOut, signInWithGoogleTokens, getOnboardingComplete, setOnboardingComplete } from '../services/authService';
import { firebaseAuth, firestore } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  signInWithCredential,
  GoogleAuthProvider,
} from 'firebase/auth';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

jest.mock('firebase/auth', () => ({
  firebaseAuth: {
    currentUser: null,
  },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  signInWithCredential: jest.fn(),
  signInAnonymously: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  firestore: {},
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('../services/firebase', () => ({
  firebaseAuth: {
    currentUser: null,
  },
  firestore: {},
}));

jest.mock('@/utils/sanitizeFirestoreData', () => ({
  sanitizeFirestoreData: (data: any) => data,
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should sign in user and upsert profile', async () => {
      const mockUser = { uid: 'user123', email: 'test@example.com', displayName: 'Test User' };
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
      (doc as jest.Mock).mockReturnValue('doc-ref');

      await signInWithEmail('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(firebaseAuth, 'test@example.com', 'password123');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          firebase_uid: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        }),
        { merge: true }
      );
    });

    it('should throw error if sign in fails', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(new Error('Auth failed'));
      await expect(signInWithEmail('test@example.com', 'password123')).rejects.toThrow('Auth failed');
    });
  });

  describe('signUpWithEmail', () => {
    it('should create user and set initial profile', async () => {
      const mockUser = { uid: 'user456' };
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
      (doc as jest.Mock).mockReturnValue('doc-ref');

      await signUpWithEmail('new@example.com', 'password123', 'New User');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(firebaseAuth, 'new@example.com', 'password123');
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          firebase_uid: 'user456',
          email: 'new@example.com',
          name: 'New User',
          onboarding_complete: false,
        }),
        { merge: true }
      );
    });
  });

  describe('signOut', () => {
    it('should call firebaseSignOut', async () => {
      await signOut();
      expect(firebaseSignOut).toHaveBeenCalledWith(firebaseAuth);
    });
  });

  describe('signInWithGoogleTokens', () => {
    it('should sign in user with google tokens and upsert profile', async () => {
      const mockUser = { uid: 'google123', email: 'google@example.com', displayName: 'Google User' };
      const mockCred = 'mock-google-credential';
      (GoogleAuthProvider.credential as jest.Mock).mockReturnValue(mockCred);
      (signInWithCredential as jest.Mock).mockResolvedValue({ user: mockUser });
      (doc as jest.Mock).mockReturnValue('doc-ref');

      await signInWithGoogleTokens({ idToken: 'token123', accessToken: 'access123' });

      expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('token123', 'access123');
      expect(signInWithCredential).toHaveBeenCalledWith(firebaseAuth, mockCred);
      expect(setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({
          firebase_uid: 'google123',
          email: 'google@example.com',
          name: 'Google User',
        }),
        { merge: true }
      );
    });

    it('should throw error if google sign in fails', async () => {
      (signInWithCredential as jest.Mock).mockRejectedValue(new Error('Google Auth failed'));
      await expect(signInWithGoogleTokens({ idToken: 'token123' })).rejects.toThrow('Google Auth failed');
    });
  });

  describe('Onboarding status', () => {
    it('should return false if onboarding is not complete', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ onboarding_complete: false }) });
      (doc as jest.Mock).mockReturnValue('doc-ref');
      
      const result = await getOnboardingComplete('user123');
      expect(result).toBe(false);
    });

    it('should return true if onboarding is complete', async () => {
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ onboarding_complete: true }) });
      (doc as jest.Mock).mockReturnValue('doc-ref');
      
      const result = await getOnboardingComplete('user123');
      expect(result).toBe(true);
    });

    it('should set onboarding to complete', async () => {
      (doc as jest.Mock).mockReturnValue('doc-ref');
      await setOnboardingComplete('user123');
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({ onboarding_complete: true }));
    });
  });
});
