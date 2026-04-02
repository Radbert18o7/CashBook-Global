import { useCallback, useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import {
  type AppLanguage,
  indianLocales,
  languageDisplayNames,
  setAppLanguage,
  supportedLocales,
} from '@/i18n';
import { useSettingsTheme } from '@/hooks/useSettingsTheme';
import { useUiStore } from '@/store/uiStore';

const indianSet = new Set<string>(indianLocales);

export default function LanguagePickerScreen() {
  const { t, i18n } = useTranslation();
  const theme = useSettingsTheme();
  const setUiLanguage = useUiStore((s) => s.setLanguage);
  const uiLang = useUiStore((s) => s.language);

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
      { title: t('settings.indianLanguagesSection'), data: [...indianLocales] as AppLanguage[] },
      { title: t('settings.otherLanguagesSection'), data: otherLocales },
    ],
    [t, otherLocales],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.screenBg }]}>
      <ScreenHeader title={t('settings.language')} theme={theme} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionTitle, { color: theme.section }]}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const selected = uiLang === item || i18n.language === item;
          const indian = indianSet.has(item) ? languageDisplayNames[item as keyof typeof languageDisplayNames] : null;
          return (
            <Pressable
              onPress={() => void onSelect(item)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.cardBg, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              {indian ? (
                <View>
                  <Text style={[styles.rowTitle, { color: theme.title }]}>{indian.name}</Text>
                  <Text style={[styles.rowSub, { color: theme.subtitle }]}>{indian.englishName}</Text>
                </View>
              ) : (
                <Text style={[styles.rowTitle, { color: theme.title }]}>{item}</Text>
              )}
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  row: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  check: { color: '#4F46E5', fontSize: 18, fontWeight: '800' },
});
