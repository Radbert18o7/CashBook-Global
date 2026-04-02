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
    <View style={styles.root}>
      <Text style={styles.welcome}>
        Welcome, {firstName(user?.name ?? 'there')}!
      </Text>
      <Text style={styles.sub}>Let&apos;s set up your business</Text>

      <Text style={styles.label}>Business name</Text>
      <TextInput
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Your business name"
        placeholderTextColor="#64748B"
        style={styles.input}
      />

      <Text style={styles.label}>Currency</Text>
      <Pressable style={styles.currencyRow} onPress={() => setCurrencyOpen(true)}>
        <Text style={styles.currencyText}>{currencyLabel}</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        onPress={() => void submit()}
        disabled={busy}
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
          <View style={styles.sheet}>
            <TextInput
              value={currencyQ}
              onChangeText={setCurrencyQ}
              placeholder="Search currency"
              placeholderTextColor="#64748B"
              style={styles.search}
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.curItem}
                  onPress={() => {
                    setCurrency(item.code);
                    setCurrencyOpen(false);
                    setCurrencyQ('');
                  }}
                >
                  <Text style={styles.curItemText}>
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  welcome: { color: '#fff', fontSize: 28, fontWeight: '800' },
  sub: { color: '#94A3B8', fontSize: 16, marginTop: 8, marginBottom: 28 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currencyText: { color: '#fff', fontSize: 16, flex: 1 },
  chev: { color: '#94A3B8', fontSize: 22 },
  err: { color: '#F87171', marginTop: 12 },
  cta: {
    marginTop: 32,
    backgroundColor: '#4F46E5',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.75 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  search: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
  },
  curItem: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#334155' },
  curItemText: { color: '#F1F5F9', fontSize: 16 },
});
