import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { writeBatch } from 'firebase/firestore';

import { firestore } from './firebase';
import { sanitizeFirestoreData } from '@/utils/sanitizeFirestoreData';

export type PaymentMode = {
  id: string;
  name: string;
  created_at?: unknown;
  order?: number;
};

export async function getPaymentModes(bookId: string): Promise<PaymentMode[]> {
  const q = query(collection(firestore, 'books', bookId, 'payment_modes'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentMode, 'id'>) }));
}

export async function createPaymentMode(bookId: string, name: string): Promise<string> {
  const ref = doc(collection(firestore, 'books', bookId, 'payment_modes'));
  await setDoc(
    ref,
    sanitizeFirestoreData({
      name,
      created_at: serverTimestamp(),
      order: 0,
    } as Record<string, unknown>),
  );
  return ref.id;
}

export async function updatePaymentMode(bookId: string, modeId: string, data: Partial<Pick<PaymentMode, 'name'>>): Promise<void> {
  await updateDoc(
    doc(firestore, 'books', bookId, 'payment_modes', modeId),
    sanitizeFirestoreData(data as Record<string, unknown>),
  );
}

export async function deletePaymentMode(bookId: string, modeId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'books', bookId, 'payment_modes', modeId));
}

export async function reorderPaymentModes(bookId: string, orderedIds: string[]): Promise<void> {
  const b = writeBatch(firestore);
  orderedIds.forEach((id, idx) => {
    b.update(
      doc(firestore, 'books', bookId, 'payment_modes', id),
      sanitizeFirestoreData({ order: idx } as Record<string, unknown>),
    );
  });
  await b.commit();
}

