import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useBookStore } from '@/store/bookStore';
import { getBookSummary, getEntries } from '@/services/entryService';
import BannerAdPlaceholder from '@/components/ads/BannerAdPlaceholder';
import { generatePDF } from '@/services/pdfService';
import * as Sharing from 'expo-sharing';
import type { Entry, EntryFilters } from '@/utils/models';
import { aggregateCashOutByCategory } from '@/utils/aggregateByCategory';
import { formatMoney } from '@/utils/formatMoney';
import { toLocalISODate } from '@/utils/localISODate';

export default function ReportsScreen() {
  const { t } = useTranslation();
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

  const categorySlices = useMemo(() => aggregateCashOutByCategory(rangeEntries), [rangeEntries]);

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

  const chartWidth = Math.min(width - 32, 360);
  const totalCategoryOut = useMemo(
    () => categorySlices.reduce((a, s) => a + s.amount, 0),
    [categorySlices],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
        ) : Platform.OS === 'web' ? (
          <View style={styles.webLegend}>
            {categorySlices.map((s) => {
              const pct = totalCategoryOut > 0 ? Math.round((s.amount / totalCategoryOut) * 100) : 0;
              return (
                <View key={s.name} style={styles.webLegendRow}>
                  <View style={[styles.swatch, { backgroundColor: s.color }]} />
                  <ThemedText style={styles.webLegendName}>{s.name}</ThemedText>
                  <ThemedText style={styles.webLegendPct}>{pct}%</ThemedText>
                  <ThemedText style={styles.webLegendAmt}>{formatMoney(s.amount)}</ThemedText>
                </View>
              );
            })}
          </View>
        ) : (
          <PieChart
            data={pieData}
            width={chartWidth}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        )}

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
  exportBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    marginTop: 2,
  },
  pressed: { opacity: 0.9 },
  webLegend: { gap: 10, marginTop: 4 },
  webLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  webLegendName: { flex: 1 },
  webLegendPct: { opacity: 0.8, width: 40, textAlign: 'right' },
  webLegendAmt: { fontWeight: '700', minWidth: 88, textAlign: 'right' },
});
