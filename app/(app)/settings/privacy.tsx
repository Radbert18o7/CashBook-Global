import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { httpsCallable } from 'firebase/functions';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { firebaseFunctions } from '@/services/firebase';
import { signOut } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://example.com/privacy';
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://example.com/terms';

function parseCallablePayload(raw: unknown): { success: boolean; data?: unknown; error?: { message?: string } } {
  const outer = raw as { data?: unknown };
  const payload = outer?.data;
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload as { success: boolean; data?: unknown; error?: { message?: string } };
  }
  return { success: false, error: { message: 'Invalid response' } };
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const clearUser = useAuthStore((s) => s.clearUser);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');

  async function requestExport() {
    setExporting(true);
    try {
      const fn = httpsCallable(firebaseFunctions, 'processGdprRequest');
      const res = await fn({ type: 'EXPORT' });
      const p = parseCallablePayload(res);
      if (!p.success) throw new Error(p.error?.message ?? 'Export failed');
      Alert.alert(t('common.done'), t('privacyScreen.exportRequested'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  function openFirstDeleteConfirm() {
    Alert.alert(t('privacyScreen.deleteTitle'), t('privacyScreen.confirmSure'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setDeletePhrase('');
          setDeleteModalOpen(true);
        },
      },
    ]);
  }

  async function confirmDeleteAccount() {
    if (deletePhrase.trim() !== 'DELETE') {
      Alert.alert(t('common.error'), t('privacyScreen.typeDelete'));
      return;
    }
    setDeleting(true);
    try {
      const fn = httpsCallable(firebaseFunctions, 'processGdprRequest');
      const res = await fn({ type: 'DELETE' });
      const p = parseCallablePayload(res);
      if (!p.success) throw new Error(p.error?.message ?? 'Delete failed');
      setDeleteModalOpen(false);
      try {
        await signOut();
      } catch {
        /* session may already be invalid */
      }
      clearUser();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }

  async function openUrl(url: string) {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">{t('settings.privacy')}</ThemedText>

        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">{t('privacyScreen.exportTitle')}</ThemedText>
          <ThemedText style={styles.muted}>{t('privacyScreen.exportDesc')}</ThemedText>
          <Pressable
            style={[styles.btn, exporting && { opacity: 0.75 }]}
            disabled={exporting}
            onPress={() => void requestExport()}
          >
            <ThemedText style={styles.btnText}>{t('privacyScreen.requestExport')}</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <ThemedText type="defaultSemiBold" style={{ color: '#B91C1C' }}>
            {t('privacyScreen.deleteTitle')}
          </ThemedText>
          <ThemedText style={styles.muted}>{t('privacyScreen.deleteWarning')}</ThemedText>
          <Pressable
            style={[styles.dangerBtn, deleting && { opacity: 0.75 }]}
            disabled={deleting}
            onPress={openFirstDeleteConfirm}
          >
            <ThemedText style={styles.dangerBtnText}>{t('privacyScreen.deleteButton')}</ThemedText>
          </Pressable>
        </View>

        <Pressable style={styles.link} onPress={() => void openUrl(PRIVACY_URL)}>
          <ThemedText type="defaultSemiBold" style={{ color: '#4F46E5' }}>
            {t('privacyScreen.openPrivacy')}
          </ThemedText>
        </Pressable>
        <Pressable style={styles.link} onPress={() => void openUrl(TERMS_URL)}>
          <ThemedText type="defaultSemiBold" style={{ color: '#4F46E5' }}>
            {t('privacyScreen.openTerms')}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDeleteModalOpen(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('privacyScreen.deleteTitle')}</ThemedText>
            <ThemedText style={styles.muted}>{t('privacyScreen.typeDelete')}</ThemedText>
            <TextInput
              value={deletePhrase}
              onChangeText={setDeletePhrase}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              placeholder="DELETE"
              placeholderTextColor="rgba(127,127,127,0.6)"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setDeleteModalOpen(false)}>
                <ThemedText>{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, deleting && { opacity: 0.7 }]}
                disabled={deleting}
                onPress={() => void confirmDeleteAccount()}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{t('common.delete')}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.25)',
    padding: 16,
    gap: 10,
  },
  dangerCard: {
    borderColor: 'rgba(248,113,113,0.5)',
    backgroundColor: 'rgba(254,226,226,0.35)',
  },
  muted: { opacity: 0.8, lineHeight: 20 },
  btn: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  dangerBtn: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dangerBtnText: { color: '#DC2626', fontWeight: '800' },
  link: { paddingVertical: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  modalConfirm: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
});
