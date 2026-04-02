import { useCallback } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BusinessProfileCard } from '@/components/settings/BusinessProfileCard';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsMenuItem } from '@/components/settings/SettingsMenuItem';
import { SettingsSectionHeader } from '@/components/settings/SettingsSectionHeader';
import { APP_NAME, APP_VERSION, WEB_APP_URL } from '@/constants/appInfo';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { signOut } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useSettingsTheme();
  const { clearUser } = useAuthStore();
  const { currentBusiness } = useBusinessStore();

  const bottomPad = 24 + insets.bottom + 56;

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } finally {
            clearUser();
            router.replace('/welcome');
          }
        },
      },
    ]);
  }, [clearUser, router]);

  const shareApp = useCallback(async () => {
    try {
      await Share.share({
        message: `${APP_NAME} — track cash in and out. ${WEB_APP_URL}`,
        url: WEB_APP_URL,
      });
    } catch {
      /* user dismissed */
    }
  }, []);

  const openWeb = useCallback(() => {
    void Linking.openURL(WEB_APP_URL);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topPad, { paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={[styles.screenTitle, { color: theme.title }]}>Settings</Text>
        </View>

        <BusinessProfileCard
          business={currentBusiness}
          theme={theme}
          onPress={() => router.push('/settings/business-profile')}
        />

        <SettingsSectionHeader title="Business" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="people-outline"
            iconKey="indigo"
            title="Business Team"
            subtitle="Manage members and roles"
            theme={theme}
            isDark={theme.isDark}
            onPress={() => router.push('/settings/team')}
          />
          <SettingsMenuItem
            icon="swap-horizontal-outline"
            iconKey="teal"
            title="Move Book Requests"
            subtitle="Approve or deny requests"
            theme={theme}
            isDark={theme.isDark}
            onPress={() => router.push('/settings/move-book-requests')}
          />
          <SettingsMenuItem
            icon="business-outline"
            iconKey="purple"
            title="Business Settings"
            subtitle="Currency, timezone, address"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={() => router.push('/settings/business-profile')}
          />
        </SettingsCard>

        <SettingsSectionHeader title="General" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="settings-outline"
            iconKey="gray"
            title="App Settings"
            subtitle="Language, theme, security"
            theme={theme}
            isDark={theme.isDark}
            onPress={() => router.push('/settings/app-settings')}
          />
          <SettingsMenuItem
            icon="person-outline"
            iconKey="blue"
            title="Your Profile"
            subtitle="Name, phone, email"
            theme={theme}
            isDark={theme.isDark}
            onPress={() => router.push('/settings/profile')}
          />
          <SettingsMenuItem
            icon="information-circle-outline"
            iconKey="gray"
            title="About CashBook"
            subtitle="Privacy policy, T&C, version"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={() => router.push('/settings/about')}
          />
        </SettingsCard>

        <SettingsSectionHeader title="More" theme={theme} />
        <SettingsCard theme={theme}>
          <SettingsMenuItem
            icon="globe-outline"
            iconKey="green"
            title="CashBook for Web"
            subtitle="Access from any browser"
            theme={theme}
            isDark={theme.isDark}
            rightElement={<Ionicons name="open-outline" size={18} color={theme.chevron} />}
            onPress={openWeb}
          />
          <SettingsMenuItem
            icon="share-social-outline"
            iconKey="pink"
            title="Share App"
            subtitle="Invite friends and colleagues"
            theme={theme}
            isDark={theme.isDark}
            showBorder={false}
            onPress={shareApp}
          />
        </SettingsCard>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logout,
            {
              borderColor: '#DC2626',
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Text style={[styles.version, { color: theme.subtitle }]}>
          {APP_NAME} v{APP_VERSION}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  topPad: { paddingHorizontal: 16, paddingBottom: 8 },
  screenTitle: { fontSize: 28, fontWeight: '800' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
