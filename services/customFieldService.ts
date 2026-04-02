import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from './firebase';
import { sanitizeFirestoreData } from '@/utils/sanitizeFirestoreData';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DROPDOWN';

export type CustomField = {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  /** Defaults to true when missing */
  enabled?: boolean;
  order?: number;
  options?: string[];
};

export async function getCustomFields(bookId: string): Promise<CustomField[]> {
  const q = query(collection(firestore, 'books', bookId, 'custom_fields'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomField, 'id'>) }));
}

export async function createCustomField(
  bookId: string,
  data: Pick<CustomField, 'name' | 'type' | 'required'> & { options?: string[] },
): Promise<string> {
  const ref = doc(collection(firestore, 'books', bookId, 'custom_fields'));
  const payload: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    required: data.required,
    enabled: true,
    created_at: serverTimestamp(),
    order: 0,
  };
  if (data.type === 'DROPDOWN' && Array.isArray(data.options)) {
    payload.options = data.options.filter((o) => typeof o === 'string' && o.trim());
  }
  await setDoc(ref, payload);
  return ref.id;
}

export async function updateCustomField(
  bookId: string,
  fieldId: string,
  data: Partial<Pick<CustomField, 'name' | 'type' | 'required' | 'options' | 'enabled'>>,
): Promise<void> {
  await updateDoc(
    doc(firestore, 'books', bookId, 'custom_fields', fieldId),
    sanitizeFirestoreData(data as Record<string, unknown>),
  );
}

export async function deleteCustomField(bookId: string, fieldId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'books', bookId, 'custom_fields', fieldId));
}

export async function reorderCustomFields(bookId: string, orderedIds: string[]): Promise<void> {
  const b = writeBatch(firestore);
  orderedIds.forEach((id, idx) => {
    b.update(
      doc(firestore, 'books', bookId, 'custom_fields', id),
      sanitizeFirestoreData({ order: idx } as Record<string, unknown>),
    );
  });
  await b.commit();
}

