import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useColors } from '@/hooks/useColors';
import { type SettingsTheme, useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useBusinessStore } from '@/store/businessStore';
import { getBusiness, updateBusiness } from '@/services/businessService';
import { uploadImage } from '@/services/cloudinaryService';
import { computeBusinessProfileStrength } from '@/utils/businessProfileStrength';
import { WORLD_CURRENCIES } from '@/utils/worldCurrencies';
import { listTimezones } from '@/utils/timezones';

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
}

export default function BusinessProfileScreen() {
  const { t } = useTranslation();
  const theme = useSettingsTheme();
  const colors = useColors();
  const { currentBusiness, updateBusiness: patchStore } = useBusinessStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
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
        setPhone(b.phone ?? '');
        setWebsite(b.website ?? '');
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
    return computeBusinessProfileStrength({
      name,
      logo_url: logoUrl ?? undefined,
      address,
      currency_code: currencyCode,
      timezone,
    });
  }, [name, logoUrl, address, currencyCode, timezone]);

  const checklist = useMemo(
    () => [
      { key: 'name', label: 'Business name', ok: !!name.trim() },
      { key: 'logo', label: 'Logo', ok: !!logoUrl },
      { key: 'address', label: 'Address', ok: !!address.trim() },
      { key: 'currency', label: 'Currency', ok: !!currencyCode.trim() },
      { key: 'timezone', label: 'Timezone', ok: !!timezone.trim() },
    ],
    [name, logoUrl, address, currencyCode, timezone],
  );

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

  const currencyLabel = useMemo(() => {
    const c = WORLD_CURRENCIES.find((x) => x.code === currencyCode);
    return c ? `${c.code} · ${c.name}` : currencyCode || '—';
  }, [currencyCode]);

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
    const opt = (s: string) => (s.trim() ? s.trim() : '');
    try {
      await updateBusiness(currentBusiness.id, {
        name: name.trim(),
        address: opt(address),
        phone: opt(phone),
        website: opt(website),
        currency_code: opt(currencyCode),
        timezone: opt(timezone),
        logo_url: logoUrl ?? null,
      });
      patchStore(currentBusiness.id, {
        name: name.trim(),
        address: opt(address),
        phone: opt(phone),
        website: opt(website),
        currency_code: opt(currencyCode),
        timezone: opt(timezone),
        logo_url: logoUrl ?? undefined,
      });
      Alert.alert('Saved', 'Business profile saved!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save business profile';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (!currentBusiness?.id) {
    return (
      <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
        <ScreenHeader title="Business Profile" theme={theme} colors={colors} />
        <Text style={{ color: theme.subtitle, padding: 16 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader
        title="Business Profile"
        theme={theme}
        colors={colors}
        rightLabel={saving ? '…' : 'Save'}
        rightAction={() => {
          if (!saving) void save();
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={[styles.logoCard, { backgroundColor: theme.cardBg }]} onPress={() => void pickLogo()}>
            <View style={styles.logoCircleWrap}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoBig} contentFit="cover" />
              ) : (
                <View style={[styles.logoPh, { backgroundColor: colors.primary }]}>
                  <Text style={styles.logoPhTxt}>{initials(name || currentBusiness.name)}</Text>
                </View>
              )}
              <View style={[styles.camFab, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </View>
            <Text style={[styles.logoHint, { color: theme.subtitle }]}>Tap to change logo</Text>
          </Pressable>

          <Text style={[styles.secHead, { color: theme.section }]}>BUSINESS INFO</Text>
          <SettingsCard theme={theme}>
            <FieldRow icon="business-outline" label="Business name" theme={theme} showBorder>
              <ThemedTextInput value={name} onChangeText={setName} placeholder="Name" />
            </FieldRow>
            <FieldRow icon="location-outline" label="Address" theme={theme} showBorder>
              <ThemedTextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street, city"
                multiline
                style={{ minHeight: 64, textAlignVertical: 'top' }}
              />
            </FieldRow>
            <FieldRow icon="call-outline" label="Phone" theme={theme} showBorder>
              <ThemedTextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone" />
            </FieldRow>
            <FieldRow icon="globe-outline" label="Website" theme={theme}>
              <ThemedTextInput
                value={website}
                onChangeText={setWebsite}
                autoCapitalize="none"
                placeholder="https://"
              />
            </FieldRow>
          </SettingsCard>

          <Text style={[styles.secHead, { color: theme.section }]}>PREFERENCES</Text>
          <SettingsCard theme={theme}>
            <Pressable
              style={[styles.pickRow, { borderBottomColor: theme.border }]}
              onPress={() => setCurrencyOpen(true)}
            >
              <Ionicons name="cash-outline" size={22} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.pickLabel, { color: theme.subtitle }]}>Currency</Text>
                <Text style={[styles.pickVal, { color: theme.title }]} numberOfLines={2}>
                  {currencyLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.chevron} />
            </Pressable>
            <Pressable style={styles.pickRow} onPress={() => setTzOpen(true)}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.pickLabel, { color: theme.subtitle }]}>Timezone</Text>
                <Text style={[styles.pickVal, { color: theme.title }]} numberOfLines={2}>
                  {timezone || '—'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.chevron} />
            </Pressable>
          </SettingsCard>

          <Text style={[styles.secHead, { color: theme.section }]}>PROFILE STRENGTH</Text>
          <SettingsCard theme={theme}>
            <View style={[styles.strengthHead, { borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.subtitle, fontSize: 12, fontWeight: '600' }}>Completion</Text>
              <Text style={{ color: theme.title, fontWeight: '800' }}>{strength}%</Text>
            </View>
            {checklist.map((row, i) => (
              <View
                key={row.key}
                style={[
                  styles.checkRow,
                  i < checklist.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="ellipse-outline" size={18} color={theme.subtitle} />
                <Text style={[styles.checkLabel, { color: theme.title }]}>{row.label}</Text>
                <Ionicons
                  name={row.ok ? 'checkmark-circle' : 'close-circle-outline'}
                  size={22}
                  color={row.ok ? '#10B981' : theme.subtitle}
                />
              </View>
            ))}
          </SettingsCard>

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveWide,
              { backgroundColor: colors.primary, opacity: saving ? 0.75 : pressed ? 0.92 : 1 },
            ]}
          >
            <Text style={styles.saveWideTxt}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal visible={currencyOpen} animationType="slide" transparent onRequestClose={() => setCurrencyOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCurrencyOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: theme.title }]}>{t('businessProfile.searchCurrency')}</Text>
            <ThemedTextInput
              value={currencyQ}
              onChangeText={setCurrencyQ}
              placeholder={t('common.search')}
              style={styles.input}
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.listRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setCurrencyCode(item.code);
                    setCurrencyOpen(false);
                    setCurrencyQ('');
                  }}
                >
                  <Text style={{ color: theme.title, fontWeight: '700' }}>{item.code}</Text>
                  <Text style={{ color: theme.subtitle }}>{item.name}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={tzOpen} animationType="slide" transparent onRequestClose={() => setTzOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTzOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: theme.title }]}>{t('businessProfile.searchTimezone')}</Text>
            <ThemedTextInput
              value={tzQ}
              onChangeText={setTzQ}
              placeholder={t('common.search')}
              style={styles.input}
            />
            <FlatList
              data={filteredTz}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.listRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    setTimezone(item);
                    setTzOpen(false);
                    setTzQ('');
                  }}
                >
                  <Text style={{ color: theme.title }}>{item}</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FieldRow({
  icon,
  label,
  children,
  theme,
  showBorder,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: ReactNode;
  theme: SettingsTheme;
  showBorder?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldBlock,
        showBorder ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : null,
      ]}
    >
      <View style={styles.fieldHead}>
        <Ionicons name={icon} size={20} color={theme.subtitle} />
        <Text style={[styles.fieldLbl, { color: theme.subtitle }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  logoCard: {
    alignItems: 'center',
    alignSelf: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 480,
  },
  logoCircleWrap: { position: 'relative', width: 100, height: 100 },
  logoBig: { width: 100, height: 100, borderRadius: 50 },
  logoPh: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPhTxt: { color: '#fff', fontSize: 32, fontWeight: '800' },
  camFab: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  logoHint: { fontSize: 13, marginTop: 8 },
  secHead: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  fieldBlock: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLbl: { fontSize: 12, fontWeight: '600' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickLabel: { fontSize: 12, fontWeight: '600' },
  pickVal: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  strengthHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  checkLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  saveWide: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveWideTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 8 },
  listRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
});
