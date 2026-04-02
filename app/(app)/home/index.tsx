import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSafeArea } from '@/hooks/useSafeArea';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useBookStore } from '@/store/bookStore';
import { createBook, getBooks, updateBook, deleteBook } from '@/services/bookService';
import { createBusiness, getBusinesses } from '@/services/businessService';
import { getBookAllTimeSummary } from '@/services/entryService';
import type { BookSummaryTotals } from '@/services/entryService';
import { formatMoney } from '@/utils/formatMoney';
import { firebaseAuth } from '@/services/firebase';
import { isFirebasePermissionDenied } from '@/utils/firebaseErrors';
import type { Book, Business } from '@/utils/models';
import { useColors } from '@/hooks/useColors';
import { useBreakpoint } from '@/hooks/useBreakpoint';

function lastEntryLabel(book: Book): string {
  const le = book.last_entry_date;
  if (!le) return 'No entries yet';
  const d =
    le && typeof le === 'object' && 'toDate' in le && typeof (le as { toDate?: () => Date }).toDate === 'function'
      ? (le as { toDate: () => Date }).toDate()
      : null;
  if (!d) return 'No entries yet';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Last entry: today';
  if (days === 1) return 'Last entry: 1 day ago';
  return `Last entry: ${days} days ago`;
}

function netColor(net: number, colors: ReturnType<typeof useColors>): string {
  if (net > 0) return colors.success;
  if (net < 0) return colors.danger;
  return colors.textSecondary;
}

function BookCard({
  book,
  summary,
  currency,
  colors,
  onOpen,
  onMenu,
  isTablet,
}: {
  book: Book;
  summary: BookSummaryTotals | undefined;
  currency: string;
  colors: ReturnType<typeof useColors>;
  onOpen: () => void;
  onMenu: () => void;
  isTablet: boolean;
}) {
  const net = summary?.net_balance ?? 0;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          marginHorizontal: isTablet ? 0 : 16,
          opacity: pressed ? 0.92 : 1,
        },
        Platform.OS === 'android' ? { elevation: 2 } : styles.cardShadowIos,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.bookIconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="book" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.bookName, { color: colors.textPrimary }]} numberOfLines={2}>
          {book.name}
        </Text>
        <Pressable onPress={onMenu} hitSlop={12} accessibilityRole="button" accessibilityLabel="Book menu">
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
      <View style={styles.balanceCols}>
        <View style={styles.balCol}>
          <Text style={[styles.balLabel, { color: colors.textSecondary }]}>Net Balance</Text>
          <Text style={[styles.balNet, { color: netColor(net, colors) }]}>{formatMoney(net, currency)}</Text>
        </View>
        <View style={styles.balCol}>
          <Text style={[styles.balLabel, { color: colors.textSecondary }]}>Total In</Text>
          <Text style={[styles.balValIn, { color: colors.success }]}>
            {formatMoney(summary?.total_in ?? 0, currency)}
          </Text>
        </View>
        <View style={styles.balCol}>
          <Text style={[styles.balLabel, { color: colors.textSecondary }]}>Total Out</Text>
          <Text style={[styles.balValOut, { color: colors.danger }]}>
            {formatMoney(summary?.total_out ?? 0, currency)}
          </Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.lastRow}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.lastText, { color: colors.textTertiary }]}>{lastEntryLabel(book)}</Text>
        </View>
        <Text style={[styles.openLink, { color: colors.primary }]}>Open →</Text>
      </View>
    </Pressable>
  );
}

function Fab({ onPress, bottom, colors }: { onPress: () => void; bottom: number; colors: ReturnType<typeof useColors> }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.92);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={[styles.fab, { bottom, backgroundColor: colors.primary }]}
    >
      <Animated.View style={[anim, styles.fabInner]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { scrollBottomPad } = useSafeArea();
  const { isTablet } = useBreakpoint();

  const emptyBlockMaxWidth = Math.min(400, Math.max(280, windowWidth - 48));

  const user = useAuthStore((s) => s.user);
  const userUid = user?.uid;
  const userName = user?.name;
  const currency = user?.currency ?? 'USD';

  const { businesses, currentBusiness, setBusinesses, setCurrentBusiness } = useBusinessStore();
  const { books, setBooks, setCurrentBook, updateBook: patchBookInStore, removeBook: removeBookInStore } =
    useBookStore();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [bizPickerOpen, setBizPickerOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Book | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [summaries, setSummaries] = useState<Record<string, BookSummaryTotals>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userUid) return;
      await firebaseAuth.authStateReady();

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

    void (async () => {
      try {
        await load();
      } catch (e) {
        if (__DEV__ && isFirebasePermissionDenied(e)) {
          console.warn(
            '[home] Firestore permission denied — deploy firestore.rules: firebase deploy --only firestore:rules',
          );
        }
      }
    })();
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
      try {
        const pairs = await Promise.all(
          books.map(async (b) => {
            const s = await getBookAllTimeSummary(b.id);
            return [b.id, s] as const;
          }),
        );
        if (cancelled) return;
        setSummaries(Object.fromEntries(pairs));
      } catch (e) {
        if (__DEV__ && isFirebasePermissionDenied(e)) {
          console.warn('[home] summaries: permission denied (check Firestore rules deployment)');
        }
      }
    }
    void loadSummaries();
    return () => {
      cancelled = true;
    };
  }, [books]);

  function openBookMenu(book: Book) {
    Alert.alert(book.name, undefined, [
      {
        text: 'Rename',
        onPress: () => {
          setRenameTarget(book);
          setRenameValue(book.name);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete book?', `Remove “${book.name}”? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                if (!currentBusiness) return;
                await deleteBook(book.id);
                removeBookInStore(book.id);
                const updated = await getBooks(currentBusiness.id);
                setBooks(updated);
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function switchBusiness(b: Business) {
    setCurrentBusiness(b);
    setBizPickerOpen(false);
    void (async () => {
      const listBooks = await getBooks(b.id);
      setBooks(listBooks);
      setCurrentBook(listBooks[0] ?? null);
    })();
  }

  const fabBottom = 80 + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable style={styles.bizTap} onPress={() => setBizPickerOpen(true)}>
          <Text style={[styles.bizTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {currentBusiness?.name ?? t('common.loading')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.topIcons}>
          <Pressable onPress={() => setShowSearch((s) => !s)} hitSlop={10} accessibilityLabel="Search">
            <Ionicons name="search" size={24} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings/team')} hitSlop={10} accessibilityLabel="Team">
            <Ionicons name="person-add-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {showSearch ? (
        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.searchInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
            ]}
          />
        </View>
      ) : null}

      {filteredBooks.length === 0 && books.length === 0 ? (
        <View style={styles.emptyOuter}>
          <View style={[styles.emptyInner, { maxWidth: emptyBlockMaxWidth }]}>
            <View style={[styles.emptyIconRing, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="library-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No books yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Books hold your cash-in and cash-out ledgers. Create one to get started — you can add more later.
            </Text>
            <Pressable
              onPress={() => setIsAddOpen(true)}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Create your first book"
            >
              <Text style={styles.createBtnText}>Create Book</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'two' : 'one'}
          data={filteredBooks}
          numColumns={isTablet ? 2 : 1}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
          contentContainerStyle={[styles.listPad, { paddingBottom: 120 + scrollBottomPad }]}
          ListEmptyComponent={
            <View style={styles.searchEmpty}>
              <Text style={[styles.noMatch, { color: colors.textSecondary }]}>No books match your search.</Text>
              <Text style={[styles.noMatchHint, { color: colors.textTertiary }]}>Try another name or clear search.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={isTablet ? styles.cellTwo : styles.cellOne}>
              <BookCard
                book={item}
                summary={summaries[item.id]}
                currency={currency}
                colors={colors}
                isTablet={isTablet}
                onOpen={() => {
                  setCurrentBook(item);
                  router.push({ pathname: '/home/[bookId]', params: { bookId: item.id } });
                }}
                onMenu={() => openBookMenu(item)}
              />
            </View>
          )}
        />
      )}

      {books.length > 0 ? (
        <Fab bottom={fabBottom} colors={colors} onPress={() => setIsAddOpen(true)} />
      ) : null}

      <Modal visible={bizPickerOpen} transparent animationType="fade" onRequestClose={() => setBizPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBizPickerOpen(false)}>
          <Pressable style={[styles.bizSheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Switch business</Text>
            {businesses.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => switchBusiness(b)}
                style={styles.bizRow}
              >
                <Text style={[styles.bizRowText, { color: colors.textPrimary }]}>{b.name}</Text>
                {currentBusiness?.id === b.id ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isAddOpen} transparent animationType="slide" onRequestClose={() => setIsAddOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <Pressable style={styles.sheetDim} onPress={() => setIsAddOpen(false)} />
          <View style={[styles.sheetPanel, { backgroundColor: colors.surface }]}>
            <View style={styles.dragHandle} />
            <Text style={[styles.newBookTitle, { color: colors.textPrimary }]}>New Book</Text>
            <TextInput
              value={newBookName}
              onChangeText={setNewBookName}
              placeholder="Book name e.g. Business Book"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.sheetField,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
            />
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
              style={[styles.addBookBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addBookBtnText}>Add Book</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDim} onPress={() => setRenameTarget(null)} />
          <View style={[styles.sheetPanel, { backgroundColor: colors.surface }]}>
            <Text style={[styles.newBookTitle, { color: colors.textPrimary }]}>Rename book</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Book name"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.sheetField,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
            />
            <Pressable
              onPress={async () => {
                if (!renameTarget || !currentBusiness) return;
                const name = renameValue.trim();
                if (!name) return;
                await updateBook(renameTarget.id, { name });
                patchBookInStore(renameTarget.id, { name });
                const updatedBooks = await getBooks(currentBusiness.id);
                setBooks(updatedBooks);
                setRenameTarget(null);
              }}
              style={[styles.addBookBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addBookBtnText}>Save</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bizTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  bizTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  listPad: { paddingBottom: 120, paddingTop: 4 },
  columnWrap: { gap: 12, paddingHorizontal: 16 },
  cellOne: { flex: 1 },
  cellTwo: { flex: 1, minWidth: 0 },
  searchEmpty: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center' },
  noMatch: { textAlign: 'center', fontSize: 16, fontWeight: '600' },
  noMatchHint: { textAlign: 'center', marginTop: 8, fontSize: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardShadowIos: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookName: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  balanceCols: { flexDirection: 'row', gap: 8 },
  balCol: { flex: 1, minWidth: 0 },
  balLabel: { fontSize: 11, marginBottom: 4 },
  balNet: { fontSize: 18, fontWeight: '700' },
  balValIn: { fontSize: 15, fontWeight: '700' },
  balValOut: { fontSize: 15, fontWeight: '700' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  lastText: { fontSize: 12, flex: 1 },
  openLink: { fontSize: 13, fontWeight: '600' },
  emptyOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyInner: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 24 },
  createBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabInner: { alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  bizSheet: { borderRadius: 16, padding: 16, gap: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  bizRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  bizRowText: { fontSize: 16, flex: 1 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetPanel: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  newBookTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sheetField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  addBookBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBookBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
