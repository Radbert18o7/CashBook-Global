/**
 * Generates i18n/locales/{lang}.json from en.json using Google Translate (gtx client).
 * Dedupes identical English strings. Parallel batches for speed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enPath = path.join(root, 'i18n', 'locales', 'en.json');
const outDir = path.join(root, 'i18n', 'locales');

const TARGETS = [
  ['es', 'es'],
  ['fr', 'fr'],
  ['de', 'de'],
  ['pt', 'pt'],
  ['it', 'it'],
  ['nl', 'nl'],
  ['ru', 'ru'],
  ['ar', 'ar'],
  ['hi', 'hi'],
  ['bn', 'bn'],
  ['ja', 'ja'],
  ['zh-CN', 'zh-CN'],
  ['ko', 'ko'],
  ['tr', 'tr'],
  ['pl', 'pl'],
  ['vi', 'vi'],
  ['th', 'th'],
  ['id', 'id'],
  ['ms', 'ms'],
  ['sw', 'sw'],
  ['ur', 'ur'],
  ['fa', 'fa'],
  ['he', 'he'],
  ['el', 'el'],
  ['sv', 'sv'],
  ['no', 'nb'],
  ['da', 'da'],
  ['fi', 'fi'],
  ['cs', 'cs'],
  ['ro', 'ro'],
];

const RTL = new Set(['ar', 'ur', 'fa', 'he']);

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

async function gtx(text, tl) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(tl)}&dt=t&q=${q}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return j[0][0][0];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BATCH = 10;

async function translateUnique(uniqueVals, tl) {
  const map = new Map();
  for (let i = 0; i < uniqueVals.length; i += BATCH) {
    const chunk = uniqueVals.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((u) =>
        gtx(String(u), tl).catch((e) => {
          console.warn('gtx fail', tl, String(u).slice(0, 40), e.message);
          return u;
        }),
      ),
    );
    chunk.forEach((u, j) => map.set(u, results[j]));
    await sleep(150);
  }
  return map;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const flatEn = flatten(en);
  const keys = Object.keys(flatEn).sort();
  const uniqueVals = [...new Set(keys.map((k) => flatEn[k]))];

  for (const [fileCode, tl] of TARGETS) {
    console.log('Translating', fileCode, '...');
    const map = await translateUnique(uniqueVals, tl);
    const outFlat = {};
    for (const k of keys) {
      outFlat[k] = map.get(flatEn[k]) ?? flatEn[k];
    }
    let tree = unflatten(outFlat);
    const base = fileCode.split('-')[0];
    if (RTL.has(base) || RTL.has(fileCode)) {
      tree = { dir: 'rtl', ...tree };
    }
    const fn = fileCode === 'zh-CN' ? 'zh-CN.json' : `${fileCode}.json`;
    fs.writeFileSync(path.join(outDir, fn), JSON.stringify(tree, null, 2) + '\n');
    console.log('wrote', fn);
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
