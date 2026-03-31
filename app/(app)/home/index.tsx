import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useBookStore } from '@/store/bookStore';
import { createBook, getBooks } from '@/services/bookService';
import { createBusiness, getBusinesses } from '@/services/businessService';
import { getBookAllTimeSummary } from '@/services/entryService';
import type { BookSummaryTotals } from '@/services/entryService';
import { formatMoney } from '@/utils/formatMoney';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const userUid = user?.uid;
  const userName = user?.name;
  const { currentBusiness, setBusinesses, setCurrentBusiness } = useBusinessStore();
  const { books, setBooks, setCurrentBook } = useBookStore();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [summaries, setSummaries] = useState<Record<string, BookSummaryTotals>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userUid) return;

      const list = await getBusinesses(userUid);
      if (cancelled) return;

      if (!list.length) {
        const businessId = await createBusiness({ name: `${userName || 'User'}'s Business` }, userUid);
        const createdBusinesses = await getBusinesses(userUid);
        setBusinesses(createdBusinesses);
        const b = createdBusinesses.find((x) => x.id === businessId) ?? createdBusinesses[0];
        setCurrentBusiness(b ?? null);

        const bookId = await createBook(businessId, 'Business Book', userUid);
        const createdBooks = await getBooks(businessId);
        setBooks(createdBooks);
        setCurrentBook(createdBooks.find((x) => x.id === bookId) ?? null);
        return;
      }

      setBusinesses(list);
      setCurrentBusiness(list[0] ?? null);
      const b = list[0];
      if (!b) return;
      const listBooks = await getBooks(b.id);
      setBooks(listBooks);
      setCurrentBook(listBooks[0] ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userUid, userName, setBusinesses, setCurrentBusiness, setBooks, setCurrentBook]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.name.toLowerCase().includes(q));
  }, [books, search]);

  useEffect(() => {
    let cancelled = false;
    async function loadSummaries() {
      if (!books.length) {
        setSummaries({});
        return;
      }
      const pairs = await Promise.all(
        books.map(async (b) => {
          const s = await getBookAllTimeSummary(b.id);
          return [b.id, s] as const;
        }),
      );
      if (cancelled) return;
      setSummaries(Object.fromEntries(pairs));
    }
    void loadSummaries();
    return () => {
      cancelled = true;
    };
  }, [books]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="subtitle">{currentBusiness?.name ?? t('common.loading')}</ThemedText>
          <ThemedText style={styles.hint}>{currentBusiness ? t('home.tapBook') : ''}</ThemedText>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor="rgba(127,127,127,0.7)"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.grid}>
        {filteredBooks.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="defaultSemiBold">{t('home.noBooks')}</ThemedText>
            <ThemedText style={styles.emptySub}>{t('home.noBooksSubtitle')}</ThemedText>
          </View>
        ) : (
          filteredBooks.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => {
                setCurrentBook(b);
                router.push({ pathname: '/home/[bookId]/index', params: { bookId: b.id } });
              }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {b.name}
              </ThemedText>
              <ThemedText style={styles.cardAmount}>
                {t('home.netBalance')}: {formatMoney(summaries[b.id]?.net_balance ?? 0)}
              </ThemedText>
              <View style={styles.cardRow}>
                <ThemedText style={styles.inText}>
                  {t('home.totalIn')}: {formatMoney(summaries[b.id]?.total_in ?? 0)}
                </ThemedText>
                <ThemedText style={styles.outText}>
                  {t('home.totalOut')}: {formatMoney(summaries[b.id]?.total_out ?? 0)}
                </ThemedText>
              </View>
              <ThemedText style={styles.cardSub}>
                {b.last_entry_date ? t('home.lastEntry') : t('entry.noEntries')}
              </ThemedText>
            </Pressable>
          ))
        )}
      </View>

      <Pressable
        onPress={() => setIsAddOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <ThemedText type="defaultSemiBold">+</ThemedText>
      </Pressable>

      <Modal visible={isAddOpen} animationType="slide" transparent onRequestClose={() => setIsAddOpen(false)}>
        <ThemedView style={styles.sheetBackdrop} lightColor="rgba(0,0,0,0.35)" darkColor="rgba(0,0,0,0.6)">
          <ThemedView style={styles.sheet}>
            <ThemedText type="subtitle">{t('home.addNewBook')}</ThemedText>
            <TextInput
              value={newBookName}
              onChangeText={setNewBookName}
              placeholder={t('home.enterBookName')}
              placeholderTextColor="rgba(127,127,127,0.7)"
              style={styles.sheetInput}
            />
            <View style={styles.sheetButtons}>
              <Pressable
                onPress={() => {
                  setIsAddOpen(false);
                  setNewBookName('');
                }}
                style={[styles.sheetButton, styles.sheetButtonOutline]}
              >
                <ThemedText type="defaultSemiBold">{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!user || !currentBusiness) return;
                  const name = newBookName.trim();
                  if (!name) return;
                  const bookId = await createBook(currentBusiness.id, name, user.uid);
                  const updatedBooks = await getBooks(currentBusiness.id);
                  setBooks(updatedBooks);
                  setCurrentBook(updatedBooks.find((x) => x.id === bookId) ?? null);
                  setIsAddOpen(false);
                  setNewBookName('');
                }}
                style={styles.sheetButton}
              >
                <ThemedText type="defaultSemiBold">{t('common.add')}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { gap: 4 },
  hint: { opacity: 0.7 },
  searchRow: { marginTop: 4 },
  searchInput: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    borderColor: 'rgba(127,127,127,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#11181C',
  },
  grid: { flex: 1, gap: 12, flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.25)',
    backgroundColor: 'transparent',
    gap: 6,
  },
  cardPressed: { opacity: 0.9 },
  cardTitle: { fontSize: 18 },
  cardAmount: { fontSize: 26, fontWeight: '700', marginTop: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inText: { color: '#10B981', fontWeight: '600' },
  outText: { color: '#F43F5E', fontWeight: '600' },
  cardSub: { opacity: 0.7, marginTop: 2 },
  empty: { paddingTop: 40, alignItems: 'center', gap: 8 },
  emptySub: { opacity: 0.7, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  fabPressed: { opacity: 0.9 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  sheet: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sheetInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  sheetButton: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  sheetButtonOutline: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.4)' },
});

