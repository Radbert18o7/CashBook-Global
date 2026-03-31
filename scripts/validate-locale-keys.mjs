/**
 * Verifies a locale JSON has the same key paths as en.json (flat dot paths).
 * Run: node scripts/validate-locale-keys.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v, p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function stripDirRoot(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { dir: _d, ...rest } = obj;
  return rest;
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const enKeys = new Set(flatten(en).sort());

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
let ok = true;
for (const f of files) {
  if (f === 'en.json') continue;
  const j = stripDirRoot(JSON.parse(fs.readFileSync(path.join(localesDir, f), 'utf8')));
  const keys = new Set(flatten(j).sort());
  for (const k of enKeys) {
    if (!keys.has(k)) {
      console.error(`${f}: missing key ${k}`);
      ok = false;
    }
  }
  for (const k of keys) {
    if (!enKeys.has(k)) {
      console.error(`${f}: extra key ${k}`);
      ok = false;
    }
  }
}
if (!ok) process.exit(1);
console.log('All locale files match en.json key structure:', files.filter((x) => x !== 'en.json').length, 'files');
