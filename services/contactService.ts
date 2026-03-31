import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebase';

export type Contact = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at?: unknown;
};

export async function getContacts(bookId: string): Promise<Contact[]> {
  const q = query(collection(firestore, 'books', bookId, 'contacts'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Contact, 'id'>) }));
}

export async function createContact(bookId: string, data: { name: string; phone?: string | null; email?: string | null }): Promise<string> {
  const ref = doc(collection(firestore, 'books', bookId, 'contacts'));
  await setDoc(ref, {
    name: data.name,
    phone: data.phone ?? null,
    email: data.email ?? null,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContact(bookId: string, contactId: string, data: Partial<Pick<Contact, 'name' | 'phone' | 'email'>>): Promise<void> {
  await updateDoc(doc(firestore, 'books', bookId, 'contacts', contactId), data);
}

export async function deleteContact(bookId: string, contactId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'books', bookId, 'contacts', contactId));
}

export async function searchContacts(bookId: string, queryText: string): Promise<Contact[]> {
  // Firestore full-text search requires an index or separate search strategy.
  // Scaffold: fetch and filter client-side (can be replaced later with proper indexing).
  const all = await getContacts(bookId);
  const q = queryText.trim().toLowerCase();
  if (!q) return all;
  return all.filter((c) => c.name.toLowerCase().includes(q));
}

