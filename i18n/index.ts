import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';
import pl from './locales/pl.json';
import vi from './locales/vi.json';
import th from './locales/th.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import sw from './locales/sw.json';
import ur from './locales/ur.json';
import fa from './locales/fa.json';
import he from './locales/he.json';
import el from './locales/el.json';
import sv from './locales/sv.json';
import no from './locales/no.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import cs from './locales/cs.json';
import ro from './locales/ro.json';

const rtlLanguages = ['ar', 'he', 'ur', 'fa'] as const;

/** Locales for major Indian languages (LTR), listed together in the app language picker. */
export const indianLocales = ['hi', 'bn', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'pa'] as const;
export type IndianLocale = (typeof indianLocales)[number];

export const languageDisplayNames: Record<
  IndianLocale,
  { name: string; englishName: string }
> = {
  hi: { name: 'हिन्दी', englishName: 'Hindi' },
  bn: { name: 'বাংলা', englishName: 'Bengali' },
  gu: { name: 'ગુજરાતી', englishName: 'Gujarati' },
  mr: { name: 'मराठी', englishName: 'Marathi' },
  ta: { name: 'தமிழ்', englishName: 'Tamil' },
  te: { name: 'తెలుగు', englishName: 'Telugu' },
  kn: { name: 'ಕನ್ನಡ', englishName: 'Kannada' },
  ml: { name: 'മലയാളം', englishName: 'Malayalam' },
  pa: { name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi' },
};

/** All 38 locales: `en` + 37 translated JSON files under `locales/`. */
export const supportedLocales = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'it',
  'nl',
  'ru',
  'ar',
  'hi',
  'bn',
  'gu',
  'mr',
  'ta',
  'te',
  'kn',
  'ml',
  'pa',
  'ja',
  'zh-CN',
  'ko',
  'tr',
  'pl',
  'vi',
  'th',
  'id',
  'ms',
  'sw',
  'ur',
  'fa',
  'he',
  'el',
  'sv',
  'no',
  'da',
  'fi',
  'cs',
  'ro',
] as const;

export type AppLanguage = (typeof supportedLocales)[number];

const supportedSet = new Set<string>(supportedLocales);

function stripDir(bundle: Record<string, unknown>): Record<string, unknown> {
  const { dir: _ignored, ...rest } = bundle;
  return rest;
}

function pickSupportedLanguage(tag: string | undefined): AppLanguage {
  if (!tag) return 'en';
  const lower = tag.toLowerCase();
  if (lower === 'zh-cn' || lower === 'zh-hans' || lower.startsWith('zh-hans')) return 'zh-CN';
  if (supportedSet.has(tag)) return tag as AppLanguage;
  const base = tag.split('-')[0]?.toLowerCase() ?? 'en';
  if (supportedSet.has(base)) return base as AppLanguage;
  return 'en';
}

function isRTL(lang: string): boolean {
  const base = lang.split('-')[0].toLowerCase();
  return (rtlLanguages as readonly string[]).includes(base);
}

function applyRTL(rtl: boolean) {
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

const locale = Localization.getLocales?.()?.[0];
const initialLanguage = pickSupportedLanguage(locale?.languageTag);

applyRTL(isRTL(initialLanguage));

const resources = {
  en: { translation: stripDir(en as unknown as Record<string, unknown>) },
  es: { translation: stripDir(es as unknown as Record<string, unknown>) },
  fr: { translation: stripDir(fr as unknown as Record<string, unknown>) },
  de: { translation: stripDir(de as unknown as Record<string, unknown>) },
  pt: { translation: stripDir(pt as unknown as Record<string, unknown>) },
  it: { translation: stripDir(it as unknown as Record<string, unknown>) },
  nl: { translation: stripDir(nl as unknown as Record<string, unknown>) },
  ru: { translation: stripDir(ru as unknown as Record<string, unknown>) },
  ar: { translation: stripDir(ar as unknown as Record<string, unknown>) },
  hi: { translation: stripDir(hi as unknown as Record<string, unknown>) },
  bn: { translation: stripDir(bn as unknown as Record<string, unknown>) },
  gu: { translation: stripDir(gu as unknown as Record<string, unknown>) },
  mr: { translation: stripDir(mr as unknown as Record<string, unknown>) },
  ta: { translation: stripDir(ta as unknown as Record<string, unknown>) },
  te: { translation: stripDir(te as unknown as Record<string, unknown>) },
  kn: { translation: stripDir(kn as unknown as Record<string, unknown>) },
  ml: { translation: stripDir(ml as unknown as Record<string, unknown>) },
  pa: { translation: stripDir(pa as unknown as Record<string, unknown>) },
  ja: { translation: stripDir(ja as unknown as Record<string, unknown>) },
  'zh-CN': { translation: stripDir(zhCN as unknown as Record<string, unknown>) },
  ko: { translation: stripDir(ko as unknown as Record<string, unknown>) },
  tr: { translation: stripDir(tr as unknown as Record<string, unknown>) },
  pl: { translation: stripDir(pl as unknown as Record<string, unknown>) },
  vi: { translation: stripDir(vi as unknown as Record<string, unknown>) },
  th: { translation: stripDir(th as unknown as Record<string, unknown>) },
  id: { translation: stripDir(id as unknown as Record<string, unknown>) },
  ms: { translation: stripDir(ms as unknown as Record<string, unknown>) },
  sw: { translation: stripDir(sw as unknown as Record<string, unknown>) },
  ur: { translation: stripDir(ur as unknown as Record<string, unknown>) },
  fa: { translation: stripDir(fa as unknown as Record<string, unknown>) },
  he: { translation: stripDir(he as unknown as Record<string, unknown>) },
  el: { translation: stripDir(el as unknown as Record<string, unknown>) },
  sv: { translation: stripDir(sv as unknown as Record<string, unknown>) },
  no: { translation: stripDir(no as unknown as Record<string, unknown>) },
  da: { translation: stripDir(da as unknown as Record<string, unknown>) },
  fi: { translation: stripDir(fi as unknown as Record<string, unknown>) },
  cs: { translation: stripDir(cs as unknown as Record<string, unknown>) },
  ro: { translation: stripDir(ro as unknown as Record<string, unknown>) },
} as const;

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: 'en',
  resources: resources as unknown as import('i18next').Resource,
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function ensureLocaleLoaded(_lng: AppLanguage): Promise<void> {
  /* All bundles are bundled synchronously; kept for API compatibility. */
}

export async function setAppLanguage(lng: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lng);
  applyRTL(isRTL(lng));
}

void (async () => {
  if (initialLanguage !== 'en') {
    await i18n.changeLanguage(initialLanguage);
    applyRTL(isRTL(initialLanguage));
  }
})();

export { i18n };
