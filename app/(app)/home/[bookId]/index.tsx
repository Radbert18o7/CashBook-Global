import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import BannerAdPlaceholder from '@/components/ads/BannerAdPlaceholder';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useEntryStore } from '@/store/entryStore';
import { useBookStore } from '@/store/bookStore';
import { getBook } from '@/services/bookService';
import { getEntries, getBookSummary } from '@/services/entryService';
import { getBookMembers } from '@/services/memberService';
import { generatePDF } from '@/services/pdfService';
import type { Entry, EntryFilters } from '@/utils/models';
import { toLocalISODate } from '@/utils/localISODate';
import { formatMoney } from '@/utils/formatMoney';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useColors } from '@/hooks/useColors';

function entryDate(d: Entry): Date {
  const raw = d.entry_date;
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function entryDayKey(e: Entry): string {
  return toLocalISODate(entryDate(e));
}

function formatSectionTitle(iso: string): string {
  const today = toLocalISODate(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = toLocalISODate(y);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  const [y0, m, day] = iso.split('-').map(Number);
  const d = new Date(y0, (m ?? 1) - 1, day ?? 1);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function entryTimeLabel(e: Entry): string {
  return entryDate(e).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function buildSections(entries: Entry[]): { title: string; data: Entry[] }[] {
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = entryDayKey(e);
    const arr = byDay.get(k) ?? [];
    arr.push(e);
    byDay.set(k, arr);
  }
  const keys = [...byDay.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return keys.map((k) => ({
    title: formatSectionTitle(k),
    data: (byDay.get(k) ?? []).sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime()),
  }));
}

function AnimatedCashButton({
  children,
  onPress,
  backgroundColor,
}: {
  children: React.ReactNode;
  onPress: () => void;
  backgroundColor: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          anim,
          {
            height: 52,
            backgroundColor,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function BookDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const colors = useColors();
  const theme = useSettingsTheme();
  const params = useLocalSearchParams<{ bookId: string }>();
  const rawBookId = params.bookId;
  const bookId = rawBookId === 'index' ? undefined : rawBookId;

  useEffect(() => {
    if (rawBookId === 'index') {
      router.replace('/home');
    }
  }, [rawBookId, router]);

  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? 'USD';
  const { books, setCurrentBook } = useBookStore();
  const { currentBusiness } = useBusinessStore();
  const book = useMemo(() => (bookId ? books.find((b) => b.id === bookId) : undefined), [books, bookId]);
  const [fetchedBookName, setFetchedBookName] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const { entries, setEntries, setLoading, setHasMore, lastDoc, setLastDoc, hasMore, resetEntries } =
    useEntryStore();
  const entriesLoading = useEntryStore((s) => s.isLoading);

  const [summary, setSummary] = useState<{
    total_in: number;
    total_out: number;
    net_balance: number;
    entry_count: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [netAnim, setNetAnim] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);

  const bounceY = useSharedValue(0);
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [bounceY]);

  useEffect(() => {
    if (!bookId) return;
    if (book) {
      setCurrentBook(book);
      setFetchedBookName(book.name);
      return;
    }
    let cancelled = false;
    void getBook(bookId).then((b) => {
      if (cancelled || !b) return;
      setFetchedBookName(b.name);
      setCurrentBook(b);
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, book, setCurrentBook]);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    void getBookMembers(bookId).then((m) => {
      if (!cancelled) setMemberCount(m.length);
    });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const headerTitle = book?.name ?? fetchedBookName ?? 'Book';

  useLayoutEffect(() => {
    if (!bookId) return;
    resetEntries();
  }, [bookId, resetEntries]);

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

  const targetNet = summary?.net_balance ?? 0;
  useEffect(() => {
    const start = Date.now();
    const duration = 900;
    let frame: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setNetAnim(targetNet * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetNet]);

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

  async function handleExportPdf() {
    if (!bookId || !book) return;
    setPdfBusy(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dateRange = { from: toLocalISODate(from), to: toLocalISODate(to) };
      const s =
        summary ??
        (await getBookSummary(bookId, dateRange));
      const res = await getEntries(bookId, {} as EntryFilters, null, 500);
      const uri = await generatePDF(
        { ...book, business_name: currentBusiness?.name },
        res.entries,
        s,
        dateRange,
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('Export failed', 'Could not create PDF.');
    } finally {
      setPdfBusy(false);
    }
  }

  function openOverflowMenu() {
    if (!bookId) return;
    const goSettings = () =>
      router.push({ pathname: '/home/[bookId]/settings', params: { bookId } });
    const goReports = () => router.push('/reports');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Book settings', 'View reports', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (i) => {
          if (i === 0) goSettings();
          if (i === 1) goReports();
        },
      );
    } else {
      Alert.alert('Book', undefined, [
        { text: 'Book settings', onPress: goSettings },
        { text: 'View reports', onPress: goReports },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  const sections = useMemo(() => buildSections(entries), [entries]);

  const privacyOnlyYou = memberCount !== null && memberCount <= 1;

  const showInitialEntriesLoad = Boolean(bookId && entriesLoading && entries.length === 0);

  const emptyBlockMaxWidth = Math.min(420, Math.max(280, windowWidth - 48));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={headerTitle}
        theme={theme}
        colors={colors}
        rightElement={
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => void handleExportPdf()}
              hitSlop={10}
              disabled={pdfBusy || !book}
              accessibilityRole="button"
              accessibilityLabel="Export PDF"
            >
              {pdfBusy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              )}
            </Pressable>
            <Pressable onPress={openOverflowMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel="More options">
              <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        }
      />

      {showInitialEntriesLoad ? (
        <View style={styles.entriesLoadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
      <SectionList
        style={styles.listFlex}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={[
          styles.listContent,
          entries.length === 0 ? styles.listContentEmpty : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadInitial();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.netLabel}>Net Balance</Text>
              <Text style={styles.netAmount} numberOfLines={1}>
                {formatMoney(netAnim, currency)}
              </Text>
              <View style={styles.balanceDivider} />
              <View style={styles.inOutRow}>
                <View style={styles.inOutCol}>
                  <Ionicons name="arrow-up" size={14} color={colors.success} />
                  <Text style={styles.inOutHeading}>Total In</Text>
                  <Text style={[styles.inAmt, { color: colors.success }]}>
                    {formatMoney(summary?.total_in ?? 0, currency)}
                  </Text>
                </View>
                <View style={styles.inOutCol}>
                  <Ionicons name="arrow-down" size={14} color={colors.danger} />
                  <Text style={styles.inOutHeading}>Total Out</Text>
                  <Text style={[styles.outAmt, { color: colors.danger }]}>
                    {formatMoney(summary?.total_out ?? 0, currency)}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => router.push('/reports')} style={styles.viewReports}>
                <Text style={styles.viewReportsText}>View Reports →</Text>
              </Pressable>
            </View>
            {privacyOnlyYou ? (
              <View style={styles.privacyRow}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
                  Only you can see these entries
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View
            style={[
              styles.sectionHeader,
              {
                backgroundColor: colors.surfaceSecondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/home/[bookId]/edit-entry', params: { bookId, entryId: item.id } })
            }
            style={[styles.entryRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
          >
            <View
              style={[
                styles.typeBar,
                { backgroundColor: item.type === 'CASH_IN' ? colors.success : colors.danger },
              ]}
            />
            <View style={styles.entryCenter}>
              <Text style={[styles.contactName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.contact_name?.trim() ? item.contact_name : 'No contact'}
              </Text>
              <View style={styles.metaRow}>
                {item.category_name ? (
                  <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                      {item.category_name}
                    </Text>
                  </View>
                ) : null}
                {item.payment_mode_name ? (
                  <Text style={[styles.payMode, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.payment_mode_name}
                  </Text>
                ) : null}
              </View>
              {item.remark ? (
                <Text style={[styles.remark, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.remark}
                </Text>
              ) : null}
            </View>
            <View style={styles.entryRight}>
              <Text
                style={[
                  styles.entryAmount,
                  { color: item.type === 'CASH_IN' ? colors.success : colors.danger },
                ]}
              >
                {item.type === 'CASH_IN' ? '+' : '-'}
                {formatMoney(item.amount, currency)}
              </Text>
              <Text style={[styles.entryTime, { color: colors.textTertiary }]}>{entryTimeLabel(item)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View
            style={[styles.emptyWrap, { maxWidth: emptyBlockMaxWidth, alignSelf: 'center' }]}
            accessibilityLabel="No ledger entries yet. Use Cash In or Cash Out below to add one."
          >
            <View style={[styles.emptyIconRing, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="wallet-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No entries yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Record money in and out to see your running balance here. Use the buttons below when you are ready.
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>CASH IN · CASH OUT</Text>
            <Animated.View style={bounceStyle}>
              <Ionicons name="arrow-down-outline" size={28} color={colors.primary} style={{ marginTop: 16 }} />
            </Animated.View>
          </View>
        }
        ListFooterComponent={
          entries.length > 0 && hasMore ? (
            <Pressable
              onPress={() => void loadMore()}
              style={[styles.loadMoreBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Load more</Text>
            </Pressable>
          ) : null
        }
      />
      )}

      <BannerAdPlaceholder />

      <View
        style={[
          styles.cashBarWrap,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <AnimatedCashButton
          backgroundColor={colors.success}
          onPress={() =>
            router.push({ pathname: '/home/[bookId]/add-entry', params: { bookId, type: 'CASH_IN' } })
          }
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.cashBtnText}>CASH IN</Text>
        </AnimatedCashButton>
        <AnimatedCashButton
          backgroundColor={colors.danger}
          onPress={() =>
            router.push({ pathname: '/home/[bookId]/add-entry', params: { bookId, type: 'CASH_OUT' } })
          }
        >
          <Ionicons name="remove-circle-outline" size={22} color="#fff" />
          <Text style={styles.cashBtnText}>CASH OUT</Text>
        </AnimatedCashButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  entriesLoadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listFlex: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listContent: { paddingBottom: 24 },
  listContentEmpty: { flexGrow: 1 },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  netLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  netAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginTop: 4,
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  inOutRow: { flexDirection: 'row', gap: 16 },
  inOutCol: { flex: 1, gap: 4 },
  inOutHeading: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  inAmt: { fontSize: 18, fontWeight: '700' },
  outAmt: { fontSize: 18, fontWeight: '700' },
  viewReports: { marginTop: 16, alignSelf: 'flex-start' },
  viewReportsText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  privacyText: { fontSize: 12, textAlign: 'center' },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '600' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  entryCenter: { flex: 1, gap: 4, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: '70%',
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  payMode: { fontSize: 12, flexShrink: 1 },
  remark: { fontSize: 13, fontStyle: 'italic' as const },
  contactName: { fontSize: 15, fontWeight: '700' },
  entryRight: { alignItems: 'flex-end', justifyContent: 'center' },
  entryAmount: { fontSize: 17, fontWeight: '700' },
  entryTime: { fontSize: 11, marginTop: 4 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    width: '100%',
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
  emptyHint: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginTop: 14 },
  loadMoreBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  cashBarWrap: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cashBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
