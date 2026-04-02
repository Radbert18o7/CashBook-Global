import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SettingsTheme } from '@/hooks/useSettingsTheme';
import type { Business } from '@/utils/models';
import { computeBusinessProfileStrength } from '@/utils/businessProfileStrength';

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#7C3AED', '#F97371'];

function hashName(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? '').join('') || '—';
}

type Props = {
  business: Business | null;
  theme: SettingsTheme;
  onPress: () => void;
};

export function BusinessProfileCard({ business, theme, onPress }: Props) {
  const strength = useMemo(
    () => (business ? computeBusinessProfileStrength(business) : 0),
    [business],
  );

  const name = business?.name?.trim() || 'Business';
  const bg = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];

  let statusColor = '#F97316';
  let statusText = 'Incomplete profile';
  let dot = '#F97316';
  let fillColor = '#F97316';
  if (strength >= 80) {
    statusColor = '#10B981';
    statusText = 'Profile complete';
    dot = '#10B981';
    fillColor = '#10B981';
  } else if (strength >= 50) {
    statusColor = '#EAB308';
    statusText = 'Almost complete';
    dot = '#EAB308';
    fillColor = '#EAB308';
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.cardBg,
          shadowColor: '#000',
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {business?.logo_url ? (
          <Image source={{ uri: business.logo_url }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: bg }]}>
            <Text style={styles.avatarInitials}>{initials(name)}</Text>
          </View>
        )}
        <View style={styles.mid}>
          <Text style={[styles.bizName, { color: theme.title }]} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusText}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.track }]}>
            <View style={[styles.fill, { width: `${Math.min(100, strength)}%`, backgroundColor: fillColor }]} />
          </View>
          <Text style={[styles.pct, { color: theme.subtitle }]}>{strength.toFixed(1)}% complete</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.chevron} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 22, fontWeight: '700' },
  mid: { flex: 1, marginLeft: 12 },
    bizName: { fontSize: 18, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600' },
  track: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 11, marginTop: 4 },
});
