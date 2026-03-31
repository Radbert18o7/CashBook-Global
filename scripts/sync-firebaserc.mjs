/**
 * Sets `.firebaserc` default project from `.env` → EXPO_PUBLIC_FIREBASE_PROJECT_ID.
 * Run: node scripts/sync-firebaserc.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const outPath = path.join(root, '.firebaserc');

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return map;
}

let projectId = '';
if (fs.existsSync(envPath)) {
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
  projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
}

if (!projectId) {
  console.warn('EXPO_PUBLIC_FIREBASE_PROJECT_ID not found in .env; .firebaserc unchanged.');
  process.exit(0);
}

fs.writeFileSync(outPath, JSON.stringify({ projects: { default: projectId } }, null, 2) + '\n');
console.log('Updated .firebaserc default project to', projectId);
