import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { firestore } from './firebase';
import type { BookMemberRole } from '@/utils/models';

export type BookMember = {
  id: string;
  user_id: string;
  role: BookMemberRole;
  business_id?: string;
  book_id?: string;
  permissions?: Record<string, unknown>;
  created_at?: unknown;
};

export async function getBookMembers(bookId: string): Promise<BookMember[]> {
  const q = query(collection(firestore, 'books', bookId, 'members'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BookMember, 'id'>) }));
}

export async function addBookMember(bookId: string, email: string, role: BookMemberRole): Promise<string> {
  // Client-side lookup by email is constrained by security rules.
  const usersQ = query(collection(firestore, 'users'), where('email', '==', email));
  const usersSnap = await getDocs(usersQ);
  const userDoc = usersSnap.docs[0];
  if (!userDoc) {
    throw new Error('User not found. For invites by email, use a backend callable function.');
  }
  const userId = userDoc.id;
  await setDoc(doc(firestore, 'books', bookId, 'members', userId), {
    user_id: userId,
    book_id: bookId,
    role,
    permissions: {},
    created_at: serverTimestamp(),
  });
  return userId;
}

export async function updateBookMemberRole(bookId: string, userId: string, role: BookMemberRole): Promise<void> {
  await updateDoc(doc(firestore, 'books', bookId, 'members', userId), { role });
}

export async function removeBookMember(bookId: string, userId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'books', bookId, 'members', userId));
}

