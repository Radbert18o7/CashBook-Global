import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import DraggableFlatList, { type RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { appendBookAuditLog, formatAuditDescription, getBookAuditLogsPage } from '@/services/bookAuditService';
import {
  getBook,
  getBookSettings,
  mergeBookFieldSettings,
  updateBook,
  updateBookSettings,
} from '@/services/bookService';
import type { Category } from '@/services/categoryService';
import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  updateCategory,
} from '@/services/categoryService';
import type { CustomField, CustomFieldType } from '@/services/customFieldService';
import {
  createCustomField,
  deleteCustomField,
  getCustomFields,
  updateCustomField,
} from '@/services/customFieldService';
import { getBookAllTimeSummary } from '@/services/entryService';
import { firebaseFunctions } from '@/services/firebase';
import {
  addBookMember,
  getBookMembers,
  removeBookMember,
  updateBookMemberRole,
} from '@/services/memberService';
import type { PaymentMode } from '@/services/paymentModeService';
import {
  createPaymentMode,
  deletePaymentMode,
  getPaymentModes,
  reorderPaymentModes,
  updatePaymentMode,
} from '@/services/paymentModeService';
import { getUserDisplay } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useBookStore } from '@/store/bookStore';
import type { BookMemberRole } from '@/utils/models';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

const CATEGORY_SUGGESTIONS = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Salary',
  'Sales',
  'Rent',
  'Utilities',
  'Other',
];
const PAYMENT_SUGGESTIONS = [
  'Cash',
  'Online',
  'Bank Transfer',
  'Debit Card',
  'Credit Card',
  'Cheque',
  'UPI',
  'PayPal',
];

type SubView = 'main' | 'contact' | 'categories' | 'paymentModes' | 'customFields';

function sortCats(cats: Category[]) {
  return [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function sortPm(modes: PaymentMode[]) {
  return [...modes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

export default function BookSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string }>();
  const rawBookId = params.bookId;
  const bookId = rawBookId === 'index' ? undefined : rawBookId;
  const user = useAuthStore((s) => s.user);
  const removeBookFromStore = useBookStore((s) => s.removeBook);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [bookName, setBookName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [settingsRaw, setSettingsRaw] = useState<Record<string, unknown>>({});
  const [subView, setSubView] = useState<SubView>('main');

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [catModal, setCatModal] = useState<{ mode: 'add' | 'edit'; id?: string; name: string } | null>(null);
  const [pmModal, setPmModal] = useState<{ mode: 'add' | 'edit'; id?: string; name: string } | null>(null);

  const [cfSheet, setCfSheet] = useState(false);
  const [cfName, setCfName] = useState('');
  const [cfType, setCfType] = useState<CustomFieldType>('TEXT');
  const [cfRequired, setCfRequired] = useState(false);
  const [cfOptions, setCfOptions] = useState<string[]>(['']);

  const [activity, setActivity] = useState<{ id: string; line: string }[]>([]);
  const [actCursor, setActCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [actLoading, setActLoading] = useState(false);

  const [members, setMembers] = useState<
    { userId: string; role: BookMemberRole; name: string; email: string }[]
  >([]);
  const [memberSheet, setMemberSheet] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [contactLabelDraft, setContactLabelDraft] = useState('');

  const fieldCfg = useMemo(() => mergeBookFieldSettings(settingsRaw), [settingsRaw]);

  useEffect(() => {
    if (rawBookId === 'index') {
      router.replace('/home');
    }
  }, [rawBookId, router]);

  const loadAll = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const b = await getBook(bookId);
      setBookName(b?.name ?? '');
      const s = await getBookSettings(bookId);
      setSettingsRaw(s);
      const [c, p, f, m] = await Promise.all([
        getCategories(bookId),
        getPaymentModes(bookId),
        getCustomFields(bookId),
        getBookMembers(bookId),
      ]);
      setCategories(sortCats(c));
      setPaymentModes(sortPm(p));
      setCustomFields(f);
      const enriched = [];
      for (const mem of m) {
        const uid = mem.user_id ?? mem.id;
        const d = await getUserDisplay(uid);
        enriched.push({ userId: uid, role: mem.role, name: d.name, email: d.email });
      }
      setMembers(enriched);
      setActivity([]);
      setActCursor(null);
      const page = await getBookAuditLogsPage(bookId, 15, null);
      const lines = await Promise.all(page.logs.map(async (log) => ({ id: log.id, line: await formatAuditDescription(log) })));
      setActivity(lines);
      setActCursor(page.logs.length < 15 ? null : page.lastDoc);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function loadMoreActivity() {
    if (!bookId || !actCursor || actLoading) return;
    setActLoading(true);
    try {
      const page = await getBookAuditLogsPage(bookId, 15, actCursor);
      const lines = await Promise.all(page.logs.map(async (log) => ({ id: log.id, line: await formatAuditDescription(log) })));
      setActivity((prev) => [...prev, ...lines]);
      setActCursor(page.logs.length < 15 ? null : page.lastDoc);
    } finally {
      setActLoading(false);
    }
  }

  async function saveRename() {
    if (!bookId || !renameDraft.trim() || !user) return;
    const prev = bookName;
    await updateBook(bookId, { name: renameDraft.trim() });
    setBookName(renameDraft.trim());
    useBookStore.getState().updateBook(bookId, { name: renameDraft.trim() });
    await appendBookAuditLog(bookId, user.uid, 'BOOK_RENAMED', { book_name: renameDraft.trim() });
    setRenameOpen(false);
    if (prev !== renameDraft.trim()) void loadAll();
  }

  async function persistFieldSettings(next: typeof fieldCfg) {
    if (!bookId) return;
    const merged = {
      ...settingsRaw,
      fields: {
        contact: { enabled: next.contact.enabled, label: next.contact.label },
        category: { enabled: next.category.enabled },
        paymentMode: { enabled: next.paymentMode.enabled },
      },
    };
    await updateBookSettings(bookId, merged);
    setSettingsRaw(merged);
  }

  async function saveContactLabel(label: string) {
    await persistFieldSettings({
      ...fieldCfg,
      contact: { ...fieldCfg.contact, label: label.trim() || 'Contact' },
    });
    setSubView('main');
  }

  function initials(n: string) {
    const p = n.trim().split(/\s+/).slice(0, 2);
    return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
  }

  async function onAddMember() {
    if (!bookId || !memberEmail.trim() || !user) return;
    try {
      const uid = await addBookMember(bookId, memberEmail.trim(), memberRole);
      const d = await getUserDisplay(uid);
      await appendBookAuditLog(bookId, user.uid, 'MEMBER_ADDED', {
        member_name: d.name,
        member_email: d.email,
        role: memberRole,
      });
      setMemberSheet(false);
      setMemberEmail('');
      void loadAll();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    }
  }

  function onLongMember(row: (typeof members)[0]) {
    if (!bookId || row.userId === user?.uid) return;
    const opts = [t('team.changeRole'), t('team.removeMember'), t('common.cancel')];
    const run = async (i: number) => {
      if (i === 2) return;
      if (!user) return;
      if (i === 0) {
        if (row.role === 'PRIMARY_ADMIN') {
          Alert.alert(t('common.error'), t('errors.permissionDenied'));
          return;
        }
        const next: BookMemberRole = row.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
        await updateBookMemberRole(bookId, row.userId, next);
        await appendBookAuditLog(bookId, user.uid, 'MEMBER_ROLE_CHANGED', {
          member_name: row.name,
          role: next,
        });
        void loadAll();
      } else if (i === 1) {
        await removeBookMember(bookId, row.userId);
        await appendBookAuditLog(bookId, user.uid, 'MEMBER_REMOVED', {
          member_name: row.name,
          member_email: row.email,
        });
        void loadAll();
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        (idx) => void run(idx),
      );
    } else {
      Alert.alert(t('book.members'), undefined, [
        { text: opts[0], onPress: () => void run(0) },
        { text: opts[1], style: 'destructive', onPress: () => void run(1) },
        { text: opts[2], style: 'cancel' },
      ]);
    }
  }

  function confirmDeleteBook() {
    if (!bookId || !bookName) return;
    Alert.alert(t('bookSettings.deleteConfirm', { name: bookName }), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const totals = await getBookAllTimeSummary(bookId);
            Alert.alert(
              t('bookSettings.deleteConfirm', { name: bookName }),
              t('bookSettings.deleteEntriesWarning', { count: totals.entry_count }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const fn = httpsCallable(firebaseFunctions, 'deleteBookCascade');
                      await fn({ bookId });
                      removeBookFromStore(bookId);
                      router.replace('/home');
                    } catch (e: unknown) {
                      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
                    }
                  },
                },
              ],
            );
          })();
        },
      },
    ]);
  }

  async function onDragEndCategories(data: Category[]) {
    setCategories(data);
    if (!bookId || !user) return;
    await reorderCategories(
      bookId,
      data.map((x) => x.id),
    );
    await appendBookAuditLog(bookId, user.uid, 'CATEGORY_REORDERED', {});
  }

  async function onDragEndPm(data: PaymentMode[]) {
    setPaymentModes(data);
    if (!bookId || !user) return;
    await reorderPaymentModes(
      bookId,
      data.map((x) => x.id),
    );
    await appendBookAuditLog(bookId, user.uid, 'PAYMENT_MODE_REORDERED', {});
  }

  if (!bookId) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>—</ThemedText>
      </ThemedView>
    );
  }

  if (subView === 'contact') {
    return (
      <ThemedView style={styles.container}>
        <Pressable style={styles.backRow} onPress={() => setSubView('main')}>
          <MaterialIcons name="arrow-back" size={22} color="#4F46E5" />
          <ThemedText type="defaultSemiBold">{t('common.back')}</ThemedText>
        </Pressable>
        <ThemedText type="title">{t('bookSettings.contact')}</ThemedText>
        <ThemedText style={styles.muted}>{t('entry.contact')}</ThemedText>
        <ThemedTextInput
          value={contactLabelDraft}
          onChangeText={setContactLabelDraft}
          style={styles.input}
        />
        <Pressable style={styles.primaryBtn} onPress={() => void saveContactLabel(contactLabelDraft)}>
          <ThemedText style={styles.primaryBtnText}>{t('common.save')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (subView === 'categories') {
    return (
      <ThemedView style={styles.flex}>
        <Pressable style={styles.backRow} onPress={() => setSubView('main')}>
          <MaterialIcons name="arrow-back" size={22} color="#4F46E5" />
          <ThemedText type="defaultSemiBold">{t('common.back')}</ThemedText>
        </Pressable>
        <ThemedText type="title">{t('bookSettings.category')}</ThemedText>
        <ThemedText style={styles.muted}>{t('bookSettings.addCategory')}</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {CATEGORY_SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => setCatModal({ mode: 'add', name: s })}>
              <ThemedText style={styles.chipText}>{s}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <DraggableFlatList
          data={categories}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => void onDragEndCategories(data)}
          containerStyle={{ flex: 1 }}
          renderItem={({ item, drag, isActive }: RenderItemParams<Category>) => (
            <ScaleDecorator>
              <Pressable
                onLongPress={drag}
                disabled={isActive}
                style={[styles.rowCard, isActive && { opacity: 0.9 }]}
              >
                <MaterialIcons name="drag-handle" size={22} color="#64748B" />
                <ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>
                <Pressable
                  onPress={() => setCatModal({ mode: 'edit', id: item.id, name: item.name })}
                  hitSlop={8}
                >
                  <MaterialIcons name="edit" size={20} color="#4F46E5" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert(t('common.confirm'), item.name, [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: async () => {
                          if (!bookId) return;
                          await deleteCategory(bookId, item.id);
                          setCategories((c) => sortCats(c.filter((x) => x.id !== item.id)));
                        },
                      },
                    ]);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#DC2626" />
                </Pressable>
              </Pressable>
            </ScaleDecorator>
          )}
        />
        <Pressable style={styles.primaryBtn} onPress={() => setCatModal({ mode: 'add', name: '' })}>
          <ThemedText style={styles.primaryBtnText}>{t('bookSettings.addCategory')}</ThemedText>
        </Pressable>
        <Modal visible={!!catModal} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setCatModal(null)}>
            <Pressable
              style={[styles.modalInner, { backgroundColor: palette.background }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText type="subtitle">{t('bookSettings.addCategory')}</ThemedText>
              <ThemedTextInput
                value={catModal?.name ?? ''}
                onChangeText={(x) => setCatModal((m) => (m ? { ...m, name: x } : m))}
                style={styles.input}
              />
              <Pressable
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!bookId || !catModal?.name.trim()) return;
                  if (catModal.mode === 'edit' && catModal.id) {
                    await updateCategory(bookId, catModal.id, { name: catModal.name.trim() });
                  } else {
                    await createCategory(bookId, catModal.name.trim());
                  }
                  setCatModal(null);
                  const c = await getCategories(bookId);
                  setCategories(sortCats(c));
                }}
              >
                <ThemedText style={styles.primaryBtnText}>{t('common.save')}</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  if (subView === 'paymentModes') {
    return (
      <ThemedView style={styles.flex}>
        <Pressable style={styles.backRow} onPress={() => setSubView('main')}>
          <MaterialIcons name="arrow-back" size={22} color="#4F46E5" />
          <ThemedText type="defaultSemiBold">{t('common.back')}</ThemedText>
        </Pressable>
        <ThemedText type="title">{t('bookSettings.paymentMode')}</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {PAYMENT_SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => setPmModal({ mode: 'add', name: s })}>
              <ThemedText style={styles.chipText}>{s}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        <DraggableFlatList
          data={paymentModes}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => void onDragEndPm(data)}
          containerStyle={{ flex: 1 }}
          renderItem={({ item, drag, isActive }: RenderItemParams<PaymentMode>) => (
            <ScaleDecorator>
              <Pressable onLongPress={drag} disabled={isActive} style={[styles.rowCard, isActive && { opacity: 0.9 }]}>
                <MaterialIcons name="drag-handle" size={22} color="#64748B" />
                <ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>
                <Pressable onPress={() => setPmModal({ mode: 'edit', id: item.id, name: item.name })} hitSlop={8}>
                  <MaterialIcons name="edit" size={20} color="#4F46E5" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert(t('common.confirm'), item.name, [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: async () => {
                          if (!bookId) return;
                          await deletePaymentMode(bookId, item.id);
                          setPaymentModes((p) => sortPm(p.filter((x) => x.id !== item.id)));
                        },
                      },
                    ]);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#DC2626" />
                </Pressable>
              </Pressable>
            </ScaleDecorator>
          )}
        />
        <Pressable style={styles.primaryBtn} onPress={() => setPmModal({ mode: 'add', name: '' })}>
          <ThemedText style={styles.primaryBtnText}>{t('bookSettings.addPaymentMode')}</ThemedText>
        </Pressable>
        <Modal visible={!!pmModal} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setPmModal(null)}>
            <Pressable
              style={[styles.modalInner, { backgroundColor: palette.background }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText type="subtitle">{t('bookSettings.addPaymentMode')}</ThemedText>
              <ThemedTextInput
                value={pmModal?.name ?? ''}
                onChangeText={(x) => setPmModal((m) => (m ? { ...m, name: x } : m))}
                style={styles.input}
              />
              <Pressable
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!bookId || !pmModal?.name.trim()) return;
                  if (pmModal.mode === 'edit' && pmModal.id) {
                    await updatePaymentMode(bookId, pmModal.id, { name: pmModal.name.trim() });
                  } else {
                    await createPaymentMode(bookId, pmModal.name.trim());
                  }
                  setPmModal(null);
                  const p = await getPaymentModes(bookId);
                  setPaymentModes(sortPm(p));
                }}
              >
                <ThemedText style={styles.primaryBtnText}>{t('common.save')}</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  if (subView === 'customFields') {
    const atLimit = customFields.length >= 5;
    return (
      <ThemedView style={styles.container}>
        <Pressable style={styles.backRow} onPress={() => setSubView('main')}>
          <MaterialIcons name="arrow-back" size={22} color="#4F46E5" />
          <ThemedText type="defaultSemiBold">{t('common.back')}</ThemedText>
        </Pressable>
        <ThemedText type="title">{t('bookSettings.customFields')}</ThemedText>
        <FlatList
          data={customFields}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.muted}>
                  {item.type}
                  {item.required ? ` · ${t('bookSettings.required')}` : ''}
                </ThemedText>
              </View>
              <Switch
                value={item.enabled !== false}
                onValueChange={async (v) => {
                  if (!bookId) return;
                  await updateCustomField(bookId, item.id, { enabled: v });
                  setCustomFields((rows) => rows.map((r) => (r.id === item.id ? { ...r, enabled: v } : r)));
                }}
              />
              <Pressable
                onPress={() => {
                  Alert.alert(t('common.confirm'), item.name, [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: async () => {
                        if (!bookId) return;
                        await deleteCustomField(bookId, item.id);
                        setCustomFields((r) => r.filter((x) => x.id !== item.id));
                      },
                    },
                  ]);
                }}
              >
                <MaterialIcons name="delete-outline" size={22} color="#DC2626" />
              </Pressable>
            </View>
          )}
        />
        <Pressable
          style={[styles.primaryBtn, atLimit && { opacity: 0.45 }]}
          disabled={atLimit}
          onPress={() => {
            setCfName('');
            setCfType('TEXT');
            setCfRequired(false);
            setCfOptions(['']);
            setCfSheet(true);
          }}
        >
          <ThemedText style={styles.primaryBtnText}>{t('bookSettings.addCustomField')}</ThemedText>
        </Pressable>

        <Modal visible={cfSheet} transparent animationType="slide" onRequestClose={() => setCfSheet(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCfSheet(false)}>
            <Pressable
              style={[styles.sheet, { backgroundColor: palette.background }]}
              onPress={(e) => e.stopPropagation()}
            >
              <ThemedText type="subtitle">{t('bookSettings.addCustomField')}</ThemedText>
              <ThemedTextInput
                placeholder={t('bookSettings.fieldName')}
                value={cfName}
                onChangeText={setCfName}
                style={styles.input}
              />
              <View style={styles.typeRow}>
                {(['TEXT', 'NUMBER', 'DATE', 'DROPDOWN'] as const).map((tp) => (
                  <Pressable
                    key={tp}
                    style={[styles.typeChip, cfType === tp && styles.typeChipOn]}
                    onPress={() => setCfType(tp)}
                  >
                    <ThemedText style={{ fontSize: 12 }}>
                      {tp === 'TEXT'
                        ? t('bookSettings.typeText')
                        : tp === 'NUMBER'
                          ? t('bookSettings.typeNumber')
                          : tp === 'DATE'
                            ? t('bookSettings.typeDate')
                            : t('bookSettings.typeDropdown')}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              {cfType === 'DROPDOWN' ? (
                <>
                  <ThemedText style={styles.muted}>{t('bookSettings.options')}</ThemedText>
                  {cfOptions.map((op, idx) => (
                    <ThemedTextInput
                      key={idx}
                      value={op}
                      onChangeText={(x) => {
                        const next = [...cfOptions];
                        next[idx] = x;
                        setCfOptions(next);
                      }}
                      style={styles.input}
                    />
                  ))}
                  <Pressable onPress={() => setCfOptions((o) => [...o, ''])}>
                    <ThemedText style={{ color: '#4F46E5' }}>{t('common.add')}</ThemedText>
                  </Pressable>
                </>
              ) : null}
              <View style={styles.rowBetween}>
                <ThemedText>{t('bookSettings.required')}</ThemedText>
                <Switch value={cfRequired} onValueChange={setCfRequired} />
              </View>
              <Pressable
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!bookId || !cfName.trim()) return;
                  const opts =
                    cfType === 'DROPDOWN' ? cfOptions.map((x) => x.trim()).filter(Boolean) : undefined;
                  if (cfType === 'DROPDOWN' && (!opts || opts.length === 0)) {
                    Alert.alert(t('common.error'), t('bookSettings.options'));
                    return;
                  }
                  await createCustomField(bookId, {
                    name: cfName.trim(),
                    type: cfType,
                    required: cfRequired,
                    options: opts,
                  });
                  setCfSheet(false);
                  const f = await getCustomFields(bookId);
                  setCustomFields(f);
                }}
              >
                <ThemedText style={styles.primaryBtnText}>{t('common.add')}</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">{t('bookSettings.title')}</ThemedText>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">{t('bookSettings.rename')}</ThemedText>
              <ThemedText>{bookName}</ThemedText>
              <Pressable style={styles.outlineBtn} onPress={() => { setRenameDraft(bookName); setRenameOpen(true); }}>
                <ThemedText style={{ color: '#4F46E5' }}>{t('bookSettings.rename')}</ThemedText>
              </Pressable>
            </View>

            <ThemedText type="defaultSemiBold" style={styles.h2}>
              {t('bookSettings.entryFields')}
            </ThemedText>

            <View style={styles.rowBetween}>
              <ThemedText>{fieldCfg.contact.label}</ThemedText>
              <Switch
                value={fieldCfg.contact.enabled}
                onValueChange={(v) => void persistFieldSettings({ ...fieldCfg, contact: { ...fieldCfg.contact, enabled: v } })}
              />
            </View>
            <Pressable
              style={styles.linkRow}
              onPress={() => {
                setContactLabelDraft(fieldCfg.contact.label);
                setSubView('contact');
              }}
            >
              <ThemedText style={{ color: '#4F46E5' }}>{t('common.edit')}</ThemedText>
            </Pressable>

            <View style={styles.rowBetween}>
              <ThemedText>{t('bookSettings.category')}</ThemedText>
              <Switch
                value={fieldCfg.category.enabled}
                onValueChange={(v) => void persistFieldSettings({ ...fieldCfg, category: { ...fieldCfg.category, enabled: v } })}
              />
            </View>
            <Pressable style={styles.linkRow} onPress={() => setSubView('categories')}>
              <ThemedText style={{ color: '#4F46E5' }}>{t('common.edit')}</ThemedText>
            </Pressable>

            <View style={styles.rowBetween}>
              <ThemedText>{t('bookSettings.paymentMode')}</ThemedText>
              <Switch
                value={fieldCfg.paymentMode.enabled}
                onValueChange={(v) =>
                  void persistFieldSettings({ ...fieldCfg, paymentMode: { ...fieldCfg.paymentMode, enabled: v } })
                }
              />
            </View>
            <Pressable style={styles.linkRow} onPress={() => setSubView('paymentModes')}>
              <ThemedText style={{ color: '#4F46E5' }}>{t('common.edit')}</ThemedText>
            </Pressable>

            <Pressable style={styles.rowBetween} onPress={() => setSubView('customFields')}>
              <ThemedText>{t('bookSettings.customFieldsCount', { count: customFields.length })}</ThemedText>
              <MaterialIcons name="chevron-right" size={22} color="#64748B" />
            </Pressable>

            <ThemedText type="defaultSemiBold" style={styles.h2}>
              {t('bookSettings.activity')}
            </ThemedText>
            {activity.map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <MaterialIcons name="history" size={18} color="#64748B" />
                <ThemedText style={{ flex: 1 }}>{a.line}</ThemedText>
              </View>
            ))}
            {actCursor ? (
              <Pressable onPress={() => void loadMoreActivity()} style={styles.outlineBtn}>
                <ThemedText style={{ color: '#4F46E5' }}>{t('common.next')}</ThemedText>
              </Pressable>
            ) : null}
            {actLoading ? <ActivityIndicator /> : null}

            <ThemedText type="defaultSemiBold" style={styles.h2}>
              {t('bookSettings.members')}
            </ThemedText>
            {members.map((m) => (
              <Pressable key={m.userId} onLongPress={() => onLongMember(m)} style={styles.memberRow}>
                <View style={styles.avatar}>
                  <ThemedText type="defaultSemiBold">{initials(m.name)}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{m.name}</ThemedText>
                  <ThemedText style={styles.muted}>{m.email}</ThemedText>
                </View>
                <View style={[styles.badge, m.role === 'EMPLOYEE' ? styles.badgeEmp : styles.badgeAdm]}>
                  <ThemedText style={styles.badgeTxt}>
                    {m.role === 'PRIMARY_ADMIN'
                      ? t('book.roles.primaryAdmin')
                      : m.role === 'EMPLOYEE'
                        ? t('book.roles.employee')
                        : t('book.roles.admin')}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
            <Pressable style={styles.primaryBtn} onPress={() => setMemberSheet(true)}>
              <ThemedText style={styles.primaryBtnText}>{t('book.addMember')}</ThemedText>
            </Pressable>

            <ThemedText type="defaultSemiBold" style={[styles.h2, { color: '#B91C1C' }]}>
              {t('bookSettings.danger')}
            </ThemedText>
            <Pressable style={styles.dangerOutline} onPress={() => void confirmDeleteBook()}>
              <ThemedText style={{ color: '#DC2626', fontWeight: '700' }}>{t('bookSettings.deleteBook')}</ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={renameOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setRenameOpen(false)}>
          <Pressable
            style={[styles.modalInner, { backgroundColor: palette.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle">{t('bookSettings.rename')}</ThemedText>
            <ThemedTextInput value={renameDraft} onChangeText={setRenameDraft} style={styles.input} />
            <Pressable style={styles.primaryBtn} onPress={() => void saveRename()}>
              <ThemedText style={styles.primaryBtnText}>{t('common.save')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={memberSheet} transparent animationType="slide" onRequestClose={() => setMemberSheet(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMemberSheet(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: palette.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle">{t('book.addMember')}</ThemedText>
            <ThemedTextInput
              value={memberEmail}
              onChangeText={setMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeChip, memberRole === 'ADMIN' && styles.typeChipOn]}
                onPress={() => setMemberRole('ADMIN')}
              >
                <ThemedText>{t('book.roles.admin')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.typeChip, memberRole === 'EMPLOYEE' && styles.typeChipOn]}
                onPress={() => setMemberRole('EMPLOYEE')}
              >
                <ThemedText>{t('book.roles.employee')}</ThemedText>
              </Pressable>
            </View>
            <Pressable style={styles.primaryBtn} onPress={() => void onAddMember()}>
              <ThemedText style={styles.primaryBtnText}>{t('team.sendInvite')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1, padding: 16 },
  scroll: { padding: 16, paddingBottom: 48, gap: 10 },
  h2: { marginTop: 16 },
  muted: { opacity: 0.75, fontSize: 13 },
  section: { gap: 8, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  linkRow: { alignSelf: 'flex-start', marginBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  outlineBtn: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.15)',
  },
  chips: { marginVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(79,70,229,0.12)',
    marginRight: 8,
  },
  chipText: { fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalInner: {
    borderRadius: 16,
    padding: 16,
  },
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  activityRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79,70,229,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeAdm: { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
  badgeEmp: { backgroundColor: 'rgba(100,116,139,0.25)' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  dangerOutline: {
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
  },
  typeChipOn: { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)' },
});
