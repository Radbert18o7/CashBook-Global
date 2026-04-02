import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import CategoryBreakdownVisualization from '@/components/reports/CategoryBreakdownVisualization';
import { useColors } from '@/hooks/useColors';
import { useSafeArea } from '@/hooks/useSafeArea';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { useBookStore } from '@/store/bookStore';
import { getBookSummary, getEntries } from '@/services/entryService';
import {
  getSpendingInsights,
  MIN_ENTRIES_FOR_AI_INSIGHTS,
  type GeminiInsight,
  type SpendingInsightsSkipReason,
} from '@/services/geminiService';
import BannerAdPlaceholder from '@/components/ads/BannerAdPlaceholder';
import { generatePDF } from '@/services/pdfService';
import * as Sharing from 'expo-sharing';
import type { Entry, EntryFilters } from '@/utils/models';
import { aggregateCashOutByCategory } from '@/utils/aggregateByCategory';
import { formatMoney } from '@/utils/formatMoney';
import { toLocalISODate } from '@/utils/localISODate';

function skipReasonMessage(
  t: (k: string, o?: Record<string, unknown>) => string,
  reason: SpendingInsightsSkipReason,
): string {
  switch (reason) {
    case 'too_few_entries':
      return t('reports.insightsNeedMoreEntries', { count: MIN_ENTRIES_FOR_AI_INSIGHTS });
    case 'not_signed_in':
      return t('reports.insightsSignIn');
    case 'callable_disabled':
      return t('ai.unavailable');
    case 'rate_limited':
      return t('ai.limitReached');
    case 'request_failed':
      return t('ai.unavailable');
    default:
      return t('ai.unavailable');
  }
}

export default function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const currency = useAuthStore((s) => s.user?.currency ?? 'USD');
  const { scrollBottomPad } = useSafeArea();
  const { width } = useWindowDimensions();
  const { currentBook } = useBookStore();
  const [summary, setSummary] = useState<{
    total_in: number;
    total_out: number;
    net_balance: number;
    entry_count: number;
  } | null>(null);

  const [range, setRange] = useState<'today' | 'week' | 'month'>('month');
  const [exporting, setExporting] = useState(false);
  const [rangeEntries, setRangeEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [aiInsights, setAiInsights] = useState<GeminiInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsRequested, setInsightsRequested] = useState(false);
  const [insightsSkipReason, setInsightsSkipReason] = useState<SpendingInsightsSkipReason | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (range === 'today') {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const iso = toLocalISODate(day);
      return { from: iso, to: iso };
    }
    if (range === 'week') {
      const from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { from: toLocalISODate(from), to: toLocalISODate(now) };
    }
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toLocalISODate(from), to: toLocalISODate(to) };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentBook?.id) return;
      const s = await getBookSummary(currentBook.id, dateRange);
      if (cancelled) return;
      setSummary(s);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentBook?.id, dateRange]);

  useEffect(() => {
    let cancelled = false;
    async function loadEntries() {
      if (!currentBook?.id) {
        setRangeEntries([]);
        return;
      }
      setLoadingEntries(true);
      try {
        const res = await getEntries(
          currentBook.id,
          { type: 'ALL', fromDate: dateRange.from, toDate: dateRange.to } as EntryFilters,
          null,
          500,
        );
        if (cancelled) return;
        setRangeEntries(res.entries);
      } finally {
        if (!cancelled) setLoadingEntries(false);
      }
    }
    void loadEntries();
    return () => {
      cancelled = true;
    };
  }, [currentBook?.id, dateRange]);

  useEffect(() => {
    setAiInsights([]);
    setInsightsRequested(false);
    setInsightsSkipReason(undefined);
  }, [currentBook?.id, dateRange]);

  const categorySlices = useMemo(() => aggregateCashOutByCategory(rangeEntries), [rangeEntries]);

  const insightCategories = useMemo(() => {
    const s = new Set<string>();
    for (const e of rangeEntries) {
      const n = e.category_name?.trim();
      if (n) s.add(n);
    }
    return [...s];
  }, [rangeEntries]);

  const insightContacts = useMemo(() => {
    const s = new Set<string>();
    for (const e of rangeEntries) {
      const n = e.contact_name?.trim();
      if (n) s.add(n);
    }
    return [...s];
  }, [rangeEntries]);

  const insightPaymentModes = useMemo(() => {
    const s = new Set<string>();
    for (const e of rangeEntries) {
      const n = e.payment_mode_name?.trim();
      if (n) s.add(n);
    }
    return [...s];
  }, [rangeEntries]);

  const pieData = useMemo(
    () =>
      categorySlices.map((s) => ({
        name: s.name.length > 16 ? `${s.name.slice(0, 14)}…` : s.name,
        population: s.amount,
        color: s.color,
        legendFontColor: '#64748B',
        legendFontSize: 12,
      })),
    [categorySlices],
  );

  async function handleExportPdf() {
    if (!currentBook?.id) return;
    setExporting(true);
    try {
      const res = await getEntries(
        currentBook.id,
        { type: 'ALL', fromDate: dateRange.from, toDate: dateRange.to } as EntryFilters,
        null,
        200,
      );

      const uri = await generatePDF(
        { ...currentBook, business_name: undefined },
        res.entries,
        summary ?? { total_in: 0, total_out: 0, net_balance: 0, entry_count: 0 },
        dateRange,
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleGenerateInsights() {
    if (!currentBook?.id || !summary) return;
    setInsightsLoading(true);
    setInsightsRequested(true);
    setInsightsSkipReason(undefined);
    setAiInsights([]);
    try {
      const out = await getSpendingInsights(
        summary,
        insightCategories,
        insightContacts,
        insightPaymentModes,
        null,
        i18n.language ?? 'en',
        currency,
      );
      setAiInsights(out.insights);
      setInsightsSkipReason(out.skipReason);
    } finally {
      setInsightsLoading(false);
    }
  }

  const chartWidth = Math.min(width - 32, 360);
  const totalCategoryOut = useMemo(
    () => categorySlices.reduce((a, s) => a + s.amount, 0),
    [categorySlices],
  );

  return (
    <ThemedView style={styles.container} lightColor={colors.background} darkColor={colors.background}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPad + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={styles.title}>
          {t('reports.title')}
        </ThemedText>

        <ThemedText style={styles.sub}>
          {currentBook?.name ?? t('home.noBooksSubtitle')}
        </ThemedText>

        <View style={styles.rangeRow}>
          <Pressable
            onPress={() => setRange('today')}
            style={[styles.rangeBtn, range === 'today' && styles.rangeBtnActive]}
          >
            <ThemedText type="defaultSemiBold">{t('reports.today')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setRange('week')}
            style={[styles.rangeBtn, range === 'week' && styles.rangeBtnActive]}
          >
            <ThemedText type="defaultSemiBold">{t('reports.thisWeek')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setRange('month')}
            style={[styles.rangeBtn, range === 'month' && styles.rangeBtnActive]}
          >
            <ThemedText type="defaultSemiBold">{t('reports.thisMonth')}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>{t('home.totalIn')}</ThemedText>
          <ThemedText style={[styles.cardValue, styles.in]}>
            {formatMoney(summary?.total_in ?? 0)}
          </ThemedText>
        </View>
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>{t('home.totalOut')}</ThemedText>
          <ThemedText style={[styles.cardValue, styles.out]}>
            {formatMoney(summary?.total_out ?? 0)}
          </ThemedText>
        </View>
        <View style={styles.card}>
          <ThemedText style={styles.cardLabel}>{t('home.netBalance')}</ThemedText>
          <ThemedText style={styles.cardValue}>{formatMoney(summary?.net_balance ?? 0)}</ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {t('reports.categoryBreakdown')}
        </ThemedText>
        {loadingEntries ? (
          <ActivityIndicator style={styles.chartSpinner} />
        ) : pieData.length === 0 ? (
          <ThemedText style={styles.muted}>{t('entry.noEntries')}</ThemedText>
        ) : (
          <CategoryBreakdownVisualization
            categorySlices={categorySlices}
            pieData={pieData}
            totalCategoryOut={totalCategoryOut}
            chartWidth={chartWidth}
            formatMoney={formatMoney}
            currency={currency}
          />
        )}

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {t('reports.aiInsights')}
        </ThemedText>
        {summary && summary.entry_count < MIN_ENTRIES_FOR_AI_INSIGHTS ? (
          <ThemedText style={styles.muted}>
            {t('reports.insightsNeedMoreEntries', { count: MIN_ENTRIES_FOR_AI_INSIGHTS })}
          </ThemedText>
        ) : null}
        <Pressable
          onPress={() => void handleGenerateInsights()}
          style={({ pressed }) => [
            styles.insightsBtn,
            pressed && styles.pressed,
            (insightsLoading || !summary || (summary.entry_count ?? 0) < MIN_ENTRIES_FOR_AI_INSIGHTS) &&
              styles.insightsBtnDisabled,
          ]}
          disabled={insightsLoading || !summary || (summary.entry_count ?? 0) < MIN_ENTRIES_FOR_AI_INSIGHTS}
        >
          {insightsLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.insightsBtnText}>
              {t('reports.generateInsights')}
            </ThemedText>
          )}
        </Pressable>
        {insightsRequested && !insightsLoading && insightsSkipReason ? (
          <ThemedText style={styles.muted}>{skipReasonMessage(t, insightsSkipReason)}</ThemedText>
        ) : null}
        {insightsRequested && !insightsLoading && !insightsSkipReason && aiInsights.length === 0 ? (
          <ThemedText style={styles.muted}>{t('reports.noInsights')}</ThemedText>
        ) : null}
        {aiInsights.length > 0 ? (
          <View style={styles.insightsList}>
            {aiInsights.map((row) => (
              <View
                key={row.id}
                style={[styles.insightCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
              >
                <ThemedText style={styles.insightEmoji}>{row.emoji}</ThemedText>
                <View style={styles.insightBody}>
                  <ThemedText type="defaultSemiBold">{row.headline}</ThemedText>
                  {row.detail ? <ThemedText style={styles.insightDetail}>{row.detail}</ThemedText> : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => void handleExportPdf()}
          style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed]}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="defaultSemiBold">{t('reports.exportPdf')}</ThemedText>
          )}
        </Pressable>

        <BannerAdPlaceholder />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { textAlign: 'left', marginTop: 8 },
  sub: { opacity: 0.75 },
  rangeRow: { flexDirection: 'row', gap: 10 },
  rangeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
    alignItems: 'center',
  },
  rangeBtnActive: { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.12)' },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.25)',
    padding: 14,
    gap: 6,
  },
  cardLabel: { opacity: 0.75 },
  cardValue: { fontSize: 28, fontWeight: '800' },
  in: { color: '#10B981' },
  out: { color: '#F43F5E' },
  sectionTitle: { marginTop: 8 },
  chartSpinner: { marginVertical: 24 },
  muted: { opacity: 0.7 },
  insightsBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0F766E',
    marginTop: 4,
  },
  insightsBtnDisabled: { opacity: 0.45 },
  insightsBtnText: { color: '#fff' },
  insightsList: { gap: 10, marginTop: 8 },
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    alignItems: 'flex-start',
  },
  insightEmoji: { fontSize: 22, lineHeight: 26 },
  insightBody: { flex: 1, gap: 4 },
  insightDetail: { opacity: 0.85, fontSize: 14 },
  exportBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    marginTop: 2,
  },
  pressed: { opacity: 0.9 },
});
