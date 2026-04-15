import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useColors } from '@/hooks/useColors';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useAuthStore } from '@/store/authStore';
import { useEntryStore } from '@/store/entryStore';
import { getCategories, type Category } from '@/services/categoryService';
import { getPaymentModes, type PaymentMode } from '@/services/paymentModeService';
import { createEntry } from '@/services/entryService';
import { uploadImage } from '@/services/cloudinaryService';
import type { Entry, EntryType } from '@/utils/models';
import Voice from '@react-native-voice/voice';
import * as ImagePicker from 'expo-image-picker';

export default function AddEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const theme = useSettingsTheme();
  const params = useLocalSearchParams<{ bookId: string; type?: string }>();
  /** `/home/index/...` wrongly sets `bookId` to the literal "index" — use `/home` for the book list, not `/home/index`. */
  const rawId = params.bookId;
  const bookId = rawId === 'index' ? undefined : rawId;

  useEffect(() => {
    if (rawId === 'index') {
      router.replace('/home');
    }
  }, [rawId, router]);

  useEffect(() => {
    if (!bookId) return;
    void (async () => {
      try {
        const [cats, modes] = await Promise.all([
          getCategories(bookId),
          getPaymentModes(bookId),
        ]);
        setCategories(cats);
        setPaymentModes(modes);
      } catch (e) {
        setError('Failed to load categories and payment modes');
      }
    })();
  }, [bookId]);


  const typeParam = params.type as EntryType | undefined;
  const type: EntryType = typeParam === 'CASH_OUT' ? 'CASH_OUT' : 'CASH_IN';

  const user = useAuthStore((s) => s.user);
  const addEntryToStore = useEntryStore((s) => s.addEntry);

  const title = useMemo(() => (type === 'CASH_IN' ? 'Add Cash In Entry' : 'Add Cash Out Entry'), [type]);

  const [amountText, setAmountText] = useState('');
  const [contactName, setContactName] = useState('');
  const [remark, setRemark] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [isListening, setIsListening] = useState(false);

  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!user) {
      setError('Not authenticated.');
      return;
    }
    if (!bookId) {
      setError('Missing book. Go back and open a book from the home list.');
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
      let image_url: string | null = null;
      if (imageBase64 && bookId) {
        // Unsigned Cloudinary upload (config via EXPO_PUBLIC_CLOUDINARY_*)
        image_url = await uploadImage(imageBase64, `books/${bookId}/entries`);
      }
       const entryId = await createEntry(
         bookId,
         {
           type,
           amount,
           entry_date: new Date(),
           contact_name: contactName.trim() || null,
           remark: remark.trim() || null,
           category_id: category?.id ?? null,
           category_name: category?.name ?? null,
           payment_mode_id: paymentMode?.id ?? null,
           payment_mode_name: paymentMode?.name ?? null,
           image_url,
         } as any,
         user.uid,
       );


      const optimistic: Entry = {
        id: entryId,
        book_id: bookId,
        entry_date: new Date(),
        created_by: user.uid,
        type,
        amount,
        contact_name: contactName.trim() || undefined,
        remark: remark.trim() || undefined,
      };
      addEntryToStore(optimistic);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    Voice.onSpeechResults = (e: any) => {
      const text = e?.value?.[0];
      if (typeof text === 'string' && text.trim()) {
        setRemark(text);
      }
      setIsListening(false);
      setVoiceStatus(null);
    };
    Voice.onSpeechError = (e: any) => {
      setIsListening(false);
      setVoiceStatus(e?.error?.message ?? 'Voice recognition failed');
    };
    return () => {
      void Voice.destroy().catch(() => {});
      try {
        Voice.removeAllListeners?.();
      } catch {
        // Native voice module may already be torn down on unmount.
      }
    };
  }, []);

  async function pickImage() {
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Media library permission denied.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        setError('Could not read image data.');
        return;
      }
      setImageBase64(asset.base64);
      setImageUri(asset.uri ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to pick image');
    }
  }

  async function startVoice() {
    setError(null);
    setVoiceStatus('Listening…');
    setIsListening(true);
    try {
      await Voice.start('en-US');
    } catch (e: any) {
      setIsListening(false);
      setVoiceStatus(null);
      setError(e?.message ?? 'Voice input failed');
    }
  }

  async function stopVoice() {
    try {
      await Voice.stop();
    } finally {
      setIsListening(false);
      setVoiceStatus(null);
    }
  }

  const footerPad = 16 + insets.bottom;
  const scrollBottomPad = 88 + insets.bottom;

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
            <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>Amount</ThemedText>
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
             <EntrySelector
               label="Category"
               value={category}
               options={categories}
               onSelect={setCategory}
               colors={colors}
             />
             <EntrySelector
               label="Payment Mode"
               value={paymentMode}
               options={paymentModes}
               onSelect={setPaymentMode}
               colors={colors}
             />
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
            <ThemedText style={[styles.helper, { color: colors.textTertiary }]}>
              Optional · tap Mic to dictate
            </ThemedText>
            <View style={styles.remarkRow}>
              <View style={styles.remarkInputWrap}>
                <ThemedTextInput
                  value={remark}
                  onChangeText={setRemark}
                  placeholder="Note for this entry"
                  style={[styles.input, { minHeight: 84 }]}
                  multiline
                  accessibilityLabel="Remark"
                />
              </View>
              <Pressable
                onPress={isListening ? stopVoice : startVoice}
                style={({ pressed }) => [
                  styles.micBtn,
                  { borderColor: colors.border },
                  isListening && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                <ThemedText type="defaultSemiBold">{isListening ? '...' : 'Mic'}</ThemedText>
              </Pressable>
            </View>
          </View>

          {!!voiceStatus && (
            <ThemedText style={[styles.voiceStatus, { color: colors.success }]}>{voiceStatus}</ThemedText>
          )}

          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.attachBtn,
              { borderColor: colors.border },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Attach image"
          >
            <ThemedText type="defaultSemiBold">Attach Image</ThemedText>
          </Pressable>

          {!!imageUri && (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: imageUri }} style={[styles.thumb, { borderColor: colors.border }]} />
              <ThemedText style={[styles.thumbSub, { color: colors.textSecondary }]}>Image attached</ThemedText>
            </View>
          )}

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
          accessibilityLabel={saving ? 'Saving entry' : 'Save entry'}
        >
          <ThemedText type="defaultSemiBold" style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function EntrySelector({
  label,
  value,
  options,
  onSelect,
  colors,
}: {
  label: string;
  value: { id: string; name: string } | null;
  options: { id: string; name: string }[];
  onSelect: (val: { id: string; name: string }) => void;
  colors: any;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.selectorBtn,
          { borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.selectorRow}>
          <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}</ThemedText>
          <ThemedText style={[styles.selectorValue, { color: value ? colors.textPrimary : colors.textTertiary }]}>
            {value ? value.name : 'Select...'}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.selectorDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ScrollView style={styles.selectorList}>
        {options.map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => {
              onSelect(opt);
              setIsOpen(false);
            }}
            style={({ pressed }) => [
              styles.selectorItem,
              pressed && { backgroundColor: colors.primaryLight },
              value?.id === opt.id && { backgroundColor: colors.primaryLight },
            ]}
          >
            <ThemedText style={{ color: colors.textPrimary }}>{opt.name}</ThemedText>
            {value?.id === opt.id && <ThemedText style={{ color: colors.primary }}>✓</ThemedText>}
          </Pressable>
        ))}
        {options.length === 0 && (
          <ThemedText style={[styles.selectorEmpty, { color: colors.textTertiary }]}>No options available</ThemedText>
        )}
      </ScrollView>
      <Pressable onPress={() => setIsOpen(false)} style={styles.selectorCloseBtn}>
        <ThemedText style={{ color: colors.primary, fontWeight: 'bold' }}>Close</ThemedText>
      </Pressable>
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
  selectorBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectorDropdown: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 300,
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectorList: {
    maxHeight: 250,
  },
  selectorItem: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  selectorEmpty: {
    padding: 14,
    textAlign: 'center',
  },
  selectorCloseBtn: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  fieldLabelSpaced: { marginTop: 14 },
  helper: { fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 8,
  },
  remarkRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  remarkInputWrap: { flex: 1 },
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
  micBtn: {
    width: 70,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  voiceStatus: { marginTop: 4, fontWeight: '600' },
  attachBtn: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 12, alignItems: 'center' },
  thumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  thumb: { width: 56, height: 56, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  thumbSub: { opacity: 0.85 },
});
