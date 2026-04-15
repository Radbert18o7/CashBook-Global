import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsMenuItem } from '@/components/settings/SettingsMenuItem';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { SettingsSwitchRow } from '@/components/settings/SettingsSwitchRow';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useColors } from '@/hooks/useColors';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import {
  getSettingBool,
  getSettingString,
  setSettingBool,
  setSettingString,
  settingsKeys,
} from '@/services/settingsStorage';
import type { ThemeMode } from '@/utils/models';
import { useUiStore } from '@/store/uiStore';

const THEME_LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function AppSettingsScreen() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const theme = useSettingsTheme();
  const colors = useColors();
  const uiTheme = useUiStore((s) => s.theme);
  const setUiTheme = useUiStore((s) => s.setTheme);
  const uiLang = useUiStore((s) => s.language);

  const [appLock, setAppLock] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [pinModal, setPinModal] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [timeModal, setTimeModal] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [a, b, d, au, h] = await Promise.all([
        getSettingBool(settingsKeys.appLock),
        getSettingBool(settingsKeys.biometric),
        getSettingBool(settingsKeys.dailyReminder),
        getSettingBool(settingsKeys.autoBackup, true),
        getSettingString(settingsKeys.reminderHour, '9'),
      ]);
      if (!alive) return;
      setAppLock(a);
      setBiometric(b);
      setDailyReminder(d);
      setAutoBackup(au);
      const hr = parseInt(h, 10);
      setReminderHour(Number.isFinite(hr) ? hr : 9);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistLock = useCallback(async (v: boolean) => {
    await setSettingBool(settingsKeys.appLock, v);
    setAppLock(v);
  }, []);

  const onToggleAppLock = useCallback(
    async (v: boolean) => {
      if (v) {
        setPinDraft('');
        setPinModal(true);
        return;
      }
      await persistLock(false);
      await setSettingString(settingsKeys.appLockPin, '');
    },
    [persistLock],
  );

  const confirmPin = useCallback(async () => {
    if (pinDraft.trim().length < 4) {
      Alert.alert('PIN', 'Enter at least 4 digits.');
      return;
    }
    await setSettingString(settingsKeys.appLockPin, pinDraft.trim());
    await persistLock(true);
    setPinModal(false);
    setPinDraft('');
  }, [pinDraft, persistLock]);

  const pickTheme = useCallback(() => {
    const options = ['Light', 'Dark', 'System', 'Cancel'];
    const apply = (idx: number) => {
      if (idx >= 3) return;
      const modes: ThemeMode[] = ['light', 'dark', 'system'];
      setUiTheme(modes[idx]);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (i) => apply(i),
      );
    } else {
      Alert.alert('Theme', undefined, [
        { text: 'Light', onPress: () => setUiTheme('light') },
        { text: 'Dark', onPress: () => setUiTheme('dark') },
        { text: 'System', onPress: () => setUiTheme('system') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [setUiTheme]);

  const langLabel = uiLang || i18n.language || 'en';

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title="App Settings" theme={theme} colors={colors} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SettingsSectionHeader title="Appearance" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="language-outline"
            iconKey="blue"
            title="Language"
            subtitle="App display language"
            theme={theme}
            isDark={theme.isDark}
            rightElement={<Text style={[styles.badge, { color: theme.subtitle }]}>{langLabel}</Text>}
            onPress={() => router.push('/settings/language')}
          />
          <SettingsMenuItem
            icon="contrast-outline"
            iconKey="purple"
            title="Theme"
            subtitle="Light, dark, or follow system"
            theme={theme}
            isDark={theme.isDark}
            rightElement={
              <Text style={[styles.badge, { color: theme.subtitle }]}>{THEME_LABEL[uiTheme]}</Text>
            }
            onPress={pickTheme}
          />
          <SettingsMenuItem
            icon="text-outline"
            iconKey="gray"
            title="Text size"
            subtitle="Reading comfort"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            rightElement={<Text style={[styles.badge, { color: theme.subtitle }]}>Default</Text>}
            onPress={() =>
              Alert.alert('Text size', 'Text size controls will be available in a future update.')
            }
          />
        </SettingsCard>

        <SettingsSectionHeader title="Security" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsSwitchRow
            icon="lock-closed-outline"
            iconKey="red"
            title="App lock"
            subtitle="Require PIN to open the app"
            value={appLock}
            onValueChange={(v) => void onToggleAppLock(v)}
            theme={theme}
            isDark={theme.isDark}
          />
          <SettingsSwitchRow
            icon="finger-print-outline"
            iconKey="indigo"
            title="Biometric login"
            subtitle="Use fingerprint or face where available"
            value={biometric}
            onValueChange={async (v) => {
              await setSettingBool(settingsKeys.biometric, v);
              setBiometric(v);
            }}
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
          />
        </SettingsCard>

        <SettingsSectionHeader title="Notifications" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsSwitchRow
            icon="notifications-outline"
            iconKey="teal"
            title="Daily reminder"
            subtitle="Stay on top of your entries"
            value={dailyReminder}
            onValueChange={async (v) => {
              await setSettingBool(settingsKeys.dailyReminder, v);
              setDailyReminder(v);
              if (v) setTimeModal(true);
            }}
            theme={theme}
            isDark={theme.isDark}
            trackOn="#99F6E4"
            thumbOn="#0D9488"
            showBorder={!!dailyReminder}
          />
          {dailyReminder ? (
            <SettingsMenuItem
              icon="time-outline"
              iconKey="gray"
              title="Reminder time"
              subtitle={`${reminderHour}:00 local time`}
              theme={theme}
              isDark={theme.isDark}
              showBorder={false}
              onPress={() => setTimeModal(true)}
            />
          ) : null}
        </SettingsCard>

        <SettingsSectionHeader title="Data" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsSwitchRow
            icon="cloud-upload-outline"
            iconKey="green"
            title="Auto backup"
            subtitle="Keep data synced with your account"
            value={autoBackup}
            onValueChange={async (v) => {
              await setSettingBool(settingsKeys.autoBackup, v);
              setAutoBackup(v);
            }}
            theme={theme}
            isDark={theme.isDark}
            trackOn="#BBF7D0"
            thumbOn="#16A34A"
          />
          <SettingsMenuItem
            icon="download-outline"
            iconKey="gray"
            title="Export all data"
            subtitle="Request a copy of your information"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={() => router.push('/settings/privacy')}
          />
        </SettingsCard>
      </ScrollView>

      <Modal visible={pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPinModal(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: theme.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.title }]}>Set PIN</Text>
            <ThemedTextInput
              value={pinDraft}
              onChangeText={setPinDraft}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="4+ digits"
              style={styles.pinInput}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setPinModal(false)} style={styles.modalBtn}>
                <Text style={{ color: theme.subtitle }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void confirmPin()} style={styles.modalBtn}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={timeModal} transparent animationType="slide" onRequestClose={() => setTimeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTimeModal(false)}>
          <Pressable style={[styles.timeSheet, { backgroundColor: theme.cardBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.title }]}>Reminder hour</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <Pressable
                  key={h}
                  style={[styles.timeRow, { borderBottomColor: theme.border }]}
                  onPress={async () => {
                    setReminderHour(h);
                    await setSettingString(settingsKeys.reminderHour, String(h));
                    setTimeModal(false);
                  }}
                >
                  <Text style={{ color: theme.title, fontSize: 16 }}>{h}:00</Text>
                  {reminderHour === h ? <Text style={{ color: colors.primary }}>✓</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 32 },
  badge: { fontSize: 14, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: { borderRadius: 16, padding: 16, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  pinInput: { marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  timeSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
