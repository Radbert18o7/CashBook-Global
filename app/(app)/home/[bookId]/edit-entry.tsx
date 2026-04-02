import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useColors } from '@/hooks/useColors';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useAuthStore } from '@/store/authStore';
import { useEntryStore } from '@/store/entryStore';
import { getEntry, updateEntry } from '@/services/entryService';
import type { Entry, EntryType } from '@/utils/models';

function entryDateLabel(entry: Entry | undefined): string | null {
  if (!entry) return null;
  const raw = entry.entry_date;
  let d: Date;
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    d = (raw as { toDate: () => Date }).toDate();
  } else {
    d = new Date();
  }
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EditEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const theme = useSettingsTheme();
  const params = useLocalSearchParams<{ bookId: string; entryId: string }>();
  const rawBookId = params.bookId;
  const bookId = rawBookId === 'index' ? undefined : rawBookId;
  const entryId = params.entryId;

  useEffect(() => {
    if (rawBookId === 'index') {
      router.replace('/home');
    }
  }, [rawBookId, router]);

  const user = useAuthStore((s) => s.user);
  const entries = useEntryStore((s) => s.entries);
  const addEntryToStore = useEntryStore((s) => s.addEntry);
  const updateEntryInStore = useEntryStore((s) => s.updateEntry);
  const entry = useMemo(() => entries.find((e) => e.id === entryId), [entries, entryId]);

  const [amountText, setAmountText] = useState('');
  const [contactName, setContactName] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'missing' | 'error'>('idle');
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!bookId || !entryId) return;
    if (entry) {
      setLoadState('idle');
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    void getEntry(bookId, entryId)
      .then((e) => {
        if (cancelled) return;
        if (!e) {
          setLoadState('missing');
          return;
        }
        addEntryToStore(e);
        setLoadState('idle');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [bookId, entryId, entry, addEntryToStore]);

  useEffect(() => {
    if (!entry) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    setAmountText(String(entry.amount));
    setContactName(entry.contact_name ?? '');
    setRemark(entry.remark ?? '');
  }, [entry]);

  const type: EntryType = entry?.type === 'CASH_OUT' ? 'CASH_OUT' : 'CASH_IN';

  const title = useMemo(
    () => (type === 'CASH_IN' ? 'Edit Cash In Entry' : 'Edit Cash Out Entry'),
    [type],
  );

  const dateLine = useMemo(() => entryDateLabel(entry), [entry]);

  async function handleSave() {
    if (!entry || !bookId || !user) {
      setError('Entry not found in local state. Go back to the book and try again.');
      return;
    }
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const contact_name = contactName.trim() || null;
      const remarkVal = remark.trim() || null;
      await updateEntry(
        bookId,
        entryId,
        {
          amount,
          contact_name,
          remark: remarkVal,
        },
        user.uid,
      );
      updateEntryInStore(entryId, {
        amount,
        contact_name,
        remark: remarkVal,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  }

  const footerPad = 16 + insets.bottom;
  const scrollBottomPad = 88 + insets.bottom;

  if (!bookId || !entryId) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Edit entry" theme={theme} colors={colors} />
        <View style={styles.missingWrap}>
          <ThemedText style={{ color: colors.textSecondary }}>Missing book or entry.</ThemedText>
        </View>
      </View>
    );
  }

  if (loadState === 'loading' || (loadState === 'idle' && !entry)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Edit entry" theme={theme} colors={colors} />
        <View style={styles.missingWrap}>
          <ActivityIndicator color={colors.primary} />
          <ThemedText style={[styles.missingSub, { color: colors.textSecondary }]}>Loading entry…</ThemedText>
        </View>
      </View>
    );
  }

  if (loadState === 'missing' || loadState === 'error' || !entry) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Edit entry" theme={theme} colors={colors} />
        <View style={styles.missingWrap}>
          <ThemedText style={[styles.missingTitle, { color: colors.textPrimary }]}>
            {loadState === 'error' ? 'Could not load entry' : 'Entry not found'}
          </ThemedText>
          <ThemedText style={[styles.missingSub, { color: colors.textSecondary }]}>
            {loadState === 'error'
              ? 'Check your connection and try again from the book.'
              : 'This entry may have been removed. Go back to the book and refresh the list.'}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title={title} theme={theme} colors={colors} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        >
          <View
            style={[
              styles.typePill,
              {
                alignSelf: 'flex-start',
                backgroundColor: type === 'CASH_IN' ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.14)',
                borderColor: type === 'CASH_IN' ? colors.success : colors.danger,
              },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: type === 'CASH_IN' ? colors.success : colors.danger }}>
              {type === 'CASH_IN' ? 'Cash In' : 'Cash Out'}
            </ThemedText>
          </View>

          <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Transaction</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {!!dateLine && (
              <>
                <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date and time</ThemedText>
                <ThemedText style={[styles.helper, { color: colors.textTertiary, marginBottom: 10 }]}>
                  When this entry was logged (read-only for now).
                </ThemedText>
                <ThemedText style={[styles.dateReadonly, { color: colors.textSecondary }]}>{dateLine}</ThemedText>
              </>
            )}
            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Amount
            </ThemedText>
            <ThemedText style={[styles.helper, { color: colors.textTertiary }]}>
              Required · use a positive number (decimals allowed).
            </ThemedText>
            <ThemedTextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              accessibilityLabel="Amount"
              style={styles.input}
            />
          </View>

          <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Details</ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>Contact</ThemedText>
            <ThemedText style={[styles.helper, { color: colors.textTertiary }]}>Optional</ThemedText>
            <ThemedTextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Name or reference"
              accessibilityLabel="Contact name"
              style={styles.input}
            />

            <ThemedText style={[styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textPrimary }]}>
              Remark
            </ThemedText>
            <ThemedText style={[styles.helper, { color: colors.textTertiary }]}>Optional</ThemedText>
            <ThemedTextInput
              value={remark}
              onChangeText={setRemark}
              placeholder="Note for this entry"
              style={[styles.input, { minHeight: 84 }]}
              multiline
              accessibilityLabel="Remark"
            />
          </View>

          {!!error && (
            <ThemedText style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
              {error}
            </ThemedText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.stickyFooter, { paddingBottom: footerPad }]}>
        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving entry' : 'Save changes'}
        >
          <ThemedText type="defaultSemiBold" style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  typePill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  fieldLabelSpaced: { marginTop: 14 },
  helper: { fontSize: 12, marginBottom: 6 },
  dateReadonly: { fontSize: 15, fontWeight: '500' },
  input: {
    borderRadius: 8,
  },
  error: { marginTop: 8, textAlign: 'center' },
  stickyFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.7 },
  missingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  missingTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  missingSub: { textAlign: 'center', maxWidth: 320 },
});
