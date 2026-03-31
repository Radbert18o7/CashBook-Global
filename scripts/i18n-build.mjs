/**
 * For each supported BCP-47 code, merges i18n/flat/<code>.json (flat dot-keys)
 * on top of i18n/locales/en.json and writes i18n/locales/<code>.json.
 * Missing flat files fall back to English. RTL langs get "dir": "rtl" at root.
 *
 * Run: node scripts/i18n-build.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enPath = path.join(root, 'i18n', 'locales', 'en.json');
const flatDir = path.join(root, 'i18n', 'flat');
const outDir = path.join(root, 'i18n', 'locales');

/** Same codes as i18n lazy loaders + expo-localization */
const SUPPORTED_LOCALES = [
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
];

const RTL = new Set(['ar', 'he', 'ur', 'fa']);

function flatten(obj, prefix = '') {
  const out = {};
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

function unflatten(flat) {
  const rootObj = {};
  for (const dotKey of Object.keys(flat)) {
    const parts = dotKey.split('.');
    let cur = rootObj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      cur[p] = cur[p] || {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = flat[dotKey];
  }
  return rootObj;
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enFlat = flatten(en);

if (!fs.existsSync(flatDir)) {
  fs.mkdirSync(flatDir, { recursive: true });
}

for (const lng of SUPPORTED_LOCALES) {
  const flatPath = path.join(flatDir, `${lng}.json`);
  const partialFlat = fs.existsSync(flatPath) ? JSON.parse(fs.readFileSync(flatPath, 'utf8')) : {};
  const mergedFlat = { ...enFlat, ...partialFlat };
  let tree = unflatten(mergedFlat);
  const base = lng.split('-')[0]?.toLowerCase() ?? lng;
  if (RTL.has(base) || RTL.has(lng.toLowerCase())) {
    tree = { dir: 'rtl', ...tree };
  }
  fs.writeFileSync(path.join(outDir, `${lng}.json`), JSON.stringify(tree, null, 2) + '\n');
  console.log('wrote', lng, Object.keys(partialFlat).length, 'flat overrides');
}

console.log('done');
