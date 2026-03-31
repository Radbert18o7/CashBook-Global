import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBusinessStore } from '@/store/businessStore';
import { getBusiness, updateBusiness } from '@/services/businessService';
import { uploadImage } from '@/services/cloudinaryService';
import { WORLD_CURRENCIES } from '@/utils/worldCurrencies';
import { listTimezones } from '@/utils/timezones';

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function BusinessProfileScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentBusiness, updateBusiness: patchStore } = useBusinessStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [currencyQ, setCurrencyQ] = useState('');
  const [tzQ, setTzQ] = useState('');

  const load = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const b = await getBusiness(currentBusiness.id);
      if (b) {
        setName(b.name ?? '');
        setAddress(b.address ?? '');
        setCurrencyCode(b.currency_code ?? '');
        setTimezone(b.timezone ?? '');
        setLogoUrl(b.logo_url ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const strength = useMemo(() => {
    let p = 0;
    if (name.trim()) p += 20;
    if (logoUrl) p += 20;
    if (address.trim()) p += 20;
    if (currencyCode.trim()) p += 20;
    if (timezone.trim()) p += 20;
    return p;
  }, [name, logoUrl, address, currencyCode, timezone]);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQ.trim().toLowerCase();
    if (!q) return WORLD_CURRENCIES;
    return WORLD_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [currencyQ]);

  const filteredTz = useMemo(() => {
    const list = listTimezones();
    const q = tzQ.trim().toLowerCase();
    if (!q) return list;
    return list.filter((z) => z.toLowerCase().includes(q));
  }, [tzQ]);

  async function pickLogo() {
    if (!currentBusiness?.id) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    setSaving(true);
    try {
      const url = await uploadImage(res.assets[0].base64, `businesses/${currentBusiness.id}/logo`);
      setLogoUrl(url);
      await updateBusiness(currentBusiness.id, { logo_url: url });
      patchStore(currentBusiness.id, { logo_url: url });
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!currentBusiness?.id) return;
    setSaving(true);
    try {
      await updateBusiness(currentBusiness.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        currency_code: currencyCode.trim() || undefined,
        timezone: timezone.trim() || undefined,
        logo_url: logoUrl ?? undefined,
      });
      patchStore(currentBusiness.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        currency_code: currencyCode.trim() || undefined,
        timezone: timezone.trim() || undefined,
        logo_url: logoUrl ?? undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!currentBusiness?.id) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">{t('businessProfile.title')}</ThemedText>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <>
            {strength < 50 ? (
              <View style={[styles.warn, { borderColor: 'rgba(245,158,11,0.5)' }]}>
                <ThemedText style={{ color: '#B45309' }}>{t('businessProfile.incompleteWarning')}</ThemedText>
              </View>
            ) : null}

            <Pressable onPress={() => void pickLogo()} style={styles.logoWrap}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImg} contentFit="cover" />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: 'rgba(79,70,229,0.2)' }]}>
                  <ThemedText type="defaultSemiBold">{initials(name || currentBusiness.name)}</ThemedText>
                </View>
              )}
              <ThemedText style={styles.logoHint}>{t('businessProfile.logoHint')}</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>{t('businessProfile.strength')}</ThemedText>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${strength}%` }]} />
            </View>
            <ThemedText style={styles.pct}>{strength}%</ThemedText>

            <ThemedText style={styles.label}>{t('businessProfile.name')}</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: palette.text, borderColor: 'rgba(127,127,127,0.35)' }]}
              placeholderTextColor="rgba(127,127,127,0.7)"
            />

            <ThemedText style={styles.label}>{t('businessProfile.address')}</ThemedText>
            <TextInput
              value={address}
              onChangeText={setAddress}
              multiline
              style={[styles.input, styles.multiline, { color: palette.text, borderColor: 'rgba(127,127,127,0.35)' }]}
              placeholderTextColor="rgba(127,127,127,0.7)"
            />

            <ThemedText style={styles.label}>{t('businessProfile.currency')}</ThemedText>
            <Pressable
              style={[styles.selector, { borderColor: 'rgba(127,127,127,0.35)' }]}
              onPress={() => setCurrencyOpen(true)}
            >
              <ThemedText>{currencyCode || '—'}</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>{t('businessProfile.timezone')}</ThemedText>
            <Pressable
              style={[styles.selector, { borderColor: 'rgba(127,127,127,0.35)' }]}
              onPress={() => setTzOpen(true)}
            >
              <ThemedText numberOfLines={1}>{timezone || '—'}</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.75 }]}
              disabled={saving}
              onPress={() => void save()}
            >
              <ThemedText style={styles.saveBtnText}>{t('businessProfile.save')}</ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={currencyOpen} animationType="slide" transparent onRequestClose={() => setCurrencyOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCurrencyOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('businessProfile.searchCurrency')}</ThemedText>
            <TextInput
              value={currencyQ}
              onChangeText={setCurrencyQ}
              placeholder={t('common.search')}
              style={[styles.input, { color: palette.text, borderColor: 'rgba(127,127,127,0.35)' }]}
              placeholderTextColor="rgba(127,127,127,0.7)"
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listRow}
                  onPress={() => {
                    setCurrencyCode(item.code);
                    setCurrencyOpen(false);
                    setCurrencyQ('');
                  }}
                >
                  <ThemedText type="defaultSemiBold">{item.code}</ThemedText>
                  <ThemedText style={{ opacity: 0.75 }}>{item.name}</ThemedText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={tzOpen} animationType="slide" transparent onRequestClose={() => setTzOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTzOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('businessProfile.searchTimezone')}</ThemedText>
            <TextInput
              value={tzQ}
              onChangeText={setTzQ}
              placeholder={t('common.search')}
              style={[styles.input, { color: palette.text, borderColor: 'rgba(127,127,127,0.35)' }]}
              placeholderTextColor="rgba(127,127,127,0.7)"
            />
            <FlatList
              data={filteredTz}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listRow}
                  onPress={() => {
                    setTimezone(item);
                    setTzOpen(false);
                    setTzQ('');
                  }}
                >
                  <ThemedText>{item}</ThemedText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48, gap: 8 },
  warn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  logoWrap: { alignItems: 'center', gap: 8, marginVertical: 12 },
  logoImg: { width: 96, height: 96, borderRadius: 48 },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHint: { opacity: 0.75, fontSize: 13 },
  label: { marginTop: 8, opacity: 0.85 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  selector: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  barTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(127,127,127,0.2)',
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: '100%', backgroundColor: '#4F46E5' },
  pct: { fontSize: 12, opacity: 0.7 },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  listRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127,127,127,0.2)' },
});
