import { useCallback, useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  type AppLanguage,
  indianLocales,
  languageDisplayNames,
  setAppLanguage,
  supportedLocales,
} from '@/i18n';
import { useUiStore } from '@/store/uiStore';

const indianSet = new Set<string>(indianLocales);

export default function AppSettingsScreen() {
  const { t, i18n } = useTranslation();
  const uiLang = useUiStore((s) => s.language);
  const setUiLanguage = useUiStore((s) => s.setLanguage);

  const onSelect = useCallback(
    async (lng: AppLanguage) => {
      await setAppLanguage(lng);
      setUiLanguage(lng);
    },
    [setUiLanguage],
  );

  const otherLocales = useMemo(
    () => supportedLocales.filter((l) => !indianSet.has(l)),
    [],
  );

  const sections = useMemo(
    () => [
      {
        title: t('settings.indianLanguagesSection'),
        data: [...indianLocales] as AppLanguage[],
      },
      {
        title: t('settings.otherLanguagesSection'),
        data: otherLocales,
      },
    ],
    [t, otherLocales],
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t('settings.appSettings')}</ThemedText>
      <View style={styles.card}>
        <ThemedText style={styles.label}>{t('settings.language')}</ThemedText>
        <ThemedText type="defaultSemiBold">
          {uiLang} / {i18n.language}
        </ThemedText>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item}
          style={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <ThemedText type="defaultSemiBold" style={styles.sectionHeader}>
              {title}
            </ThemedText>
          )}
          renderItem={({ item }) => {
            const indian = indianSet.has(item) ? languageDisplayNames[item as keyof typeof languageDisplayNames] : null;
            return (
              <Pressable
                onPress={() => void onSelect(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {indian ? (
                  <View>
                    <ThemedText type="defaultSemiBold">{indian.name}</ThemedText>
                    <ThemedText style={styles.sub}>{indian.englishName}</ThemedText>
                  </View>
                ) : (
                  <ThemedText>{item}</ThemedText>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.25)',
    padding: 16,
    gap: 8,
    minHeight: 200,
  },
  label: { opacity: 0.8, marginBottom: 4 },
  list: { flexGrow: 0, maxHeight: 420 },
  sectionHeader: { marginTop: 12, marginBottom: 6, opacity: 0.9 },
  row: { paddingVertical: 10, paddingHorizontal: 4 },
  rowPressed: { opacity: 0.7 },
  sub: { opacity: 0.65, fontSize: 13, marginTop: 2 },
});
