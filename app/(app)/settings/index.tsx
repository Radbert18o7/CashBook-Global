import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { signOut } from '@/services/authService';

export default function SettingsScreen() {
  const { clearUser } = useAuthStore();

  async function handleLogout() {
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
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Settings
      </ThemedText>

      <View style={styles.section}>
        <Link href="/settings/profile" asChild>
          <Pressable style={styles.row}>
            <ThemedText type="defaultSemiBold">{'Your Profile'}</ThemedText>
          </Pressable>
        </Link>
        <Link href="/settings/app-settings" asChild>
          <Pressable style={styles.row}>
            <ThemedText type="defaultSemiBold">{'App Settings'}</ThemedText>
          </Pressable>
        </Link>
        <Link href="/settings/business-profile" asChild>
          <Pressable style={styles.row}>
            <ThemedText type="defaultSemiBold">{'Business Profile'}</ThemedText>
          </Pressable>
        </Link>
        <Link href="/settings/team" asChild>
          <Pressable style={styles.row}>
            <ThemedText type="defaultSemiBold">{'Team'}</ThemedText>
          </Pressable>
        </Link>
        <Link href="/settings/privacy" asChild>
          <Pressable style={styles.row}>
            <ThemedText type="defaultSemiBold">{'Privacy & Data'}</ThemedText>
          </Pressable>
        </Link>
      </View>

      <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
        <ThemedText type="defaultSemiBold">{'Logout'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  title: { textAlign: 'left', marginTop: 8 },
  section: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.25)', padding: 8, gap: 8 },
  row: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'transparent' },
  logoutBtn: { marginTop: 'auto', backgroundColor: '#F43F5E', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pressed: { opacity: 0.9 },
});

