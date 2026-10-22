import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { TOPICS } from './analysis.js';
import { overview, topicStats, competitorTable, selfReviews, searchSov } from './metrics.js';
import { DAY, ts, dayKey } from './util.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (d) => new Date(d).toLocaleDateString('vi-VN');
const pct = (v) => (v == null ? '-' : Math.round(v * 100) + '%');

function recommendations(ov, topics, bd) {
  const out = [];
  const topNeg = topics.filter((t) => t.negative > 0).slice(0, 3);
  for (const t of topNeg) out.push(`Chủ đề "${t.label}" có ${t.negative} review tiêu cực trong kỳ: rà soát quy trình liên quan và phản hồi từng review.`);
  const crit = bd.alerts.filter((a) => !a.read && a.level !== 'info');
  if (crit.length) out.push(`Có ${crit.length} cảnh báo chưa xử lý: ưu tiên các cảnh báo mức critical trước.`);
  const dup = bd.alerts.find((a) => a.key.startsWith('dup:'));
  if (dup) out.push('Phát hiện nhiều tài khoản đăng cùng nội dung: lưu bằng chứng và báo cáo vi phạm chính sách nội dung trên Google Maps.');
  if (ov.kpi.negShare != null && ov.kpi.negShare > 0.2) out.push('Tỷ lệ review tiêu cực trên 20%: cân nhắc chiến dịch thu thập review tích cực từ khách hàng hài lòng sau điều trị (đúng chính sách Google, không mua/đền bù review).');
  if (!out.length) out.push('Chưa có tín hiệu rủi ro đáng chú ý trong kỳ. Duy trì theo dõi hằng tuần.');
  return out;
}

export function buildReport(brand, bd, days = 7) {
  const ov = overview(bd, brand, days);
  const cur = selfReviews(bd).filter((r) => ts(r) > Date.now() - days * DAY);
  const topics = topicStats(cur);
  const comp = competitorTable(bd, brand);
  const sov = searchSov(bd, brand);
  const neg = cur.filter((r) => r.analysis?.sentiment === 'negative').sort((a, b) => (b.analysis.severity - a.analysis.severity) || (ts(b) - ts(a))).slice(0, 10);
  const d = (v, p) => (v == null || p == null ? '' : v - p >= 0 ? ` (+${+(v - p).toFixed(2)})` : ` (${+(v - p).toFixed(2)})`);
  const mockNote = bd.mode === 'mock' ? '<p class="warn">Báo cáo này dùng DỮ LIỆU MẪU, không phản ánh thực tế.</p>' : '';

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo ${esc(brand.name)} ${dayKey(Date.now())}</title>
<style>body{font:14px/1.55 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 20px;color:#1b1f2a}h1{font-size:22px;margin:0}h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #e4e7ee;padding-bottom:4px}
.sub{color:#667085}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #e4e7ee;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f6f7fb}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.k{border:1px solid #e4e7ee;border-radius:8px;padding:10px}.k b{display:block;font-size:22px}.warn{background:#fff4e5;border:1px solid #f5c26b;padding:8px 10px;border-radius:6px}
@media print{body{margin:0}}</style></head><body>
<h1>Báo cáo danh tiếng thương hiệu: ${esc(brand.name)}</h1>
<div class="sub">Kỳ báo cáo: ${days} ngày gần nhất (đến ${fmt(Date.now())}) · Dữ liệu cập nhật lần cuối: ${bd.lastSync ? new Date(bd.lastSync).toLocaleString('vi-VN') : '-'}</div>
${mockNote}
<h2>Tóm tắt</h2>
<div class="kpis">
<div class="k">Brand Health Score<b>${ov.health.score ?? '-'}/100</b>${ov.health.delta != null ? `<span class="sub">${ov.health.delta >= 0 ? '+' : ''}${ov.health.delta} so với 30 ngày trước</span>` : ''}</div>
<div class="k">Review trong kỳ<b>${ov.kpi.reviews}</b><span class="sub">kỳ trước: ${ov.kpi.reviewsPrev}</span></div>
<div class="k">Điểm sao TB<b>${ov.kpi.avgRating ?? '-'}</b><span class="sub">${d(ov.kpi.avgRating, ov.kpi.avgRatingPrev)}</span></div>
<div class="k">Review tiêu cực<b>${ov.kpi.negative}</b><span class="sub">${pct(ov.kpi.negShare)} tổng review kỳ này</span></div></div>
<h2>Chủ đề được nhắc nhiều</h2>
<table><tr><th>Chủ đề</th><th>Tổng</th><th>Tích cực</th><th>Tiêu cực</th></tr>${topics.filter((t) => t.total).map((t) => `<tr><td>${esc(t.label)}</td><td>${t.total}</td><td>${t.positive}</td><td>${t.negative}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có dữ liệu</td></tr>'}</table>
<h2>Review tiêu cực cần xử lý (tối đa 10, ưu tiên mức nghiêm trọng)</h2>
<table><tr><th>Ngày</th><th>Chi nhánh</th><th>Sao</th><th>Nội dung</th></tr>${neg.map((r) => `<tr><td>${fmt(r.date)}</td><td>${esc(r.branch)}</td><td>${r.rating ?? '-'}</td><td>${esc(r.analysis.summary ? r.analysis.summary + ' | ' : '')}${esc((r.text || '').slice(0, 220))}</td></tr>`).join('') || '<tr><td colspan="4">Không có</td></tr>'}</table>
${comp.length > 1 ? `<h2>So sánh với đối thủ (30 ngày)</h2><table><tr><th>Thương hiệu</th><th>Sao TB (90 ngày)</th><th>Review 30 ngày</th><th>Tỷ lệ tiêu cực</th></tr>${comp.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.avg90 ?? '-'}</td><td>${c.vol30}</td><td>${pct(c.negShare30)}</td></tr>`).join('')}</table>` : ''}
${sov.web.items ? `<h2>Share of Voice trên Google Search (top 10)</h2><table><tr><th>Thương hiệu</th><th>Tỷ trọng</th></tr>${sov.web.shares.map((s) => `<tr><td>${esc(s.name)}</td><td>${pct(s.share)}</td></tr>`).join('')}</table>` : ''}
<h2>Đề xuất hành động</h2><ul>${recommendations(ov, topics, bd).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="sub">Brand Health Score = tổng có trọng số của: điểm sao 90 ngày, cân bằng cảm xúc 90 ngày, mức an toàn 30 ngày và mức hiện diện so với đối thủ. Công thức chi tiết nằm trong tab Tổng quan.</p>
</body></html>`;
}

export function saveReport(brand, bd, days = 7) {
  const html = buildReport(brand, bd, days);
  const name = `${brand.id}-${dayKey(Date.now())}-${days}d.html`;
  fs.writeFileSync(path.join(config.dataDir, 'reports', name), html);
  const entry = { file: name, days, createdAt: new Date().toISOString() };
  bd.reports = [entry, ...bd.reports.filter((r) => r.file !== name)].slice(0, 60);
  return entry;
}
