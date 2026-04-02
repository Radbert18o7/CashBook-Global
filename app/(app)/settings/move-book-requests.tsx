import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';

export default function MoveBookRequestsScreen() {
  const theme = useSettingsTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title="Move Book Requests" theme={theme} />
      <View style={styles.body}>
        <Ionicons name="swap-horizontal-outline" size={64} color={theme.subtitle} />
        <Text style={[styles.title, { color: theme.title }]}>No pending requests</Text>
        <Text style={[styles.sub, { color: theme.subtitle }]}>
          When someone asks to move a book to another business, it appears here for you to approve or deny.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
});
