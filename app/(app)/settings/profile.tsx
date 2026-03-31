import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{'Your Profile'}</ThemedText>
      <View style={styles.card}>
        <ThemedText type="defaultSemiBold">{user?.name ?? '—'}</ThemedText>
        <ThemedText style={styles.sub}>{user?.email ?? ''}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.25)', padding: 16, gap: 6 },
  sub: { opacity: 0.75 },
});

