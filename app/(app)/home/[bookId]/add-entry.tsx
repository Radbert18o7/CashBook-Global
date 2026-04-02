import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { useEntryStore } from '@/store/entryStore';
import { createEntry } from '@/services/entryService';
import { uploadImage } from '@/services/cloudinaryService';
import type { Entry, EntryType } from '@/utils/models';
import Voice from '@react-native-voice/voice';
import * as ImagePicker from 'expo-image-picker';

export default function AddEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string; type?: string }>();
  /** `/home/index/...` wrongly sets `bookId` to the literal "index" — use `/home` for the book list, not `/home/index`. */
  const rawId = params.bookId;
  const bookId = rawId === 'index' ? undefined : rawId;
  const typeParam = params.type as EntryType | undefined;
  const type: EntryType = typeParam === 'CASH_OUT' ? 'CASH_OUT' : 'CASH_IN';

  const user = useAuthStore((s) => s.user);
  const addEntryToStore = useEntryStore((s) => s.addEntry);

  const title = useMemo(() => (type === 'CASH_IN' ? 'Add Cash In Entry' : 'Add Cash Out Entry'), [type]);

  const [amountText, setAmountText] = useState('');
  const [contactName, setContactName] = useState('');
  const [remark, setRemark] = useState('');
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

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={[styles.title, type === 'CASH_IN' ? styles.cashIn : styles.cashOut]}>
        {title}
      </ThemedText>

      <ThemedText style={styles.label}>Amount</ThemedText>
      <ThemedTextInput
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={styles.input}
      />

      <ThemedText style={styles.label}>Contact</ThemedText>
      <ThemedTextInput value={contactName} onChangeText={setContactName} placeholder="Optional" style={styles.input} />

      <ThemedText style={styles.label}>Remark</ThemedText>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <ThemedTextInput
            value={remark}
            onChangeText={setRemark}
            placeholder="Optional"
            style={[styles.input, { minHeight: 84 }]}
            multiline
          />
        </View>
        <Pressable
          onPress={isListening ? stopVoice : startVoice}
          style={({ pressed }) => [
            styles.micBtn,
            isListening && styles.micBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="defaultSemiBold">{isListening ? '...' : 'Mic'}</ThemedText>
        </Pressable>
      </View>

      {!!voiceStatus && (
        <ThemedText style={styles.voiceStatus} lightColor="#10B981" darkColor="#10B981">
          {voiceStatus}
        </ThemedText>
      )}

      <Pressable onPress={pickImage} style={({ pressed }) => [styles.attachBtn, pressed && styles.pressed]}>
        <ThemedText type="defaultSemiBold">{'Attach Image'}</ThemedText>
      </Pressable>

      {!!imageUri && (
        <View style={styles.thumbWrap}>
          <Image source={{ uri: imageUri }} style={styles.thumb} />
          <ThemedText style={styles.thumbSub}>{'Image attached'}</ThemedText>
        </View>
      )}

      {!!error && (
        <ThemedText lightColor="#F43F5E" darkColor="#F43F5E" style={styles.error}>
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
  },
  error: { marginTop: 6, textAlign: 'center' },
  stickyFooter: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  saveBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.7 },
  micBtn: { width: 70, borderRadius: 12, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.35)', alignItems: 'center' },
  micBtnActive: { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.12)' },
  voiceStatus: { marginTop: -4, opacity: 0.9, fontWeight: '600' },
  attachBtn: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.35)', paddingVertical: 12, alignItems: 'center' },
  thumbWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  thumb: { width: 56, height: 56, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.25)' },
  thumbSub: { opacity: 0.7 },
});

