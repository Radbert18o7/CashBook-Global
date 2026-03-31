import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { getBusinessMembers, updateMemberRole, removeMember } from '@/services/businessService';
import { getUserDisplay } from '@/services/userService';
import { firebaseFunctions } from '@/services/firebase';
import type { BookMemberRole } from '@/utils/models';

type Row = {
  userId: string;
  role: BookMemberRole;
  name: string;
  email: string;
};

export default function TeamScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const user = useAuthStore((s) => s.user);
  const { currentBusiness } = useBusinessStore();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!currentBusiness?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const mems = await getBusinessMembers(currentBusiness.id);
      const enriched: Row[] = [];
      for (const m of mems) {
        const uid = m.user_id ?? m.id;
        const d = await getUserDisplay(uid);
        enriched.push({
          userId: uid,
          role: m.role,
          name: d.name,
          email: d.email,
        });
      }
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function initials(name: string) {
    const p = name.trim().split(/\s+/).slice(0, 2);
    return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '?';
  }

  async function sendInvite() {
    if (!currentBusiness?.id || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const fn = httpsCallable(firebaseFunctions, 'sendTeamInvite');
      await fn({
        email: inviteEmail.trim(),
        role: inviteRole,
        businessId: currentBusiness.id,
      });
      Alert.alert(t('team.inviteSent'));
      setSheetOpen(false);
      setInviteEmail('');
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  function onLongPress(row: Row) {
    if (!currentBusiness?.id || row.userId === user?.uid) return;
    const opts = [t('team.changeRole'), t('team.removeMember'), t('common.cancel')];
    const handler = async (i: number) => {
      if (i === 2) return;
      if (i === 0) {
        if (row.role === 'PRIMARY_ADMIN') {
          Alert.alert(t('common.error'), t('errors.permissionDenied'));
          return;
        }
        const next: BookMemberRole = row.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
        await updateMemberRole(currentBusiness.id, row.userId, next);
        void load();
        return;
      }
      if (i === 1) {
        Alert.alert(t('common.confirm'), row.email, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await removeMember(currentBusiness.id, row.userId);
              void load();
            },
          },
        ]);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        handler,
      );
    } else {
      Alert.alert(t('team.title'), undefined, [
        { text: opts[0], onPress: () => void handler(0) },
        { text: opts[1], onPress: () => void handler(1) },
        { text: opts[2], style: 'cancel' },
      ]);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title">{t('team.title')}</ThemedText>

        <View style={styles.hierarchy}>
          <View style={styles.hRow}>
            <View style={styles.hBoxPrimary}>
              <ThemedText type="defaultSemiBold">{t('team.you')}</ThemedText>
              <ThemedText style={styles.hSub}>{t('team.primaryAdmin')}</ThemedText>
            </View>
          </View>
          <View style={styles.hLine} />
          <View style={styles.hRowSplit}>
            <View style={styles.hBox}>
              <ThemedText type="defaultSemiBold">{t('team.roleAdmin')}</ThemedText>
              <ThemedText style={styles.hSub}>{t('team.adminAccess')}</ThemedText>
            </View>
            <View style={styles.hBox}>
              <ThemedText type="defaultSemiBold">{t('team.roleEmployee')}</ThemedText>
              <ThemedText style={styles.hSub}>{t('team.employeeAccess')}</ThemedText>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((k) => (
              <View key={k} style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.skeletonBar, { width: '55%' }]} />
                  <View style={[styles.skeletonBar, { width: '80%', opacity: 0.6 }]} />
                </View>
              </View>
            ))}
          </View>
        ) : rows.length === 0 ? (
          <ThemedText style={styles.empty}>{t('team.empty')}</ThemedText>
        ) : (
          rows.map((row) => (
            <Pressable
              key={row.userId}
              onLongPress={() => onLongPress(row)}
              style={({ pressed }) => [styles.memberRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.avatar}>
                <ThemedText type="defaultSemiBold">{initials(row.name)}</ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{row.name}</ThemedText>
                <ThemedText style={styles.email}>{row.email}</ThemedText>
              </View>
              <View
                style={[
                  styles.badge,
                  row.role === 'PRIMARY_ADMIN' || row.role === 'ADMIN' ? styles.badgeAdmin : styles.badgeEmp,
                ]}
              >
                <ThemedText style={styles.badgeText}>
                  {row.role === 'PRIMARY_ADMIN'
                    ? t('book.roles.primaryAdmin')
                    : row.role === 'EMPLOYEE'
                      ? t('book.roles.employee')
                      : t('book.roles.admin')}
                </ThemedText>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setSheetOpen(true)}>
        <ThemedText style={styles.fabText}>{t('team.addMember')}</ThemedText>
      </Pressable>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle">{t('team.addMember')}</ThemedText>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('team.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: palette.text }]}
              placeholderTextColor="rgba(127,127,127,0.7)"
            />
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setInviteRole('ADMIN')}
                style={[styles.roleChip, inviteRole === 'ADMIN' && styles.roleChipOn]}
              >
                <ThemedText>{t('team.roleAdmin')}</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setInviteRole('EMPLOYEE')}
                style={[styles.roleChip, inviteRole === 'EMPLOYEE' && styles.roleChipOn]}
              >
                <ThemedText>{t('team.roleEmployee')}</ThemedText>
              </Pressable>
            </View>
            <Pressable
              style={[styles.fab, sending && { opacity: 0.7 }]}
              disabled={sending}
              onPress={() => void sendInvite()}
            >
              <ThemedText style={styles.fabText}>{t('team.sendInvite')}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100, gap: 12 },
  hierarchy: { marginVertical: 12, gap: 0 },
  hRow: { alignItems: 'center' },
  hRowSplit: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  hBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
    padding: 12,
    alignItems: 'center',
  },
  hBoxPrimary: {
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
    padding: 14,
    alignItems: 'center',
  },
  hSub: { opacity: 0.75, fontSize: 12, marginTop: 4, textAlign: 'center' },
  hLine: { height: 20, width: 2, backgroundColor: 'rgba(127,127,127,0.4)', alignSelf: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(79,70,229,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { opacity: 0.7, fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeAdmin: { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
  badgeEmp: { backgroundColor: 'rgba(100,116,139,0.25)' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { opacity: 0.75, marginTop: 24, textAlign: 'center' },
  skeletonWrap: { marginTop: 20, gap: 14 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(127,127,127,0.22)',
  },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: { color: '#fff', fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
    paddingBottom: 32,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.4)',
    borderRadius: 12,
    padding: 12,
  },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleChip: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.35)',
    alignItems: 'center',
  },
  roleChipOn: { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)' },
});
