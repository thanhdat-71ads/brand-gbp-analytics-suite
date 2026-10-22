import { DAY, weekStart, dayKey, clamp, avg, ts, fold } from './util.js';
import { TOPICS } from './analysis.js';

export const entitiesOf = (brand) => [{ id: 'self', name: brand.name }, ...brand.competitors.map((c) => ({ id: c.id, name: c.name }))];
export const selfReviews = (bd) => bd.reviews.filter((r) => r.entity === 'self');
const within = (arr, from, to) => arr.filter((r) => ts(r) >= from && ts(r) < to);
const sent = (r) => r.analysis?.sentiment;

export function ratingStats(arr) {
  const rated = arr.filter((r) => r.rating != null);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  rated.forEach((r) => dist[r.rating]++);
  return { n: rated.length, avg: rated.length ? +avg(rated.map((r) => r.rating)).toFixed(2) : null, dist };
}

export function sentimentCounts(arr) {
  const c = { positive: 0, neutral: 0, negative: 0 };
  arr.forEach((r) => c[sent(r)]++);
  return { ...c, total: arr.length };
}

// Điểm sức khỏe thương hiệu 0-100, tính được tại một thời điểm bất kỳ để so sánh kỳ trước
export function healthScore(bd, brand, asOf = Date.now()) {
  const all = bd.reviews.filter((r) => ts(r) <= asOf);
  const self = all.filter((r) => r.entity === 'self');
  const r90 = self.filter((r) => ts(r) > asOf - 90 * DAY);
  const r30 = r90.filter((r) => ts(r) > asOf - 30 * DAY);
  if (r90.length < 5) return { score: null, components: [], note: 'Chưa đủ dữ liệu (cần ≥ 5 review trong 90 ngày)' };

  const { avg: a } = ratingStats(r90);
  const rating = clamp(((a - 1) / 4) * 100);
  const c90 = sentimentCounts(r90);
  const sentiment = clamp(((c90.positive - c90.negative) / c90.total + 1) * 50);
  const neg30 = r30.filter((r) => sent(r) === 'negative');
  const sev30 = r30.filter((r) => r.analysis?.severity >= 2).length;
  const risk = clamp(100 - ((r30.length ? neg30.length / r30.length : 0) * 100 + sev30 * 10));

  const ids = entitiesOf(brand).map((e) => e.id);
  let share = null;
  if (ids.length > 1) {
    const vol = ids.map((id) => all.filter((r) => r.entity === id && ts(r) > asOf - 30 * DAY).length);
    const mean = avg(vol);
    share = mean ? clamp((vol[0] / mean) * 50) : 50;
  }
  const comps = [
    { key: 'rating', label: 'Điểm sao trung bình (90 ngày)', value: Math.round(rating), weight: 0.35 },
    { key: 'sentiment', label: 'Cảm xúc tích cực so với tiêu cực (90 ngày)', value: Math.round(sentiment), weight: 0.25 },
    { key: 'risk', label: 'Mức an toàn (tỷ lệ tiêu cực và nghiêm trọng, 30 ngày)', value: Math.round(risk), weight: 0.25 },
  ];
  if (share != null) comps.push({ key: 'sov', label: 'Mức độ hiện diện so với đối thủ (số review 30 ngày)', value: Math.round(share), weight: 0.15 });
  const wsum = comps.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(comps.reduce((s, c) => s + c.value * c.weight, 0) / wsum);
  return { score, components: comps.map((c) => ({ ...c, weight: +(c.weight / wsum).toFixed(2) })) };
}

export function weekly(arr, weeks = 12) {
  const now = Date.now();
  const rows = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const wk = weekStart(now - i * 7 * DAY);
    rows.push({ week: wk, positive: 0, neutral: 0, negative: 0, ratings: [] });
  }
  const idx = new Map(rows.map((r) => [r.week, r]));
  for (const r of arr) {
    const row = idx.get(weekStart(ts(r)));
    if (!row) continue;
    row[sent(r)]++;
    if (r.rating != null) row.ratings.push(r.rating);
  }
  return rows.map(({ ratings, ...x }) => ({ ...x, total: x.positive + x.neutral + x.negative, avg: ratings.length ? +avg(ratings).toFixed(2) : null }));
}

export function byBranch(arr) {
  const m = new Map();
  for (const r of arr) {
    const k = r.branch || 'Khác';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m].map(([branch, list]) => ({ branch, total: list.length, ...ratingStats(list), sentiment: sentimentCounts(list), negative: list.filter((r) => sent(r) === 'negative').length, oneStar: list.filter((r) => r.rating === 1).length }));
}

export function topicStats(arr) {
  const out = Object.entries(TOPICS).map(([id, t]) => ({ id, label: t.label, total: 0, positive: 0, neutral: 0, negative: 0 }));
  const idx = Object.fromEntries(out.map((o) => [o.id, o]));
  for (const r of arr) for (const t of r.analysis?.topics || []) if (idx[t]) {
    idx[t].total++;
    idx[t][sent(r)]++;
  }
  return out.sort((a, b) => b.negative - a.negative || b.total - a.total);
}

const STOP = new Set(('và là của có không rất để cho với này đã mình tôi em anh chị nhưng khi được các một những thì cũng ở lại đến đi như nên bị ra vào lúc trong sau trước còn làm bạn nhé nha thế mà ạ the and to a i was is it of in for my we they that this with on at but not be had have me you are as so very from were been after when than then there their them our us your by an or if do did just would could one about all also into out up more no what which who').split(' '));

export function keywordStats(arr, limit = 40) {
  const m = new Map();
  const add = (term, label) => {
    if (!m.has(term)) m.set(term, { term, count: 0, negative: 0, positive: 0 });
    const o = m.get(term);
    o.count++;
    if (label === 'negative') o.negative++;
    if (label === 'positive') o.positive++;
  };
  for (const r of arr) {
    const toks = ((r.text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
    const seen = new Set();
    toks.forEach((t, i) => {
      for (const term of [t, toks[i + 1] ? `${t} ${toks[i + 1]}` : null]) if (term && !seen.has(term)) {
        seen.add(term);
        add(term, sent(r));
      }
    });
  }
  return [...m.values()].filter((o) => o.count >= 2).sort((a, b) => b.count - a.count || b.negative - a.negative).slice(0, limit);
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function entityOfUrl(url, brand) {
  const h = hostOf(url);
  if (!h) return 'other';
  const match = (domains) => (domains || []).some((d) => h === d || h.endsWith('.' + d));
  if (match(brand.domains) || h === `${brand.id}.example`) return 'self';
  const c = brand.competitors.find((x) => match(x.domains) || h === `${x.id}.example`);
  return c ? c.id : 'other';
}

// Tên nhận diện khi so khớp nội dung: "aliases" trong brands.json, nếu không có thì lấy tên (phần trước dấu " - ")
const namesOf = (e) => (e.aliases && e.aliases.length ? e.aliases : [String(e.name || '').split(' - ')[0]]).map(fold).filter((n) => n.length >= 3);
const mentions = (text, names) => names.some((n) => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text));

// Kết quả Google thuộc về ai: 1) theo domain website  2) theo tên thương hiệu xuất hiện trong tiêu đề/đoạn trích/link
// (bài báo nói về thương hiệu trên VnExpress, Thanh Niên… cũng được tính là hiện diện của thương hiệu đó)
export function entityOfItem(item, brand) {
  const byUrl = entityOfUrl(item.url, brand);
  if (byUrl !== 'other') return byUrl;
  const text = fold(`${item.title || ''} ${item.snippet || ''} ${String(item.url || '').replace(/[-_/.]+/g, ' ')}`);
  if (mentions(text, namesOf(brand))) return 'self';
  const c = brand.competitors.find((x) => mentions(text, namesOf(x)));
  return c ? c.id : 'other';
}

// Share of Voice tìm kiếm: mỗi vị trí 1..10 có trọng số (11-vị trí), cộng theo thực thể
export function searchSov(bd, brand) {
  const ents = [...entitiesOf(brand), { id: 'other', name: 'Nguồn khác' }];
  const calc = (source) => {
    const items = bd.serp.items.filter((i) => i.source === source);
    const w = Object.fromEntries(ents.map((e) => [e.id, 0]));
    let tot = 0;
    for (const i of items) {
      const weight = Math.max(0, 11 - (i.position || 10));
      w[entityOfItem(i, brand)] += weight;
      tot += weight;
    }
    return { items: items.length, shares: ents.map((e) => ({ id: e.id, name: e.name, share: tot ? +(w[e.id] / tot).toFixed(3) : 0 })) };
  };
  return { at: bd.serp.at, web: calc('google_search'), news: calc('google_news') };
}

export function competitorTable(bd, brand) {
  const now = Date.now();
  return entitiesOf(brand).map((e) => {
    const list = bd.reviews.filter((r) => r.entity === e.id);
    const l30 = within(list, now - 30 * DAY, now);
    const p30 = within(list, now - 60 * DAY, now - 30 * DAY);
    const place = Object.entries(bd.places).filter(([k]) => k.startsWith(e.id + '|')).map(([, v]) => v);
    const gTotal = place.reduce((s, p) => s + (p.rating ? p.reviews || 0 : 0), 0);
    return {
      id: e.id,
      name: e.name,
      avg90: ratingStats(within(list, now - 90 * DAY, now)).avg,
      vol30: l30.length,
      volPrev30: p30.length,
      negShare30: l30.length ? +(l30.filter((r) => sent(r) === 'negative').length / l30.length).toFixed(3) : null,
      googleTotal: place.reduce((s, p) => s + (p.reviews || 0), 0) || null,
      // Điểm Google bình quân gia quyền theo số review của các địa điểm
      googleRating: gTotal ? +(place.reduce((s, p) => s + (p.rating || 0) * (p.reviews || 0), 0) / gTotal).toFixed(2) : null,
    };
  });
}

// Snapshot gần nhất cách đây ít nhất `days` ngày (để so sánh ▲▼), null nếu chưa có lịch sử đủ xa
export function snapshotBefore(bd, days = 7) {
  const cut = dayKey(Date.now() - days * DAY);
  return [...bd.snapshots].reverse().find((s) => s.date <= cut && s.entities) || null;
}

export function overview(bd, brand, days = 30) {
  const now = Date.now();
  const self = selfReviews(bd);
  const cur = within(self, now - days * DAY, now);
  const prev = within(self, now - 2 * days * DAY, now - days * DAY);
  const health = healthScore(bd, brand, now);
  const prevHealth = healthScore(bd, brand, now - 30 * DAY);
  const placeSelf = Object.entries(bd.places).filter(([k]) => k.startsWith('self|')).map(([, v]) => v);
  const gTotal = placeSelf.reduce((s, p) => s + (p.reviews || 0), 0);
  const gAvg = gTotal ? placeSelf.reduce((s, p) => s + (p.rating || 0) * (p.reviews || 0), 0) / gTotal : null;
  const neg = cur.filter((r) => sent(r) === 'negative');
  return {
    days,
    kpi: {
      reviews: cur.length,
      reviewsPrev: prev.length,
      avgRating: ratingStats(cur).avg,
      avgRatingPrev: ratingStats(prev).avg,
      negative: neg.length,
      negativePrev: prev.filter((r) => sent(r) === 'negative').length,
      negShare: cur.length ? +(neg.length / cur.length).toFixed(3) : null,
      oneStar: cur.filter((r) => r.rating === 1).length,
      googleTotal: gTotal || null,
      googleAvg: gAvg ? +gAvg.toFixed(2) : null,
    },
    health: { ...health, prev: prevHealth.score, delta: health.score != null && prevHealth.score != null ? health.score - prevHealth.score : null },
    dist: ratingStats(cur).dist,
    sentiment: sentimentCounts(cur),
    weekly: weekly(self, 12),
    branches: byBranch(cur),
    latestNegative: neg.sort((a, b) => ts(b) - ts(a)).slice(0, 5),
  };
}

// Sắp xếp danh sách review; cùng mức sao thì review mới hơn lên trước
const REVIEW_SORTS = {
  newest: (a, b) => ts(b) - ts(a),
  low: (a, b) => (a.rating ?? 6) - (b.rating ?? 6) || ts(b) - ts(a),
  high: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || ts(b) - ts(a),
};

export function listReviews(bd, q) {
  let list = bd.reviews;
  if (q.entity) list = list.filter((r) => r.entity === q.entity);
  if (q.stars) list = list.filter((r) => r.rating === +q.stars);
  if (q.branch) list = list.filter((r) => (r.branch || 'Khác') === q.branch);
  if (q.sentiment) list = list.filter((r) => sent(r) === q.sentiment);
  if (q.topic) list = list.filter((r) => r.analysis?.topics?.includes(q.topic));
  if (q.days) list = list.filter((r) => ts(r) >= Date.now() - +q.days * DAY);
  if (q.q) {
    const f = fold(q.q);
    list = list.filter((r) => fold(r.text + ' ' + r.author).includes(f));
  }
  list = [...list].sort(REVIEW_SORTS[q.sort] || REVIEW_SORTS.newest);
  const total = list.length;
  const off = +q.offset || 0;
  return { total, items: list.slice(off, off + (+q.limit || 20)) };
}

export function dailyNegatives(bd, days = 30) {
  const m = new Map();
  for (let i = days - 1; i >= 0; i--) m.set(dayKey(Date.now() - i * DAY), 0);
  for (const r of selfReviews(bd)) if (sent(r) === 'negative' && m.has(dayKey(ts(r)))) m.set(dayKey(ts(r)), m.get(dayKey(ts(r))) + 1);
  return [...m].map(([date, negative]) => ({ date, negative }));
}
