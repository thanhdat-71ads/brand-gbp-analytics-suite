import { config, providerMode, getBrand, loadBrands } from './config.js';
import { brandData, resetBrand, save } from './store.js';
import { analyzeAll } from './analysis.js';
import { evaluate } from './crisis.js';
import { healthScore, ratingStats, entitiesOf, searchSov, selfReviews, competitorTable } from './metrics.js';
import { mockReviews, mockSearch } from './providers/mock.js';
import * as serp from './providers/serpapi.js';
import { DAY, dayKey, detectLang, hash, ts } from './util.js';

export const listeners = new Set();
export function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of listeners) res.write(msg);
}

const running = new Set();

export async function syncBrand(brandId, { forceSearch = false, forceCompetitors = false, recheckReplies = false } = {}) {
  const brand = getBrand(brandId);
  if (!brand) throw new Error('Brand không tồn tại: ' + brandId);
  if (running.has(brandId)) return { skipped: 'đang đồng bộ' };
  running.add(brandId);
  const started = Date.now();
  const logs = [];
  const log = (m) => logs.push(m);
  try {
    const mode = providerMode();
    let bd = brandData(brandId);
    if (bd.mode && bd.mode !== mode) {
      log(`Đổi chế độ ${bd.mode} → ${mode}: xóa dữ liệu cũ để không trộn dữ liệu mẫu với dữ liệu thật`);
      bd = resetBrand(brandId);
    }
    bd.mode = mode;
    const known = new Set(bd.reviews.map((r) => r.id));
    const byId = new Map(bd.reviews.map((r) => [r.id, r]));
    let added = 0;

    // Đối thủ cập nhật thưa hơn (COMPETITOR_SYNC_DAYS) để tiết kiệm credit
    if (bd.lastCompetitorSync === undefined) bd.lastCompetitorSync = bd.reviews.some((r) => r.entity !== 'self') ? bd.lastSync : null;
    const competitorsDue = forceCompetitors || !bd.lastCompetitorSync || Date.now() - Date.parse(bd.lastCompetitorSync) > config.competitorDays * DAY;

    const entities = [
      { id: 'self', name: brand.name, branches: brand.branches },
      ...(competitorsDue ? brand.competitors.map((c) => ({ id: c.id, name: c.name, branches: [{ name: c.name, dataId: c.dataId }] })) : []),
    ];

    for (const ent of entities) {
      for (const [bi, br] of ent.branches.entries()) {
        // Lần đầu của từng chi nhánh/đối thủ lấy nhiều trang hơn
        const first = !bd.reviews.some((r) => r.entity === ent.id && r.branch === br.name);
        try {
          let res;
          if (mode === 'mock') {
            res = mockReviews({ brandId, entityId: ent.id, branchName: br.name, crisisDemo: ent.id === 'self' && bi === 0 });
          } else {
            if (!br.dataId) {
              log(`Bỏ qua "${br.name}": chưa có dataId (chạy npm run find-place để lấy)`);
              continue;
            }
            const knownForBranch = new Set([...known].filter((id) => id.startsWith(`${ent.id}|${br.dataId}|`)));
            const strip = new Set([...knownForBranch].map((id) => id.split('|')[2]));
            const recheck = recheckReplies && ent.id === 'self';
            if (recheck) log(`Kiểm tra lại trạng thái phản hồi "${br.name}" (${config.pagesFirst} trang mới nhất)`);
            res = await serp.fetchReviews({ dataId: br.dataId, knownIds: strip, maxPages: first || recheck ? config.pagesFirst : config.pagesIncr, fullScan: recheck });
          }
          if (res.placeInfo) bd.places[`${ent.id}|${br.name}`] = { ...res.placeInfo, at: new Date().toISOString() };
          const checkedAt = mode === 'mock' ? null : new Date().toISOString();
          // Cập nhật trạng thái phản hồi của review đã có (chủ sở hữu có thể trả lời sau khi review được lấy về)
          for (const s of res.seen || []) {
            const old = byId.get(`${ent.id}|${br.dataId}|${s.id}`);
            if (old) Object.assign(old, { reply: s.reply, replyCheckedAt: checkedAt });
          }
          for (const r of res.reviews) {
            const id = `${ent.id}|${mode === 'mock' ? br.name : br.dataId}|${r.id}`;
            if (known.has(id)) continue;
            known.add(id);
            bd.reviews.push({
              id,
              brandId,
              entity: ent.id,
              branch: br.name,
              author: r.author,
              rating: r.rating,
              text: r.text || '',
              date: r.date || new Date().toISOString(),
              url: r.url,
              fetchedAt: new Date().toISOString(),
              src: mode,
              lang: detectLang(r.text),
              reply: r.reply ?? null,
              replyCheckedAt: checkedAt,
            });
            added++;
          }
        } catch (e) {
          log(`Lỗi lấy review "${br.name}": ${e.message}`);
        }
      }
    }
    if (competitorsDue && brand.competitors.length) bd.lastCompetitorSync = new Date().toISOString();

    // Google Search / News: cập nhật theo chu kỳ dài để tiết kiệm credit
    const due = forceSearch || !bd.lastSearchSync || Date.now() - Date.parse(bd.lastSearchSync) > config.searchHours * 3600e3;
    if (due && brand.keywords?.length) {
      try {
        const items = [];
        for (const kw of brand.keywords) {
          const res = mode === 'mock' ? mockSearch(brand, kw) : await serp.fetchSearch(kw);
          res.forEach((x) => items.push({ ...x, id: hash(kw + x.url + x.source), keyword: kw }));
        }
        const old = new Map(bd.serp.items.map((i) => [i.id, i.analysis]));
        items.forEach((i) => {
          if (old.get(i.id)) i.analysis = old.get(i.id);
        });
        bd.serp = { at: new Date().toISOString(), items };
        bd.lastSearchSync = bd.serp.at;
      } catch (e) {
        log(`Lỗi Google Search/News: ${e.message}`);
      }
    }

    const an = await analyzeAll([...bd.reviews, ...bd.serp.items], log);
    const newAlerts = evaluate(bd);

    // Snapshot theo ngày để vẽ xu hướng
    const hs = healthScore(bd, brand);
    const self = selfReviews(bd);
    const today = dayKey(Date.now());
    const snap = {
      date: today,
      health: hs.score,
      avgRating: ratingStats(self.filter((r) => ts(r) > Date.now() - 90 * DAY)).avg,
      reviews: self.length,
      searchSov: searchSov(bd, brand).web.shares.find((s) => s.id === 'self')?.share ?? null,
      // Lịch sử theo ngày của brand và từng đối thủ, dùng để so sánh ▲▼ với tuần trước
      entities: competitorTable(bd, brand).map(({ id, googleRating, googleTotal, avg90, vol30, negShare30 }) => ({ id, googleRating, googleTotal, avg90, vol30, negShare30 })),
    };
    const i = bd.snapshots.findIndex((s) => s.date === today);
    if (i >= 0) bd.snapshots[i] = snap;
    else bd.snapshots.push(snap);
    bd.snapshots = bd.snapshots.slice(-400);

    bd.lastSync = new Date().toISOString();
    bd.syncLog.unshift({ at: bd.lastSync, mode, added, analyzed: an.total, llm: an.llm, alerts: newAlerts.length, ms: Date.now() - started, notes: logs });
    bd.syncLog = bd.syncLog.slice(0, 50);
    save();
    broadcast('sync', { brand: brandId, added, alerts: newAlerts.length, at: bd.lastSync });
    for (const a of newAlerts) broadcast('alert', { brand: brandId, level: a.level, title: a.title, key: a.key });
    return { added, analyzed: an.total, llm: an.llm, alerts: newAlerts.length, notes: logs };
  } finally {
    running.delete(brandId);
  }
}

export const isSyncing = (id) => running.has(id);
export { entitiesOf };
