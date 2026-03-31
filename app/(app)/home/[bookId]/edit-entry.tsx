import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { useEntryStore } from '@/store/entryStore';
import { updateEntry } from '@/services/entryService';
import type { EntryType } from '@/utils/models';

export default function EditEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string; entryId: string }>();
  const bookId = params.bookId;
  const entryId = params.entryId;

  const user = useAuthStore((s) => s.user);
  const { entries, updateEntry: updateEntryInStore } = useEntryStore();
  const entry = useMemo(() => entries.find((e) => e.id === entryId), [entries, entryId]);

  const [amountText, setAmountText] = useState(entry ? String(entry.amount) : '');
  const [contactName, setContactName] = useState(entry?.contact_name ?? '');
  const [remark, setRemark] = useState(entry?.remark ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type: EntryType = entry?.type === 'CASH_OUT' ? 'CASH_OUT' : 'CASH_IN';

  async function handleSave() {
    if (!entry || !bookId || !user) {
      setError('Entry not found in local state. Go back and try again.');
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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={[styles.title, type === 'CASH_IN' ? styles.cashIn : styles.cashOut]}>
        {'Edit Entry'}
      </ThemedText>

      <ThemedText style={styles.label}>Amount</ThemedText>
      <TextInput value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" style={styles.input} />

      <ThemedText style={styles.label}>Contact</ThemedText>
      <TextInput value={contactName} onChangeText={setContactName} placeholder="Optional" style={styles.input} />

      <ThemedText style={styles.label}>Remark</ThemedText>
      <TextInput
        value={remark}
        onChangeText={setRemark}
        placeholder="Optional"
        style={[styles.input, { minHeight: 84 }]}
        multiline
      />

      {!!error && (
        <ThemedText style={styles.error} lightColor="#F43F5E" darkColor="#F43F5E">
          {error}
        </ThemedText>
      )}

      <View style={styles.stickyFooter}>
        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed, saving && styles.disabled]}
        >
          <ThemedText type="defaultSemiBold">{saving ? 'Saving...' : 'Save'}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { textAlign: 'left', marginTop: 10 },
  cashIn: { color: '#10B981' },
  cashOut: { color: '#F43F5E' },
  label: { opacity: 0.85, marginTop: 6 },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  error: { marginTop: 6, textAlign: 'center' },
  stickyFooter: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.7 },
});

