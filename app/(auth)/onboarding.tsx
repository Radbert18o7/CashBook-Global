import { useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/authStore';
import { setOnboardingComplete } from '@/services/authService';

const { width } = Dimensions.get('window');

const SLIDES = [
  { key: '1', titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { key: '2', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { key: '3', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / Math.max(width, 1)));
  }

  async function finish() {
    if (user?.uid) await setOnboardingComplete(user.uid);
    router.replace('/home/index');
  }

  return (
    <ThemedView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => void finish()} hitSlop={12}>
          <ThemedText type="defaultSemiBold" style={styles.skip}>
            {t('onboarding.skip')}
          </ThemedText>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={[...SLIDES]}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <ThemedText type="title" style={styles.title}>
              {t(item.titleKey)}
            </ThemedText>
            <ThemedText style={styles.body}>{t(item.bodyKey)}</ThemedText>
            <View style={styles.illus} />
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        {index < SLIDES.length - 1 ? (
          <Pressable
            style={styles.btn}
            onPress={() => listRef.current?.scrollToIndex({ index: index + 1, animated: true })}
          >
            <ThemedText type="defaultSemiBold" style={styles.btnText}>
              {t('onboarding.next')}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={() => void finish()}>
            <ThemedText type="defaultSemiBold" style={styles.btnText}>
              {t('onboarding.getStarted')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 48 },
  topBar: { paddingHorizontal: 20, alignItems: 'flex-end' },
  skip: { opacity: 0.8 },
  slide: { paddingHorizontal: 24, paddingTop: 24, gap: 12 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', opacity: 0.85, lineHeight: 22 },
  illus: {
    marginTop: 24,
    height: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(79,70,229,0.25)',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(127,127,127,0.35)' },
  dotActive: { backgroundColor: '#4F46E5', width: 22 },
  footer: { padding: 24 },
  btn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff' },
});
