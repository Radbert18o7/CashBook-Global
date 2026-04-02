import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsMenuItem } from '@/components/settings/SettingsMenuItem';
import { APP_NAME, APP_VERSION } from '@/constants/appInfo';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useRouter } from 'expo-router';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? 'https://www.cashbookglobal.app/privacy';
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://www.cashbookglobal.app/terms';

export default function AboutScreen() {
  const theme = useSettingsTheme();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title="About CashBook" theme={theme} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.lead, { color: theme.subtitle }]}>
          {APP_NAME} helps you track cash in and out across your books and team.
        </Text>
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="document-text-outline"
            iconKey="blue"
            title="Privacy policy"
            subtitle="How we handle your data"
            theme={theme}
            isDark={theme.isDark}
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
          <SettingsMenuItem
            icon="reader-outline"
            iconKey="purple"
            title="Terms & conditions"
            subtitle="Rules for using the service"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
          />
        </SettingsCard>
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="shield-checkmark-outline"
            iconKey="teal"
            title="Privacy & data controls"
            subtitle="Export, delete account, GDPR"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={() => router.push('/settings/privacy')}
          />
        </SettingsCard>
        <Text style={[styles.ver, { color: theme.subtitle }]}>
          {APP_NAME} · v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  ver: { textAlign: 'center', fontSize: 13, marginTop: 20 },
});
