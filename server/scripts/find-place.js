// Tìm dataId của địa điểm Google Maps để điền vào config/brands.json
// Dùng: npm run find-place -- "Thẩm mỹ viện Seoul Center Cần Thơ"
import '../lib/config.js';
import { config } from '../lib/config.js';
import { findPlace } from '../lib/providers/serpapi.js';

const q = process.argv.slice(2).join(' ');
if (!q) {
  console.log('Cách dùng: npm run find-place -- "tên địa điểm + khu vực"');
  process.exit(1);
}
if (!config.serpKey) {
  console.log('Chưa có SERPAPI_KEY trong file .env');
  process.exit(1);
}
try {
  const list = await findPlace(q);
  if (!list.length) console.log('Không tìm thấy địa điểm nào.');
  for (const p of list) console.log(`${p.title}\n  Địa chỉ: ${p.address || '-'}\n  Điểm: ${p.rating ?? '-'} (${p.reviews ?? 0} review)\n  dataId: ${p.dataId}\n`);
} catch (e) {
  console.error('Lỗi:', e.message);
  process.exit(1);
}
