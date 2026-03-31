import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from './firebase';
import type { Book, BookMemberRole } from '@/utils/models';

const defaultCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Salary', 'Sales', 'Other'];
const defaultPaymentModes = ['Cash', 'Online', 'Bank', 'Debit Card', 'Credit Card'];

export async function getBooks(businessId: string): Promise<Book[]> {
  const q = query(collection(firestore, 'books'), where('business_id', '==', businessId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Book, 'id'>),
  }));
}

export async function getBook(bookId: string): Promise<Book | null> {
  const s = await getDoc(doc(firestore, 'books', bookId));
  if (!s.exists()) return null;
  return { id: s.id, ...(s.data() as Omit<Book, 'id'>) };
}

export type BookFieldConfig = {
  contact: { enabled: boolean; label: string };
  category: { enabled: boolean };
  paymentMode: { enabled: boolean };
};

export function mergeBookFieldSettings(raw: Record<string, unknown> | undefined): BookFieldConfig {
  const fields = (raw?.fields as Record<string, unknown> | undefined) ?? {};
  const contact = (fields.contact as Record<string, unknown> | undefined) ?? {};
  return {
    contact: {
      enabled: typeof contact.enabled === 'boolean' ? contact.enabled : true,
      label: typeof contact.label === 'string' && contact.label.trim() ? contact.label : 'Contact',
    },
    category: {
      enabled:
        typeof (fields.category as { enabled?: boolean } | undefined)?.enabled === 'boolean'
          ? Boolean((fields.category as { enabled?: boolean }).enabled)
          : true,
    },
    paymentMode: {
      enabled:
        typeof (fields.paymentMode as { enabled?: boolean } | undefined)?.enabled === 'boolean'
          ? Boolean((fields.paymentMode as { enabled?: boolean }).enabled)
          : true,
    },
  };
}

export async function createBook(businessId: string, name: string, userId: string) {
  const bookDoc = await addDoc(collection(firestore, 'books'), {
    business_id: businessId,
    name,
    created_by: userId,
    created_at: serverTimestamp(),
    settings: {},
  });

  const bookId = bookDoc.id;

  await setDoc(doc(firestore, 'books', bookId, 'members', userId), {
    user_id: userId,
    book_id: bookId,
    role: 'PRIMARY_ADMIN' satisfies BookMemberRole,
    created_at: serverTimestamp(),
  });

  await Promise.all([
    ...defaultCategories.map((c) =>
      setDoc(doc(firestore, 'books', bookId, 'categories', c), {
        name: c,
        icon: null,
        created_at: serverTimestamp(),
      }),
    ),
    ...defaultPaymentModes.map((m) =>
      setDoc(doc(firestore, 'books', bookId, 'payment_modes', m), {
        name: m,
        created_at: serverTimestamp(),
      }),
    ),
  ]);

  return bookId;
}

export async function updateBook(id: string, data: Partial<Pick<Book, 'name'>>) {
  await updateDoc(doc(firestore, 'books', id), data);
}

export async function deleteBook(id: string) {
  await deleteDoc(doc(firestore, 'books', id));
}

export async function getBookSettings(bookId: string): Promise<Record<string, unknown>> {
  const s = await getDoc(doc(firestore, 'books', bookId));
  return (s.data()?.settings as Record<string, unknown> | undefined) ?? {};
}

export async function updateBookSettings(bookId: string, settings: Record<string, unknown>) {
  await updateDoc(doc(firestore, 'books', bookId), { settings });
}

