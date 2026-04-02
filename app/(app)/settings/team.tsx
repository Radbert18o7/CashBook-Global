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
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ThemedTextInput } from '@/components/themed-text-input';
import { firebaseFunctions } from '@/services/firebase';
import { getBusinessMembers, removeMember, updateMemberRole } from '@/services/businessService';
import { getUserDisplay } from '@/services/userService';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { BookMemberRole } from '@/utils/models';

type Row = {
  userId: string;
  role: BookMemberRole;
  name: string;
  email: string;
};

export default function TeamScreen() {
  const { t } = useTranslation();
  const theme = useSettingsTheme();
  const insets = useSafeAreaInsets();
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

  function openMemberMenu(row: Row) {
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
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title="Business Team" theme={theme} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="people" size={48} color="#fff" style={{ opacity: 0.95 }} />
          <Text style={styles.heroTitle}>Manage Your Team</Text>
          <Text style={styles.heroSub}>Add members and assign roles</Text>
        </View>

        <View style={styles.roleRow}>
          <View style={[styles.roleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="ribbon-outline" size={22} color="#CA8A04" />
            <Text style={[styles.roleName, { color: theme.title }]}>Admin</Text>
            <Text style={[styles.roleHint, { color: theme.subtitle }]}>Full access</Text>
            <Text style={[styles.bullets, { color: theme.subtitle }]}>
              • Add entries{'\n'}• View reports{'\n'}• Manage contacts
            </Text>
          </View>
          <View style={[styles.roleCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={22} color={theme.subtitle} />
            <Text style={[styles.roleName, { color: theme.title }]}>Employee</Text>
            <Text style={[styles.roleHint, { color: theme.subtitle }]}>Limited access</Text>
            <Text style={[styles.bullets, { color: theme.subtitle }]}>
              • Add entries{'\n'}• View assigned books
            </Text>
          </View>
        </View>

        {loading ? (
          <Text style={{ color: theme.subtitle, textAlign: 'center', marginTop: 24 }}>{t('common.loading')}</Text>
        ) : rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={64} color={theme.subtitle} />
            <Text style={[styles.emptyTitle, { color: theme.title }]}>No team members yet</Text>
            <Text style={[styles.emptySub, { color: theme.subtitle }]}>
              Add members to collaborate on your books
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <View
              key={row.userId}
              style={[styles.memberRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials(row.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memName, { color: theme.title }]}>{row.name}</Text>
                <Text style={[styles.memEmail, { color: theme.subtitle }]}>{row.email}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  row.role === 'PRIMARY_ADMIN'
                    ? styles.badgePri
                    : row.role === 'ADMIN'
                      ? styles.badgeAdm
                      : styles.badgeEmp,
                ]}
              >
                <Text style={styles.badgeTxt}>
                  {row.role === 'PRIMARY_ADMIN'
                    ? 'PRIMARY ADMIN'
                    : row.role === 'ADMIN'
                      ? 'ADMIN'
                      : 'EMPLOYEE'}
                </Text>
              </View>
              {row.userId !== user?.uid ? (
                <Pressable onPress={() => openMemberMenu(row)} hitSlop={8} style={styles.moreBtn}>
                  <Ionicons name="ellipsis-vertical" size={20} color={theme.subtitle} />
                </Pressable>
              ) : (
                <View style={{ width: 28 }} />
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => setSheetOpen(true)}
        style={[
          styles.fab,
          { bottom: 24 + insets.bottom, backgroundColor: '#4F46E5' },
        ]}
      >
        <Ionicons name="person-add-outline" size={26} color="#fff" />
      </Pressable>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: theme.title }]}>{t('team.addMember')}</Text>
            <ThemedTextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder={t('team.email')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={styles.rolePick}>
              <Pressable
                onPress={() => setInviteRole('ADMIN')}
                style={[
                  styles.chip,
                  { borderColor: theme.border },
                  inviteRole === 'ADMIN' && styles.chipOn,
                ]}
              >
                <Text style={{ color: theme.title }}>{t('team.roleAdmin')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setInviteRole('EMPLOYEE')}
                style={[
                  styles.chip,
                  { borderColor: theme.border },
                  inviteRole === 'EMPLOYEE' && styles.chipOn,
                ]}
              >
                <Text style={{ color: theme.title }}>{t('team.roleEmployee')}</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.sendBtn, sending && { opacity: 0.7 }]}
              disabled={sending}
              onPress={() => void sendInvite()}
            >
              <Text style={styles.sendBtnTxt}>{t('team.sendInvite')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16 },
  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 6, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  roleName: { fontSize: 16, fontWeight: '800' },
  roleHint: { fontSize: 12 },
  bullets: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79,70,229,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontWeight: '800', color: '#4F46E5' },
  memName: { fontSize: 15, fontWeight: '700' },
  memEmail: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: 110 },
  badgePri: { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
  badgeAdm: { backgroundColor: 'rgba(37, 99, 235, 0.2)' },
  badgeEmp: { backgroundColor: 'rgba(100, 116, 139, 0.25)' },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  moreBtn: { padding: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
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
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  input: { borderRadius: 12, padding: 12 },
  rolePick: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  chipOn: { borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.1)' },
  sendBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnTxt: { color: '#fff', fontWeight: '700' },
});
