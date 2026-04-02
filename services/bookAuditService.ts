import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { firestore } from './firebase';
import { sanitizeFirestoreData } from '@/utils/sanitizeFirestoreData';
import { getUserDisplay } from './userService';
import { formatMoney } from '@/utils/formatMoney';

export type BookAuditAction =
  | 'ENTRY_CREATED'
  | 'ENTRY_UPDATED'
  | 'ENTRY_DELETED'
  | 'BOOK_RENAMED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED'
  | 'CATEGORY_REORDERED'
  | 'PAYMENT_MODE_REORDERED';

export type BookAuditLog = {
  id: string;
  action: BookAuditAction;
  user_id: string;
  created_at: unknown;
  amount?: number;
  currency_code?: string;
  entry_type?: string;
  book_name?: string;
  member_name?: string;
  member_email?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

export async function appendBookAuditLog(
  bookId: string,
  userId: string,
  action: BookAuditAction,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await addDoc(
    collection(firestore, 'books', bookId, 'audit_logs'),
    sanitizeFirestoreData({
      action,
      user_id: userId,
      ...payload,
      created_at: serverTimestamp(),
    } as Record<string, unknown>),
  );
}

export async function getBookAuditLogsPage(
  bookId: string,
  pageSize: number,
  cursor: QueryDocumentSnapshot | null,
): Promise<{ logs: BookAuditLog[]; lastDoc: QueryDocumentSnapshot | null }> {
  let q = query(
    collection(firestore, 'books', bookId, 'audit_logs'),
    orderBy('created_at', 'desc'),
    limit(pageSize),
  );
  if (cursor) {
    q = query(
      collection(firestore, 'books', bookId, 'audit_logs'),
      orderBy('created_at', 'desc'),
      startAfter(cursor),
      limit(pageSize),
    );
  }
  const snap = await getDocs(q);
  const logs: BookAuditLog[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      action: data.action as BookAuditAction,
      user_id: (data.user_id as string) ?? '',
      created_at: data.created_at,
      amount: typeof data.amount === 'number' ? data.amount : undefined,
      entry_type: typeof data.entry_type === 'string' ? data.entry_type : undefined,
      book_name: typeof data.book_name === 'string' ? data.book_name : undefined,
      member_name: typeof data.member_name === 'string' ? data.member_name : undefined,
      member_email: typeof data.member_email === 'string' ? data.member_email : undefined,
      role: typeof data.role === 'string' ? data.role : undefined,
      metadata: typeof data.metadata === 'object' && data.metadata ? (data.metadata as Record<string, unknown>) : undefined,
    };
  });
  const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
  return { logs, lastDoc };
}

export async function formatAuditDescription(log: BookAuditLog): Promise<string> {
  const actor = await getUserDisplay(log.user_id);
  const name = actor.name || actor.email || log.user_id.slice(0, 6);

  switch (log.action) {
    case 'ENTRY_CREATED': {
      const code = log.currency_code ?? 'USD';
      return `Entry of ${formatMoney(log.amount ?? 0, code)} created by ${name}`;
    }
    case 'ENTRY_UPDATED':
      return `Entry updated by ${name}`;
    case 'ENTRY_DELETED':
      return `Entry deleted by ${name}`;
    case 'BOOK_RENAMED':
      return `Book renamed to ${log.book_name ?? '—'} by ${name}`;
    case 'MEMBER_ADDED':
      return `Member ${log.member_name ?? log.member_email ?? '—'} added as ${log.role ?? 'Member'} by ${name}`;
    case 'MEMBER_REMOVED':
      return `Member ${log.member_name ?? log.member_email ?? '—'} removed by ${name}`;
    case 'MEMBER_ROLE_CHANGED':
      return `Member ${log.member_name ?? '—'} role changed to ${log.role ?? '—'} by ${name}`;
    case 'CATEGORY_REORDERED':
      return `Categories reordered by ${name}`;
    case 'PAYMENT_MODE_REORDERED':
      return `Payment modes reordered by ${name}`;
    default:
      return `${log.action} — ${name}`;
  }
}
