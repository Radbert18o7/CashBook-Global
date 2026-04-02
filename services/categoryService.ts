import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

import { firestore } from './firebase';
import { sanitizeFirestoreData } from '@/utils/sanitizeFirestoreData';

export type Category = {
  id: string;
  name: string;
  icon?: string | null;
  order?: number;
};

export async function getCategories(bookId: string): Promise<Category[]> {
  const q = query(collection(firestore, 'books', bookId, 'categories'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
}

export async function createCategory(bookId: string, name: string, icon?: string | null): Promise<string> {
  const ref = doc(collection(firestore, 'books', bookId, 'categories'));
  await setDoc(
    ref,
    sanitizeFirestoreData({
      name,
      icon: icon ?? null,
      order: 0,
    } as Record<string, unknown>),
  );
  return ref.id;
}

export async function updateCategory(
  bookId: string,
  categoryId: string,
  data: Partial<Pick<Category, 'name' | 'icon'>>,
): Promise<void> {
  await updateDoc(
    doc(firestore, 'books', bookId, 'categories', categoryId),
    sanitizeFirestoreData(data as Record<string, unknown>),
  );
}

export async function deleteCategory(bookId: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'books', bookId, 'categories', categoryId));
}

export async function reorderCategories(bookId: string, orderedIds: string[]): Promise<void> {
  const b = writeBatch(firestore);
  orderedIds.forEach((id, idx) => {
    b.update(
      doc(firestore, 'books', bookId, 'categories', id),
      sanitizeFirestoreData({ order: idx } as Record<string, unknown>),
    );
  });
  await b.commit();
}

