import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ThemedTextInput } from '@/components/themed-text-input';
import { firebaseAuth } from '@/services/firebase';
import { getUserProfileDoc, updateUserProfileDoc } from '@/services/authService';
import { uploadImage } from '@/services/cloudinaryService';
import { useColors } from '@/hooks/useColors';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useAuthStore } from '@/store/authStore';

function isGoogleUser(): boolean {
  const u = firebaseAuth.currentUser;
  return !!u?.providerData?.some((p) => p.providerId === 'google.com');
}

export default function ProfileScreen() {
  const theme = useSettingsTheme();
  const colors = useColors();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setAvatarUrl(user.avatar_url ?? null);
      try {
        const doc = await getUserProfileDoc(user.uid);
        if (!alive) return;
        if (typeof doc?.phone === 'string') setPhone(doc.phone);
        if (typeof doc?.name === 'string' && doc.name) setName(doc.name);
        if (typeof doc?.avatar_url === 'string' && doc.avatar_url) setAvatarUrl(doc.avatar_url);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.uid, user?.name, user?.email, user?.avatar_url]);

  const pickAvatar = useCallback(async () => {
    if (!user?.uid) return;
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
      const url = await uploadImage(res.assets[0].base64, `users/${user.uid}/avatar`);
      setAvatarUrl(url);
      await updateUserProfileDoc(user.uid, { avatar_url: url });
      setUser({
        ...user!,
        avatar_url: url,
      });
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Failed to update photo');
    } finally {
      setSaving(false);
    }
  }, [user, setUser]);

  const save = useCallback(async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUserProfileDoc(user.uid, {
        name: name.trim(),
        phone: phone.trim() || '',
      });
      setUser({
        ...user,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }, [user, name, phone, setUser]);

  const google = isGoogleUser();

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title="Your Profile" theme={theme} colors={colors} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarBlock}>
            <Pressable onPress={() => void pickAvatar()} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPh, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarLetter}>
                    {(name || user?.name || '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.camBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </Pressable>
            <Text style={[styles.displayName, { color: theme.title }]}>{name || user?.name || '—'}</Text>
            <Text style={[styles.emailTop, { color: theme.subtitle }]}>{email || user?.email}</Text>
          </View>

          <SettingsCard theme={theme}>
            <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.subtitle} style={styles.fieldIcon} />
              <View style={styles.fieldFlex}>
                <Text style={[styles.fieldLabel, { color: theme.subtitle }]}>Full name</Text>
                <ThemedTextInput value={name} onChangeText={setName} placeholder="Your name" />
              </View>
            </View>
            <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
              <Ionicons name="call-outline" size={20} color={theme.subtitle} style={styles.fieldIcon} />
              <View style={styles.fieldFlex}>
                <Text style={[styles.fieldLabel, { color: theme.subtitle }]}>Phone number</Text>
                <ThemedTextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.subtitle} style={styles.fieldIcon} />
              <View style={styles.fieldFlex}>
                <Text style={[styles.fieldLabel, { color: theme.subtitle }]}>Email</Text>
                <ThemedTextInput value={email} editable={false} style={styles.dimInput} />
                {google ? (
                  <View style={styles.badgeRow}>
                    <View style={[styles.googleBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.googleBadgeText, { color: colors.primary }]}>From Google</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </SettingsCard>

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: saving ? 0.7 : pressed ? 0.92 : 1 },
            ]}
          >
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarPh: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 36, fontWeight: '800' },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  displayName: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  emailTop: { fontSize: 14, marginTop: 4 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  fieldIcon: { marginTop: 22 },
  fieldFlex: { flex: 1, gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  dimInput: { opacity: 0.85 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  googleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  googleBadgeText: { fontSize: 12, fontWeight: '700' },
  saveBtn: {
    marginHorizontal: 0,
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
