/**
 * Merges missing key paths from en.json into every other locale JSON (leaves existing translations).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'i18n', 'locales');

function deepMergeMissing(target, source) {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return target !== undefined ? target : source;
  }
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {};
  for (const [k, v] of Object.entries(source)) {
    if (!(k in out)) {
      out[k] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMergeMissing(out[k], v);
    }
  }
  return out;
}

const enPath = path.join(localesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

for (const f of fs.readdirSync(localesDir)) {
  if (!f.endsWith('.json') || f === 'en.json') continue;
  const p = path.join(localesDir, f);
  const cur = JSON.parse(fs.readFileSync(p, 'utf8'));
  const merged = deepMergeMissing(cur, en);
  fs.writeFileSync(p, JSON.stringify(merged, null, 2) + '\n', 'utf8');
}
console.log('Merged missing keys from en.json into all locale files.');
