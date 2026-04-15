import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import {
  setOnboardingComplete,
  updateUserProfileDoc,
} from '@/services/authService';
import { createBusiness, getBusinesses, updateBusiness } from '@/services/businessService';
import { WORLD_CURRENCIES } from '@/utils/worldCurrencies';

function firstName(full: string): string {
  const p = full.trim().split(/\s+/)[0];
  return p || 'Your';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const { setBusinesses, setCurrentBusiness } = useBusinessStore();

  const defaultBizName = useMemo(
    () => `${firstName(user?.name ?? '')}'s Business`,
    [user?.name],
  );

  const [businessName, setBusinessName] = useState(defaultBizName);
  const [currency, setCurrency] = useState('USD');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyQ, setCurrencyQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currencyLabel = useMemo(() => {
    const c = WORLD_CURRENCIES.find((x) => x.code === currency);
    return c ? `${c.code} · ${c.name}` : currency;
  }, [currency]);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQ.trim().toLowerCase();
    if (!q) return WORLD_CURRENCIES;
    return WORLD_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [currencyQ]);

  async function submit() {
    if (!user?.uid) return;
    const name = businessName.trim();
    if (!name) {
      setErr('Enter a business name');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updateUserProfileDoc(user.uid, { currency });
      const existing = await getBusinesses(user.uid);
      if (existing.length === 0) {
        const businessId = await createBusiness({ name }, user.uid);
        await updateBusiness(businessId, { currency_code: currency });
        const list = await getBusinesses(user.uid);
        setBusinesses(list);
        setCurrentBusiness(list.find((b) => b.id === businessId) ?? list[0] ?? null);
      } else {
        await updateBusiness(existing[0].id, {
          name,
          currency_code: currency,
        });
        const list = await getBusinesses(user.uid);
        setBusinesses(list);
        setCurrentBusiness(list[0] ?? null);
      }
      await setOnboardingComplete(user.uid);
      router.replace('/home');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <Text style={[styles.welcome, { color: colors.textPrimary }]}>
        Welcome, {firstName(user?.name ?? 'there')}!
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>Let&apos;s set up your business</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Business name</Text>
      <TextInput
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Your business name"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
      <Pressable
        style={[
          styles.currencyRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setCurrencyOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose currency"
      >
        <Text style={[styles.currencyText, { color: colors.textPrimary }]}>{currencyLabel}</Text>
        <Text style={[styles.chev, { color: colors.textTertiary }]}>›</Text>
      </Pressable>

      {err ? (
        <Text style={[styles.err, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {err}
        </Text>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary },
          busy && styles.ctaDisabled,
          pressed && !busy && styles.ctaPressed,
        ]}
        onPress={() => void submit()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={busy ? 'Saving' : 'Continue to app'}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Get Started →</Text>
        )}
      </Pressable>

      <Modal visible={currencyOpen} animationType="slide" transparent onRequestClose={() => setCurrencyOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCurrencyOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <TextInput
              value={currencyQ}
              onChangeText={setCurrencyQ}
              placeholder="Search currency"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.search,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
              ]}
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.curItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCurrency(item.code);
                    setCurrencyOpen(false);
                    setCurrencyQ('');
                  }}
                >
                  <Text style={[styles.curItemText, { color: colors.textPrimary }]}>
                    {item.code} · {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  welcome: { fontSize: 28, fontWeight: '800' },
  sub: { fontSize: 16, marginTop: 8, marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 8, marginTop: 12, fontWeight: '600' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currencyText: { fontSize: 16, flex: 1 },
  chev: { fontSize: 22 },
  err: { marginTop: 12 },
  cta: {
    marginTop: 32,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.75 },
  ctaPressed: { opacity: 0.92 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  search: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  curItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  curItemText: { fontSize: 16 },
});
