import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

type AuditAction =
  | 'ENTRY_CREATED'
  | 'ENTRY_UPDATED'
  | 'ENTRY_DELETED'
  | 'BOOK_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | string;

export async function logAction(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ref = doc(collection(firestore, 'audit_logs'));
    await setDoc(ref, {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date(),
    });
  } catch {
    // Scaffold: ignore because write access may be restricted by security rules.
  }
}

