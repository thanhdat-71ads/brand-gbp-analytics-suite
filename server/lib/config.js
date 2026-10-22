import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Nạp .env thủ công để không cần thư viện ngoài
(function loadEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);

export const config = {
  port: num(process.env.PORT, 3000),
  host: process.env.HOST || '127.0.0.1',
  serpKey: process.env.SERPAPI_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
  forceMock: process.env.USE_MOCK === '1',
  syncTimes: (process.env.SYNC_TIMES ?? '08:00').split(',').map((s) => s.trim()).filter((s) => /^\d{1,2}:\d{2}$/.test(s)),
  syncMin: num(process.env.SYNC_INTERVAL_MIN, 60),
  competitorDays: num(process.env.COMPETITOR_SYNC_DAYS, 7),
  searchHours: num(process.env.SEARCH_INTERVAL_HOURS, 168),
  pagesFirst: num(process.env.REVIEW_PAGES_FIRST, 5),
  pagesIncr: num(process.env.REVIEW_PAGES_INCREMENTAL, 3),
  dataDir: process.env.DATA_DIR || path.join(ROOT, 'data'),
  // Giao diện nằm ở thư mục gốc repo (cùng bản GitHub Pages): index.html, assets/, data/
  publicDir: path.dirname(ROOT),
};

export function providerMode() {
  return config.serpKey && !config.forceMock ? 'serpapi' : 'mock';
}

export function loadBrands() {
  // brands.json (thật, không đưa lên GitHub) → nếu chưa có thì dùng brands.example.json
  const real = path.join(ROOT, 'config', 'brands.json');
  const file = process.env.BRANDS_FILE || (fs.existsSync(real) ? real : path.join(ROOT, 'config', 'brands.example.json'));
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw.brands;
}

export function getBrand(id) {
  return loadBrands().find((b) => b.id === id);
}
