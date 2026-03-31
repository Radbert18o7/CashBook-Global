import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import BannerAdPlaceholder from '@/components/ads/BannerAdPlaceholder';
import { useAuthStore } from '@/store/authStore';
import { useEntryStore } from '@/store/entryStore';
import { useBookStore } from '@/store/bookStore';
import { getEntries, deleteEntry, getBookSummary } from '@/services/entryService';
import type { EntryFilters } from '@/utils/models';
import { toLocalISODate } from '@/utils/localISODate';

export default function BookDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = params.bookId;

  const user = useAuthStore((s) => s.user);
  const { books } = useBookStore();
  const book = useMemo(() => books.find((b) => b.id === bookId), [books, bookId]);

  const { entries, setEntries, removeEntry, setLoading, setHasMore, lastDoc, setLastDoc, hasMore } =
    useEntryStore();

  const [summary, setSummary] = useState<{ total_in: number; total_out: number; net_balance: number; entry_count: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadInitial = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dateRange = { from: toLocalISODate(from), to: toLocalISODate(to) };
      const s = await getBookSummary(bookId, dateRange);
      setSummary(s);
      const res = await getEntries(bookId, {} as EntryFilters, null, 20);
      setEntries(res.entries);
      setHasMore(res.hasMore);
      setLastDoc(res.lastDoc);
    } finally {
      setLoading(false);
    }
  }, [bookId, setEntries, setHasMore, setLastDoc, setLoading]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function loadMore() {
    if (!bookId) return;
    if (!lastDoc) return;
    setLoading(true);
    try {
      const res = await getEntries(bookId, {} as EntryFilters, lastDoc, 20);
      const current = useEntryStore.getState().entries;
      setEntries([...current, ...res.entries]);
      setHasMore(res.hasMore);
      setLastDoc(res.lastDoc);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!bookId || !user) return;
    try {
      await deleteEntry(bookId, entryId, user.uid);
      removeEntry(entryId);
    } catch {
      // ignore for scaffold
    }
  }

  const netText = summary ? summary.net_balance.toFixed(2) : '0.00';
  const totalIn = summary ? summary.total_in.toFixed(2) : '0.00';
  const totalOut = summary ? summary.total_out.toFixed(2) : '0.00';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <ThemedText type="defaultSemiBold">{'< Back'}</ThemedText>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {book?.name ?? 'Book'}
          </ThemedText>
          <ThemedText style={styles.headerSub}>Home • {bookId}</ThemedText>
        </View>
        <Pressable onPress={() => router.push('/reports/index')} style={styles.headerBtn}>
          <ThemedText type="defaultSemiBold">{'PDF'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <ThemedText style={styles.balanceLabel}>Net Balance</ThemedText>
        <ThemedText type="title" style={styles.balanceValue}>
          {netText}
        </ThemedText>
        <View style={styles.balanceRow}>
          <ThemedText style={[styles.metric, styles.metricIn]}>{`Total In: ${totalIn}`}</ThemedText>
          <ThemedText style={[styles.metric, styles.metricOut]}>{`Total Out: ${totalOut}`}</ThemedText>
        </View>
        <Pressable
          onPress={() => router.push('/reports/index')}
          style={({ pressed }) => [styles.reportsButton, pressed && styles.pressed]}
        >
          <ThemedText type="defaultSemiBold">{'View Reports'}</ThemedText>
        </Pressable>
      </View>

      <View style={styles.entriesHeader}>
        <ThemedText type="defaultSemiBold">{entries.length ? 'Entries' : 'No entries yet'}</ThemedText>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadInitial(); setRefreshing(false); }} />
        }
        renderItem={({ item }) => (
          <View style={styles.entryRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="defaultSemiBold">
                {item.type === 'CASH_IN' ? `+ ${item.amount.toFixed(2)}` : `- ${item.amount.toFixed(2)}`}
              </ThemedText>
              <ThemedText style={styles.entrySub}>{item.contact_name ?? 'Unknown contact'}</ThemedText>
              <ThemedText style={styles.entrySub} numberOfLines={1}>
                {item.remark ?? ''}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/home/[bookId]/edit-entry', params: { bookId, entryId: item.id } })}
              style={styles.smallBtn}
            >
              <ThemedText type="defaultSemiBold">{'Edit'}</ThemedText>
            </Pressable>
            <Pressable onPress={() => handleDelete(item.id)} style={[styles.smallBtn, styles.dangerBtn]}>
              <ThemedText type="defaultSemiBold">{'Del'}</ThemedText>
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {entries.length === 0 ? (
              <ThemedText style={styles.emptyText}>{'Add your first entry to start tracking.'}</ThemedText>
            ) : null}
            <Pressable onPress={() => void loadMore()} disabled={!hasMore} style={styles.loadMoreBtn}>
              <ThemedText type="defaultSemiBold">{'Load more'}</ThemedText>
            </Pressable>
          </View>
        }
      />

      <BannerAdPlaceholder />

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.push({ pathname: '/home/[bookId]/add-entry', params: { bookId, type: 'CASH_IN' } })}
          style={[styles.bottomHalf, styles.cashIn]}
        >
          <ThemedText type="defaultSemiBold">{'CASH IN'}</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/home/[bookId]/add-entry', params: { bookId, type: 'CASH_OUT' } })}
          style={[styles.bottomHalf, styles.cashOut]}
        >
          <ThemedText type="defaultSemiBold">{'CASH OUT'}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  headerBtn: { width: 72, alignItems: 'center', paddingVertical: 8 },
  headerSub: { opacity: 0.7, fontSize: 12 },
  balanceCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.25)', gap: 8 },
  balanceLabel: { opacity: 0.75 },
  balanceValue: { fontSize: 34, fontWeight: '800', lineHeight: 38 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  metric: { flex: 1, fontWeight: '600' },
  metricIn: { color: '#10B981' },
  metricOut: { color: '#F43F5E' },
  reportsButton: { marginTop: 6, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  pressed: { opacity: 0.9 },
  entriesHeader: { marginTop: 8, paddingHorizontal: 16 },
  listContent: { padding: 16, gap: 12, paddingBottom: 96 },
  entryRow: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.2)' },
  entrySub: { opacity: 0.75 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { backgroundColor: '#F43F5E' },
  footer: { alignItems: 'center', gap: 10, paddingVertical: 14 },
  emptyText: { opacity: 0.7, textAlign: 'center' },
  loadMoreBtn: { width: '100%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.35)', paddingVertical: 12, alignItems: 'center' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, flexDirection: 'row' },
  bottomHalf: { flex: 1, alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
  cashIn: { backgroundColor: '#10B981' },
  cashOut: { backgroundColor: '#F43F5E' },
});

