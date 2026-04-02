import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  where,
  runTransaction,
  increment,
} from 'firebase/firestore';

export type BookSummaryTotals = {
  total_in: number;
  total_out: number;
  net_balance: number;
  entry_count: number;
};

import { appendBookAuditLog } from './bookAuditService';
import { getBusiness } from './businessService';
import { getBook } from './bookService';
import { firestore } from './firebase';
import { isFirebasePermissionDenied } from '@/utils/firebaseErrors';
import { sanitizeFirestoreData } from '@/utils/sanitizeFirestoreData';
import type { Entry, EntryFilters, EntryType } from '@/utils/models';

export type DateRange = { from?: string; to?: string }; // ISO dates

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** `YYYY-MM-DD` parsed as local midnight (avoids UTC-only parsing for filters). */
function localDayStart(isoDate: string): Date {
  const parts = isoDate.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(isoDate);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Inclusive end of local calendar day for `YYYY-MM-DD`. */
function localDayEnd(isoDate: string): Date {
  const parts = isoDate.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(isoDate);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function entryFromSnapshot(bookId: string, snap: DocumentSnapshot): Entry {
  const data = snap.data() as any;
  return {
    id: snap.id,
    book_id: bookId,
    entry_date: data.entry_date,
    created_at: data.created_at,
    created_by: data.created_by,
    deleted_at: data.deleted_at,
    type: data.type,
    amount: data.amount ?? 0,
    contact_id: data.contact_id,
    contact_name: data.contact_name,
    remark: data.remark,
    category_id: data.category_id,
    category_name: data.category_name,
    payment_mode_id: data.payment_mode_id,
    payment_mode_name: data.payment_mode_name,
    custom_fields: data.custom_fields ?? undefined,
    image_url: data.image_url ?? undefined,
  };
}

/** Loads a single active entry, or `null` if missing or soft-deleted. */
export async function getEntry(bookId: string, entryId: string): Promise<Entry | null> {
  const entryRef = doc(firestore, 'books', bookId, 'entries', entryId);
  const snap = await getDoc(entryRef);
  if (!snap.exists()) return null;
  const data = snap.data() as { deleted_at?: unknown };
  if (data.deleted_at != null) return null;
  return entryFromSnapshot(bookId, snap);
}

/** Lists active entries only (`deleted_at == null`). Legacy docs missing `deleted_at` need a one-time backfill to null. */
export async function getEntries(
  bookId: string,
  filters: EntryFilters = {},
  lastDoc: QueryDocumentSnapshot | null,
  limitSize = 20,
): Promise<{ entries: Entry[]; hasMore: boolean; lastDoc: QueryDocumentSnapshot | null }> {
  const entriesRef = collection(firestore, 'books', bookId, 'entries');

  const qParts: any[] = [];
  qParts.push(where('deleted_at', '==', null));

  if (filters.type && filters.type !== 'ALL') {
    qParts.push(where('type', '==', filters.type));
  }

  if (filters.fromDate) {
    const from = Timestamp.fromDate(localDayStart(filters.fromDate));
    qParts.push(where('entry_date', '>=', from));
  }
  if (filters.toDate) {
    const to = Timestamp.fromDate(localDayEnd(filters.toDate));
    qParts.push(where('entry_date', '<=', to));
  }

  qParts.push(orderBy('entry_date', 'desc'));

  let q = query(entriesRef, ...qParts, limit(limitSize));
  if (lastDoc) {
    q = query(entriesRef, ...qParts, startAfter(lastDoc), limit(limitSize));
  }

  const snap = await getDocs(q);
  const docs = snap.docs;
  const entries = docs.map((d) => entryFromSnapshot(bookId, d));

  const last = docs.length ? docs[docs.length - 1] : null;
  return {
    entries,
    hasMore: docs.length === limitSize,
    lastDoc: last,
  };
}

export async function createEntry(
  bookId: string,
  data: Partial<Entry> & { type: EntryType; amount: number; entry_date: Date },
  userId: string,
): Promise<string> {
  // Auto-id document reference compatible with RN
  const entryRef = doc(collection(firestore, 'books', bookId, 'entries'));
  const entryDateTs = Timestamp.fromDate(data.entry_date);

  await runTransaction(firestore, async (tx) => {
    const summaryMonthKey = toMonthKey(data.entry_date);
    const summaryRef = doc(firestore, 'books', bookId, 'summaries', summaryMonthKey);
    const bookRef = doc(firestore, 'books', bookId);

    tx.set(
      entryRef,
      sanitizeFirestoreData({
        book_id: bookId,
        entry_date: entryDateTs,
        deleted_at: null,
        type: data.type,
        amount: data.amount,
        remark: data.remark ?? null,
        contact_id: data.contact_id ?? null,
        contact_name: data.contact_name ?? null,
        category_id: data.category_id ?? null,
        category_name: data.category_name ?? null,
        payment_mode_id: data.payment_mode_id ?? null,
        payment_mode_name: data.payment_mode_name ?? null,
        custom_fields: data.custom_fields ?? {},
        image_url: data.image_url ?? null,
        created_by: userId,
        created_at: serverTimestamp(),
      } as Record<string, unknown>),
    );

    const incIn = data.type === 'CASH_IN' ? data.amount : 0;
    const incOut = data.type === 'CASH_OUT' ? data.amount : 0;

    tx.set(
      summaryRef,
      sanitizeFirestoreData({
        book_id: bookId,
        month: summaryMonthKey,
        total_in: increment(incIn),
        total_out: increment(incOut),
        entry_count: increment(1),
      } as Record<string, unknown>),
      { merge: true },
    );

    tx.update(
      bookRef,
      sanitizeFirestoreData({ last_entry_date: serverTimestamp() } as Record<string, unknown>),
    );
  });

  let currencyCode = 'USD';
  const book = await getBook(bookId);
  if (book?.business_id) {
    const bus = await getBusiness(book.business_id);
    if (bus?.currency_code) currencyCode = bus.currency_code;
  }

  void appendBookAuditLog(bookId, userId, 'ENTRY_CREATED', {
    amount: data.amount,
    entry_type: data.type,
    currency_code: currencyCode,
  }).catch(() => undefined);

  return entryRef.id;
}

export async function updateEntry(
  bookId: string,
  entryId: string,
  data: Partial<Entry> & { type?: EntryType; amount?: number; entry_date?: Date },
  userId: string,
): Promise<void> {
  const entryRef = doc(firestore, 'books', bookId, 'entries', entryId);
  await runTransaction(firestore, async (tx) => {
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists()) return;
    const prev = entrySnap.data() as any;

    const prevDate: Date = prev.entry_date?.toDate ? prev.entry_date.toDate() : new Date();
    const newDate: Date = data.entry_date ?? prevDate;
    const prevType: EntryType = prev.type;
    const newType: EntryType = (data.type ?? prevType) as EntryType;

    const prevAmount: number = prev.amount ?? 0;
    const newAmount: number = data.amount ?? prevAmount;

    const prevMonthKey = toMonthKey(prevDate);
    const newMonthKey = toMonthKey(newDate);

    const prevSummaryRef = doc(firestore, 'books', bookId, 'summaries', prevMonthKey);
    const newSummaryRef = doc(firestore, 'books', bookId, 'summaries', newMonthKey);
    const bookRef = doc(firestore, 'books', bookId);

    // Update the entry first
    tx.update(
      entryRef,
      sanitizeFirestoreData({
        ...(data.type ? { type: data.type } : {}),
        ...(typeof data.amount === 'number' ? { amount: data.amount } : {}),
        ...(data.entry_date ? { entry_date: Timestamp.fromDate(data.entry_date) } : {}),
        ...(data.remark !== undefined ? { remark: data.remark } : {}),
        ...(data.contact_id !== undefined ? { contact_id: data.contact_id } : {}),
        ...(data.contact_name !== undefined ? { contact_name: data.contact_name } : {}),
        ...(data.category_id !== undefined ? { category_id: data.category_id } : {}),
        ...(data.category_name !== undefined ? { category_name: data.category_name } : {}),
        ...(data.payment_mode_id !== undefined ? { payment_mode_id: data.payment_mode_id } : {}),
        ...(data.payment_mode_name !== undefined ? { payment_mode_name: data.payment_mode_name } : {}),
        ...(data.custom_fields !== undefined ? { custom_fields: data.custom_fields } : {}),
        ...(data.image_url !== undefined ? { image_url: data.image_url } : {}),
      } as Record<string, unknown>),
    );

    // Adjust summaries
    const decIn = prevType === 'CASH_IN' ? prevAmount : 0;
    const decOut = prevType === 'CASH_OUT' ? prevAmount : 0;
    const incIn = newType === 'CASH_IN' ? newAmount : 0;
    const incOut = newType === 'CASH_OUT' ? newAmount : 0;

    if (prevMonthKey === newMonthKey) {
      tx.set(
        prevSummaryRef,
        sanitizeFirestoreData({
          book_id: bookId,
          month: prevMonthKey,
          total_in: increment(incIn - decIn),
          total_out: increment(incOut - decOut),
        } as Record<string, unknown>),
        { merge: true },
      );
    } else {
      tx.set(
        prevSummaryRef,
        sanitizeFirestoreData({
          book_id: bookId,
          month: prevMonthKey,
          total_in: increment(-decIn),
          total_out: increment(-decOut),
          entry_count: increment(-1),
        } as Record<string, unknown>),
        { merge: true },
      );

      tx.set(
        newSummaryRef,
        sanitizeFirestoreData({
          book_id: bookId,
          month: newMonthKey,
          total_in: increment(incIn),
          total_out: increment(incOut),
          entry_count: increment(1),
        } as Record<string, unknown>),
        { merge: true },
      );
    }

    tx.update(
      bookRef,
      sanitizeFirestoreData({ last_entry_date: serverTimestamp() } as Record<string, unknown>),
    );
  });

  void appendBookAuditLog(bookId, userId, 'ENTRY_UPDATED', {}).catch(() => undefined);
}

export async function deleteEntry(bookId: string, entryId: string, userId: string): Promise<void> {
  const entryRef = doc(firestore, 'books', bookId, 'entries', entryId);
  await runTransaction(firestore, async (tx) => {
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists()) return;
    const prev = entrySnap.data() as any;
    if (prev.deleted_at) return;

    const prevDate: Date = prev.entry_date?.toDate ? prev.entry_date.toDate() : new Date();
    const prevType: EntryType = prev.type;
    const prevAmount: number = prev.amount ?? 0;
    const prevMonthKey = toMonthKey(prevDate);
    const summaryRef = doc(firestore, 'books', bookId, 'summaries', prevMonthKey);

    tx.update(
      entryRef,
      sanitizeFirestoreData({ deleted_at: serverTimestamp() } as Record<string, unknown>),
    );

    const decIn = prevType === 'CASH_IN' ? prevAmount : 0;
    const decOut = prevType === 'CASH_OUT' ? prevAmount : 0;

    tx.set(
      summaryRef,
      sanitizeFirestoreData({
        book_id: bookId,
        month: prevMonthKey,
        total_in: increment(-decIn),
        total_out: increment(-decOut),
        entry_count: increment(-1),
      } as Record<string, unknown>),
      { merge: true },
    );
  });

  void appendBookAuditLog(bookId, userId, 'ENTRY_DELETED', {}).catch(() => undefined);
}

/** Sums all monthly `summaries` docs for lifetime totals (home cards, quick stats). */
export async function getBookAllTimeSummary(bookId: string): Promise<BookSummaryTotals> {
  const empty: BookSummaryTotals = {
    total_in: 0,
    total_out: 0,
    net_balance: 0,
    entry_count: 0,
  };
  try {
    const col = collection(firestore, 'books', bookId, 'summaries');
    const snap = await getDocs(col);
    let totalIn = 0;
    let totalOut = 0;
    let entryCount = 0;
    snap.forEach((d) => {
      const data = d.data() as { total_in?: number; total_out?: number; entry_count?: number };
      totalIn += data.total_in ?? 0;
      totalOut += data.total_out ?? 0;
      entryCount += data.entry_count ?? 0;
    });
    return {
      total_in: totalIn,
      total_out: totalOut,
      net_balance: totalIn - totalOut,
      entry_count: entryCount,
    };
  } catch (e) {
    if (isFirebasePermissionDenied(e)) return empty;
    throw e;
  }
}

/** Totals for a date range from entry rows (matches pie chart / `getEntries` filters, including today/week partial ranges). */
export async function getBookSummary(bookId: string, dateRange: { from: string; to: string }) {
  const entriesRef = collection(firestore, 'books', bookId, 'entries');
  const fromTs = Timestamp.fromDate(localDayStart(dateRange.from));
  const toTs = Timestamp.fromDate(localDayEnd(dateRange.to));
  const q = query(
    entriesRef,
    where('deleted_at', '==', null),
    where('entry_date', '>=', fromTs),
    where('entry_date', '<=', toTs),
  );
  const snap = await getDocs(q);
  let totalIn = 0;
  let totalOut = 0;
  let entryCount = 0;
  snap.forEach((d) => {
    const data = d.data() as { type?: string; amount?: number };
    const amt = data.amount ?? 0;
    if (data.type === 'CASH_IN') totalIn += amt;
    else if (data.type === 'CASH_OUT') totalOut += amt;
    entryCount += 1;
  });
  return {
    total_in: totalIn,
    total_out: totalOut,
    net_balance: totalIn - totalOut,
    entry_count: entryCount,
  };
}

