import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

import { firebaseAuth, firebaseFunctions, firestore } from './firebase';

const USE_GEMINI_CALLABLE = process.env.EXPO_PUBLIC_USE_GEMINI_CALLABLE === '1';

function unwrapCallable<T>(raw: unknown): T | null {
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const r = raw as { success?: boolean; data?: T };
    if (r.success === false) return null;
    if (r.success === true && r.data !== undefined) return r.data as T;
  }
  return (raw as T) ?? null;
}

function rateLimitUserId(): string {
  return firebaseAuth.currentUser?.uid ?? 'anonymous';
}

type GeminiCategoryResult = {
  category: string;
  confidence: number; // 0..1
  is_new: boolean;
  reasoning: string;
};

export type GeminiInsight = {
  id: string;
  emoji: string;
  headline: string;
  detail: string;
  trend: 'up' | 'down' | 'flat';
};

/** Minimum book entries (for the summarized period) before calling Gemini for insights (BRD / BUG-014). */
export const MIN_ENTRIES_FOR_AI_INSIGHTS = 5;

export type SpendingInsightsSkipReason =
  | 'too_few_entries'
  | 'not_signed_in'
  | 'callable_disabled'
  | 'rate_limited'
  | 'request_failed';

export type SpendingInsightsOutcome = {
  insights: GeminiInsight[];
  skipReason?: SpendingInsightsSkipReason;
};

/** Same calendar day as `functions/src/index.ts` `rateLimitAi` (`toISOString().slice(0, 10)`). */
function rateLimitDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readAiUsageCounts(data: { date?: string; categorize_count?: number; insights_count?: number } | undefined) {
  const day = rateLimitDayKey();
  const sameDay = data?.date === day;
  return {
    day,
    categorizeCount: sameDay ? (data?.categorize_count ?? 0) : 0,
    insightsCount: sameDay ? (data?.insights_count ?? 0) : 0,
  };
}

/** Read-only: matches server `rateLimitAi` document shape (server is the writer when callables run). */
async function assertUnderAiLimit(userId: string, kind: 'categorize' | 'insights', limit: number) {
  const snap = await getDoc(doc(firestore, 'rate_limits', userId));
  const { categorizeCount, insightsCount } = readAiUsageCounts(snap.data());
  const current = kind === 'categorize' ? categorizeCount : insightsCount;
  if (current >= limit) {
    throw new Error(`Daily ${kind} limit reached`);
  }
}

export async function categorizeEntry(
  amount: number,
  remark: string | null,
  paymentMode: string | null,
  categories: string[],
  language: string,
): Promise<GeminiCategoryResult> {
  const fallback: GeminiCategoryResult = {
    category: categories[0] ?? 'Other',
    confidence: 0,
    is_new: false,
    reasoning: 'Using local fallback (callable off or unavailable).',
  };

  const uid = rateLimitUserId();
  if (USE_GEMINI_CALLABLE && firebaseAuth.currentUser) {
    await assertUnderAiLimit(uid, 'categorize', 50);
  }

  if (USE_GEMINI_CALLABLE && firebaseAuth.currentUser) {
    try {
      const fn = httpsCallable(firebaseFunctions, 'geminiCategorize');
      const res = await fn({ amount, remark, paymentMode, categories, language });
      const data = unwrapCallable<Partial<GeminiCategoryResult>>(res.data) ?? (res.data as Partial<GeminiCategoryResult>);
      if (data && typeof data.category === 'string') {
        return {
          category: data.category,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0,
          is_new: Boolean(data.is_new),
          reasoning: typeof data.reasoning === 'string' ? data.reasoning : '',
        };
      }
    } catch {
      // fall through
    }
  }

  return {
    ...fallback,
    reasoning: USE_GEMINI_CALLABLE
      ? 'Cloud callable failed; using fallback category.'
      : 'Set EXPO_PUBLIC_USE_GEMINI_CALLABLE=1 and deploy geminiCategorize.',
  };
}

export async function getSpendingInsights(
  summary: { total_in: number; total_out: number; net_balance: number; entry_count: number },
  categories: string[],
  contacts: string[],
  paymentModes: string[],
  prevSummary: { total_in: number; total_out: number; net_balance: number; entry_count: number } | null,
  language: string,
  currency: string,
  entries: any[],
): Promise<SpendingInsightsOutcome> {
  void contacts;
  void paymentModes;
  void prevSummary;

  if (summary.entry_count < MIN_ENTRIES_FOR_AI_INSIGHTS) {
    return { insights: [], skipReason: 'too_few_entries' };
  }

  if (!USE_GEMINI_CALLABLE) {
    return { insights: [], skipReason: 'callable_disabled' };
  }

  if (!firebaseAuth.currentUser) {
    return { insights: [], skipReason: 'not_signed_in' };
  }

  const uid = rateLimitUserId();
  try {
    await assertUnderAiLimit(uid, 'insights', 10);
  } catch {
    return { insights: [], skipReason: 'rate_limited' };
  }

  try {
    const fn = httpsCallable(firebaseFunctions, 'getSpendingInsights');
    const res = await fn({
      summary,
      categories,
      language,
      currency,
    });
    const data =
      unwrapCallable<{ insights?: GeminiInsight[] }>(res.data) ?? (res.data as { insights?: GeminiInsight[] });
    if (Array.isArray(data.insights)) {
      const insights = data.insights.filter(
        (x) => x && typeof x.id === 'string' && typeof x.headline === 'string',
      ) as GeminiInsight[];
      return { insights };
    }
  } catch {
    return { insights: [], skipReason: 'request_failed' };
  }

  return { insights: [], skipReason: 'request_failed' };
}

