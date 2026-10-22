import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const FILE = path.join(config.dataDir, 'db.json');
fs.mkdirSync(path.join(config.dataDir, 'reports'), { recursive: true });

let db = { brands: {} };
try {
  if (fs.existsSync(FILE)) db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.error('Không đọc được db.json, tạo mới:', e.message);
}

const blank = () => ({
  mode: null,
  reviews: [],
  serp: { at: null, items: [] },
  places: {},
  alerts: [],
  snapshots: [],
  reports: [],
  lastSync: null,
  lastSearchSync: null,
  lastCompetitorSync: null,
  syncLog: [],
});

export function brandData(id) {
  if (!db.brands[id]) db.brands[id] = blank();
  return db.brands[id];
}

export function resetBrand(id) {
  db.brands[id] = blank();
  return db.brands[id];
}

let timer = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 300);
}

export function flush() {
  clearTimeout(timer);
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flush();
    process.exit(0);
  });
}
