import * as logger from 'firebase-functions/logger';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { CollectionReference, Query } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as v1 from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const db = admin.firestore();

function resolveGeminiKey(): string {
  const env = process.env.GEMINI_API_KEY ?? '';
  if (env) return env;
  try {
    const cfg = functions.config() as { gemini?: { api_key?: string } };
    return cfg?.gemini?.api_key ?? '';
  } catch {
    return '';
  }
}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

type Ok<T> = { success: true; data: T };
type Fail = { success: false; error: { code: string; message: string } };

function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

function fail(code: string, message: string): Fail {
  return { success: false, error: { code, message } };
}

function parseJsonBlock(text: string): unknown {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  }
  return JSON.parse(t);
}

async function rateLimitAi(uid: string, field: 'categorize_count' | 'insights_count', limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`rate_limits/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() as
      | { date?: string; categorize_count?: number; insights_count?: number }
      | undefined;
    const sameDay = d?.date === day;
    let cat = sameDay ? (d?.categorize_count ?? 0) : 0;
    let ins = sameDay ? (d?.insights_count ?? 0) : 0;
    if (field === 'categorize_count') {
      if (cat >= limit) throw new HttpsError('resource-exhausted', 'Daily AI limit reached');
      cat += 1;
    } else {
      if (ins >= limit) throw new HttpsError('resource-exhausted', 'Daily insights limit reached');
      ins += 1;
    }
    tx.set(
      ref,
      {
        date: day,
        categorize_count: cat,
        insights_count: ins,
        user_id: uid,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export const onUserCreated = v1.region('us-central1').auth.user().onCreate(async (user) => {
  try {
    await db.doc(`users/${user.uid}`).set(
      {
        firebase_uid: user.uid,
        email: user.email ?? '',
        name: user.displayName ?? '',
        onboarding_complete: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    logger.error('onUserCreated', e);
  }
});

export const onEntryWrite = onDocumentWritten('books/{bookId}/entries/{entryId}', async (event) => {
  if (!event.data?.after.exists) return;
  const d = event.data.after.data();
  if (d?.deleted_at) return;
});

export const geminiCategorize = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const uid = request.auth.uid;
  const body = request.data as {
    amount?: number;
    remark?: string | null;
    paymentMode?: string | null;
    categories?: string[];
    language?: string;
  };
  const list = Array.isArray(body.categories) && body.categories.length ? body.categories : ['Other'];
  const first = list[0] ?? 'Other';

  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY missing');
    return ok({
      category: first,
      confidence: 0,
      is_new: false,
      reasoning: 'GEMINI_API_KEY not configured',
    });
  }

  try {
    await rateLimitAi(uid, 'categorize_count', 50);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw e;
  }

  const prompt = `Categories: ${list.join(', ')}. Amount: ${body.amount ?? 0}. Remark: ${body.remark ?? ''}. JSON only: {"category":"...","confidence":0-1,"is_new":bool,"reasoning":""}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const parsed = parseJsonBlock(result.response.text()) as {
      category?: string;
      confidence?: number;
      is_new?: boolean;
      reasoning?: string;
    };
    let cat = first;
    if (typeof parsed.category === 'string') {
      cat = list.includes(parsed.category)
        ? parsed.category
        : list.find((c) => c.toLowerCase() === parsed.category?.toLowerCase()) ?? first;
    }
    return ok({
      category: cat,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      is_new: Boolean(parsed.is_new),
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    });
  } catch (e) {
    logger.error('geminiCategorize', e);
    return ok({
      category: first,
      confidence: 0,
      is_new: false,
      reasoning: 'Gemini request failed',
    });
  }
});

export const getSpendingInsights = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const uid = request.auth.uid;
  const apiKey = resolveGeminiKey();
  if (!apiKey) {
    return ok({ insights: [] as unknown[] });
  }
  try {
    await rateLimitAi(uid, 'insights_count', 10);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw e;
  }
  const data = request.data as { summary?: Record<string, unknown>; categories?: string[] };
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(
      `Insights JSON: {"insights":[{"id":"1","emoji":"📊","headline":"","detail":"","trend":"flat"}]} Data: ${JSON.stringify(data)}`,
    );
    const parsed = parseJsonBlock(result.response.text()) as { insights?: unknown[] };
    return ok({ insights: Array.isArray(parsed.insights) ? parsed.insights : [] });
  } catch (e) {
    logger.error('getSpendingInsights', e);
    return ok({ insights: [] });
  }
});

export const exportToGoogleDrive = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  return fail('NOT_IMPLEMENTED', 'Google Drive export not configured');
});

export const sendTeamInvite = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const uid = request.auth.uid;
  const { email, role, businessId } = request.data as { email?: string; role?: string; businessId?: string };
  if (!email || !businessId) return fail('INVALID_ARGUMENT', 'email and businessId required');
  const memberSnap = await db.collection('businesses').doc(businessId).collection('members').doc(uid).get();
  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this business');
  }
  const memberRole = (memberSnap.data() as { role?: string } | undefined)?.role;
  if (memberRole !== 'PRIMARY_ADMIN' && memberRole !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Only business admins can send invites');
  }
  const raw = typeof role === 'string' ? role.trim() : '';
  const inviteRole = raw === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
  await db.collection('invites').add({
    email,
    role: inviteRole,
    business_id: businessId,
    invited_by: request.auth.uid,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ok({ sent: true });
});

async function deleteCollectionAll(col: CollectionReference) {
  let snap = await col.limit(400).get();
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    snap = await col.limit(400).get();
  }
}

/** Delete all documents returned by a query (batched). */
async function deleteByQuery(q: Query) {
  let snap = await q.limit(500).get();
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    snap = await q.limit(500).get();
  }
}

const BOOK_SUBCOLLECTIONS = [
  'entries',
  'summaries',
  'categories',
  'payment_modes',
  'contacts',
  'members',
  'custom_fields',
  'audit_logs',
] as const;

/** Admin SDK only: delete a book and all nested data (used by callable + GDPR). */
async function deleteBookDataCascade(bookId: string) {
  const base = db.collection('books').doc(bookId);
  for (const s of BOOK_SUBCOLLECTIONS) {
    await deleteCollectionAll(base.collection(s));
  }
  await base.delete().catch(() => undefined);
}

/** Admin SDK only: delete all books for a business, then members, then business doc. */
async function deleteBusinessCascade(businessId: string) {
  const booksSnap = await db.collection('books').where('business_id', '==', businessId).get();
  for (const b of booksSnap.docs) {
    await deleteBookDataCascade(b.id);
  }
  await deleteCollectionAll(db.collection('businesses').doc(businessId).collection('members'));
  await db.collection('businesses').doc(businessId).delete().catch(() => undefined);
}

export const deleteBookCascade = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const uid = request.auth.uid;
  const { bookId } = request.data as { bookId?: string };
  if (!bookId) return fail('INVALID_ARGUMENT', 'bookId required');
  const base = db.collection('books').doc(bookId);
  const memberSnap = await base.collection('members').doc(uid).get();
  if (!memberSnap.exists) {
    throw new HttpsError('permission-denied', 'Not a member of this book');
  }
  const role = (memberSnap.data() as { role?: string } | undefined)?.role;
  if (role !== 'PRIMARY_ADMIN') {
    throw new HttpsError('permission-denied', 'Only the primary admin can delete this book');
  }
  try {
    await deleteBookDataCascade(bookId);
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const msg = e instanceof Error ? e.message : 'Delete failed';
    logger.error('deleteBookCascade', e);
    return fail('INTERNAL', msg);
  }
});

async function deleteUserDataForGdpr(uid: string, email: string | undefined) {
  const ownedBiz = await db.collection('businesses').where('owner_id', '==', uid).get();
  for (const b of ownedBiz.docs) {
    await deleteBusinessCascade(b.id);
  }

  const memSnap = await db.collectionGroup('members').where('user_id', '==', uid).get();
  for (const d of memSnap.docs) {
    const parts = d.ref.path.split('/');
    const mrole = (d.data() as { role?: string }).role;
    if (parts[0] === 'books' && parts[2] === 'members') {
      const bookId = parts[1];
      if (mrole === 'PRIMARY_ADMIN') {
        const bookSnap = await db.collection('books').doc(bookId).get();
        if (bookSnap.exists) await deleteBookDataCascade(bookId);
      } else {
        await d.ref.delete();
      }
    } else if (parts[0] === 'businesses' && parts[2] === 'members') {
      const bid = parts[1];
      const bizSnap = await db.collection('businesses').doc(bid).get();
      if (bizSnap.exists && bizSnap.data()?.owner_id === uid) {
        await deleteBusinessCascade(bid);
      } else {
        await d.ref.delete();
      }
    }
  }

  await deleteByQuery(db.collection('invites').where('invited_by', '==', uid));
  if (email) {
    await deleteByQuery(db.collection('invites').where('email', '==', email));
  }

  await deleteByQuery(db.collection('audit_logs').where('user_id', '==', uid));

  await db.doc(`rate_limits/${uid}`).delete().catch(() => undefined);
  await db.doc(`users/${uid}`).delete().catch(() => undefined);
}

export const processGdprRequest = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required');
  const uid = request.auth.uid;
  const { type } = request.data as { type?: 'EXPORT' | 'DELETE' };
  if (type !== 'EXPORT' && type !== 'DELETE') {
    return fail('INVALID_ARGUMENT', 'type must be EXPORT or DELETE');
  }
  try {
    if (type === 'EXPORT') {
      await db.collection('gdpr_requests').add({
        user_id: uid,
        type: 'EXPORT',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return ok({ message: 'Export requested — you will receive a download link shortly' });
    }
    const userRecord = await admin.auth().getUser(uid);
    await deleteUserDataForGdpr(uid, userRecord.email ?? undefined);
    await admin.auth().deleteUser(uid);
    return ok({ deleted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    logger.error('processGdprRequest', e);
    return fail('INTERNAL', msg);
  }
});
