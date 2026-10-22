import { DAY, fold, hash, ts, weekStart } from './util.js';
import { selfReviews } from './metrics.js';

const isNeg = (r) => r.analysis?.sentiment === 'negative';
const normText = (t) => fold(t).replace(/[^a-z0-9]+/g, ' ').trim();

// Sinh cảnh báo mới (dedupe theo key). Trả về danh sách cảnh báo vừa tạo.
export function evaluate(bd) {
  const now = Date.now();
  const self = selfReviews(bd);
  const have = new Set(bd.alerts.map((a) => a.key));
  const created = [];
  const add = (key, level, title, detail, reviewIds = []) => {
    if (have.has(key)) return;
    have.add(key);
    const a = { id: hash(key + now), key, level, title, detail, reviewIds, createdAt: new Date(now).toISOString(), read: false };
    bd.alerts.unshift(a);
    created.push(a);
  };

  // R1: review nghiêm trọng trong 14 ngày gần nhất
  for (const r of self.filter((x) => isNeg(x) && x.analysis.severity >= 2 && ts(x) > now - 14 * DAY)) {
    const lvl = r.analysis.severity >= 3 ? 'critical' : 'warning';
    add(`sev:${r.id}`, lvl, `Review ${r.rating}★ nghiêm trọng - ${r.branch || 'Khác'}`, `${r.author}: ${(r.analysis.summary || r.text || '').slice(0, 160)}`, [r.id]);
  }

  // R2: số review tiêu cực 7 ngày so với nền (trung bình tuần của 8 tuần trước đó)
  const neg7 = self.filter((r) => isNeg(r) && ts(r) > now - 7 * DAY);
  const base = self.filter((r) => isNeg(r) && ts(r) <= now - 7 * DAY && ts(r) > now - 63 * DAY).length / 8;
  const wk = weekStart(now);
  if (neg7.length >= Math.max(5, 3 * base)) add(`spike:${wk}:critical`, 'critical', `Review tiêu cực tăng đột biến: ${neg7.length} trong 7 ngày`, `Mức nền khoảng ${base.toFixed(1)} review tiêu cực/tuần.`, neg7.map((r) => r.id));
  else if (neg7.length >= Math.max(3, 2 * base)) add(`spike:${wk}:warning`, 'warning', `Review tiêu cực tăng: ${neg7.length} trong 7 ngày`, `Mức nền khoảng ${base.toFixed(1)} review tiêu cực/tuần.`, neg7.map((r) => r.id));

  // R3: điểm sao 30 ngày giảm so với 30 ngày trước
  const l30 = self.filter((r) => r.rating != null && ts(r) > now - 30 * DAY);
  const p30 = self.filter((r) => r.rating != null && ts(r) <= now - 30 * DAY && ts(r) > now - 60 * DAY);
  if (l30.length >= 10 && p30.length >= 10) {
    const a = l30.reduce((s, r) => s + r.rating, 0) / l30.length;
    const b = p30.reduce((s, r) => s + r.rating, 0) / p30.length;
    if (a - b <= -0.3) add(`drop:${wk}`, 'warning', `Điểm sao trung bình giảm ${(b - a).toFixed(2)} so với 30 ngày trước`, `${b.toFixed(2)} → ${a.toFixed(2)}`);
  }

  // R4: nhiều tài khoản khác nhau đăng cùng một nội dung trong 7 ngày (nghi review tấn công)
  const groups = new Map();
  for (const r of self.filter((x) => isNeg(x) && ts(x) > now - 14 * DAY)) {
    const n = normText(r.text);
    if (n.length < 15) continue;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(r);
  }
  for (const [n, list] of groups) {
    const authors = new Set(list.map((r) => r.author));
    if (authors.size >= 2) add(`dup:${hash(n)}`, 'warning', `Nghi review tấn công: ${authors.size} tài khoản đăng cùng nội dung`, `"${list[0].text.slice(0, 100)}". Nên báo cáo vi phạm chính sách nội dung với Google Maps.`, list.map((r) => r.id));
  }
  return created;
}

export function crisisLevel(bd) {
  const recent = bd.alerts.filter((a) => Date.parse(a.createdAt) > Date.now() - 7 * DAY);
  if (recent.some((a) => a.level === 'critical')) return 'critical';
  if (recent.some((a) => a.level === 'warning')) return 'warning';
  if (recent.length) return 'watch';
  return 'normal';
}

export function duplicateGroups(bd) {
  const now = Date.now();
  const groups = new Map();
  for (const r of selfReviews(bd).filter((x) => isNeg(x) && ts(x) > now - 30 * DAY)) {
    const n = normText(r.text);
    if (n.length < 15) continue;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(r);
  }
  return [...groups.values()].filter((l) => new Set(l.map((r) => r.author)).size >= 2);
}
