import { config } from './config.js';
import { fold, detectLang } from './util.js';

// Nhóm chủ đề dùng cho clinic / thẩm mỹ / nha khoa / spa
export const TOPICS = {
  staff: {
    label: 'Thái độ nhân viên / tư vấn',
    kw: ['nhan vien', 'nv', 'nvien', 'le tan', 'cskh', 'tu van', 'tu van vien', 'thai do', 'phuc vu', 'nhiet tinh', 'tan tinh', 'tan tam', 'chu dao', 'than thien', 'de thuong', 'dth', 'vui ve', 'take care', 'cong can', 'khong nghe may', 'khong ai nghe', 'staff', 'receptionist', 'rude', 'manager', 'customer service', 'ignored', 'ignores', 'whatsapp', 'zalo', 'менеджер'],
  },
  doctor: {
    label: 'Bác sĩ / KTV / tay nghề',
    kw: ['bac si', 'bs', 'doctor', 'dentist', 'tay nghe', 'kinh nghiem', 'chuyen mon', 'trinh do', 'non tre', 'certificate', 'license', 'врач', 'ky thuat vien', 'ktv', 'technician'],
  },
  treatment: {
    label: 'Dịch vụ / liệu trình cụ thể',
    kw: ['lieu trinh', 'triet', 'triet long', 'laser', 'co2', 'lan kim', 'tri seo', 'seo ro', 'tri mun', 'nan mun', 'cham soc da', 'cham da', 'lam da', 'cang da', 'nep nhan', 'tre hoa', 'nang co', 'hifu', 'filler', 'botox', 'peel', 'phun moi', 'phun may', 'chan may', 'dap mask', 'massage', 'goi dau', 'tam trang', 'hair removal', 'facial'],
  },
  outcome: {
    label: 'Hiệu quả / biến chứng',
    kw: ['ket qua', 'hieu qua', 'khong hieu qua', 'cai thien', 'min da', 'deu mau', 'mo seo', 'het mun', 'khong dau', 'khong nhu mong muon', 'bien chung', 'bi sung', 'sung dau', 'nhiem trung', 'bi dau', 'dau nhuc', 'dau rat', 'pain', 'painkillers', 'infection', 'swelling', 'ruined', 'result', 'results', 'effective', 'bi hong', 'bi loi', 'болят', 'jaw'],
  },
  price: {
    label: 'Chi phí / khuyến mãi',
    kw: ['gia cao', 'gia ca', 'gia re', 'gia mem', 'gia tot', 'gia hop ly', 'chem gia', 'chi phi', 'phat sinh', 'thanh toan', 'tra gop', 'card', 'amex', 'rip off', 'chat chem', 'qua dat', 'rat dat', 'cost', 'price', 'payment', 'expensive', 'overcharge', 'bao gia', 'khuyen mai', 'uu dai', 'giam gia', 'ma giam', 'tang ma', 'voucher', 'combo'],
  },
  sales: {
    label: 'Ép mua thêm / gọi điện làm phiền',
    kw: ['upsell', 'up sale', 'upsale', 'sale them', 'ban them', 'ep mua', 'ep lam', 'ep lam them', 'ep khach', 'chao moi', 'chao ban', 'goi dien lien tuc', 'goi lien tuc', 'goi dien lam phien', 'lam phien', 'spam', 'telesale', 'pushy', 'hard sell'],
  },
  trust: {
    label: 'Uy tín / minh bạch',
    kw: ['uy tin', 'minh bach', 'hua hen', 'cam ket', 'noi mot dang', 'mot gia', 'review ao', 'danh gia ao', 'tu cho 5 sao', 'ao vl', 'lua dao', 'boc phot', 'scam', 'fake review', 'trustworthy', 'untrustworthy', 'shady', 'honest'],
  },
  refund: {
    label: 'Hoàn tiền / hợp đồng',
    kw: ['hoan tien', 'refund', 'hop dong', 'contract', 'deposit', 'dat coc', 'under the table'],
  },
  wait: {
    label: 'Lịch hẹn / chờ đợi',
    kw: ['cho doi', 'doi lau', 'cho lau', 'cho gan', 'bat cho', 'lich hen', 'dat lich', 'nhanh chong', 'wait', 'waited', 'appointment', 'late', 'booking', 'queue'],
  },
  facility: {
    label: 'Không gian / cơ sở vật chất / vệ sinh',
    kw: ['ve sinh', 'sach se', 'sach dep', 'khong gian', 'thoang mat', 'rong rai', 'yen tinh', 'rieng tu', 'am cung', 'thu gian', 'co so vat chat', 'phong kham', 'phong cho', 'may moc', 'clean', 'dirty', 'facility', 'equipment', 'spacious', 'quiet', 'parking', 'gui xe'],
  },
  aftercare: {
    label: 'Theo dõi sau điều trị',
    kw: ['theo doi', 'bao hanh', 'tai kham', 'follow up', 'follow-up', 'aftercare', 'warranty', 'hotline', 'doi ca'],
  },
};

const NEG = ['qua te', 'rat te', 'dich vu te', 'qua do', 'that vong', 'kem chat luong', 'chan nan', 'rat toi', 'dau don', 'bien chung', 'nhiem trung', 'chat chem', 'boc phot', 'khong hai long', 'khong chuyen nghiep', 'lua dao', 'scam', 'bad', 'worst', 'rude', 'rip off', 'ruined', 'avoid', 'terrible', 'untrustworthy', 'shady', 'horrible', 'disappointed', 'poor', 'awful', 'upsell', 'refuse', 'ignored', 'не рекомендую', 'болят'];
const POS = ['rat tot', 'dich vu tot', 'chat luong tot', 'tuyet voi', 'hai long', 'nhiet tinh', 'chuyen nghiep', 'rat dep', 'uy tin', 'than thien', 'nhe nhang', 'great', 'excellent', 'friendly', 'professional', 'amazing', 'love', 'best', 'recommend', 'clean', 'perfect', 'wonderful', 'helpful'];
const SEVERE = ['lua dao', 'scam', 'rip off', 'ruined', 'bien chung', 'tố cáo', 'kiện', 'boc phot', 'bao chi', 'cong an', 'police', 'untrustworth', 'shady', 'under the table', 'took money', 'nhiem trung', 'infection', 'hoan tien', 'refund', 'avoid', 'не рекомендую'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compile = (kw) => (/^[a-z0-9 \-]+$/.test(kw) ? { re: new RegExp('\\b' + esc(kw) + '\\b') } : { raw: kw });
const C = {
  neg: NEG.map(compile),
  pos: POS.map(compile),
  severe: SEVERE.map(compile),
  topics: Object.fromEntries(Object.entries(TOPICS).map(([k, t]) => [k, t.kw.map(compile)])),
};
const hit = (list, folded, lower) => list.filter((c) => (c.re ? c.re.test(folded) : lower.includes(c.raw))).length;

export function ruleAnalyze(rec) {
  const text = rec.text || '';
  const lower = text.toLowerCase();
  const folded = fold(text);
  let label;
  let score;
  if (rec.rating != null) {
    label = rec.rating <= 2 ? 'negative' : rec.rating === 3 ? 'neutral' : 'positive';
    score = (rec.rating - 3) / 2;
  } else {
    const n = hit(C.neg, folded, lower);
    const p = hit(C.pos, folded, lower);
    score = (p - n) / Math.max(1, p + n);
    label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
  }
  const topics = Object.keys(TOPICS).filter((k) => hit(C.topics[k], folded, lower) > 0);
  const sev = hit(C.severe, folded, lower);
  const severity = label === 'negative' ? 1 + (sev >= 1 ? 1 : 0) + (sev >= 2 ? 1 : 0) : 0;
  return { sentiment: label, score, topics, severity, summary: null, by: 'rule', v: RULE_VERSION };
}

// Tăng số này mỗi khi sửa TOPICS / bộ từ khóa để chạy lại bộ luật cho dữ liệu cũ
export const RULE_VERSION = 2;

// Chạy lại bộ luật cho bản ghi đã phân tích bằng luật phiên bản cũ (miễn phí, không gọi API)
export function refreshRuleAnalysis(records) {
  let n = 0;
  for (const r of records) {
    if (r.analysis?.by !== 'rule' || r.analysis.v === RULE_VERSION) continue;
    r.analysis = ruleAnalyze({ text: r.text || `${r.title} ${r.snippet || ''}`, rating: r.rating });
    n++;
  }
  return n;
}

async function llmAnalyze(items) {
  const taxonomy = Object.entries(TOPICS)
    .map(([k, t]) => `${k}: ${t.label}`)
    .join('; ');
  const prompt = `Bạn là bộ phân tích danh tiếng thương hiệu cho clinic, thẩm mỹ viện, spa, nha khoa tại Việt Nam.
Với mỗi mục (review Google hoặc kết quả tìm kiếm), trả về JSON gồm:
- id (giữ nguyên)
- sentiment: "positive" | "neutral" | "negative"
- topics: mảng id chủ đề phù hợp, chọn trong: ${taxonomy}
- severity: 0 nếu không tiêu cực; 1 phàn nàn thông thường; 2 phàn nàn nghiêm trọng (tiền bạc, thái độ, biến chứng); 3 có nguy cơ khủng hoảng truyền thông (tố lừa đảo, biến chứng sức khỏe, kiện tụng, cáo buộc có hệ thống)
- summary_vi: tóm tắt tối đa 20 từ bằng tiếng Việt (dịch nếu bản gốc là tiếng khác)
Chỉ trả về một mảng JSON hợp lệ, không giải thích.

Dữ liệu:
${JSON.stringify(items.map((i) => ({ id: i.id, rating: i.rating ?? null, text: (i.text || '').slice(0, 700) })))}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text = (j.content || []).map((c) => c.text || '').join('');
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('Claude trả về dữ liệu không phải JSON');
  return JSON.parse(m[0]);
}

const SCORE = { positive: 0.8, neutral: 0, negative: -0.8 };

// Phân tích các bản ghi chưa có analysis. Dùng Claude nếu có key, lỗi thì rơi về bộ luật.
export async function analyzeAll(records, log = () => {}) {
  refreshRuleAnalysis(records);
  const todo = records.filter((r) => !r.analysis);
  for (const r of todo) if (!r.lang) r.lang = detectLang(r.text || r.title);
  let llmOk = 0;
  if (config.anthropicKey) {
    for (let i = 0; i < todo.length; i += 15) {
      const chunk = todo.slice(i, i + 15);
      try {
        const out = await llmAnalyze(chunk);
        const map = new Map(out.map((o) => [o.id, o]));
        for (const r of chunk) {
          const o = map.get(r.id);
          if (!o || !['positive', 'neutral', 'negative'].includes(o.sentiment)) continue;
          r.analysis = {
            sentiment: o.sentiment,
            score: SCORE[o.sentiment],
            topics: (o.topics || []).filter((t) => TOPICS[t]),
            severity: o.sentiment === 'negative' ? Math.max(1, Math.min(3, +o.severity || 1)) : 0,
            summary: o.summary_vi || null,
            by: 'llm',
          };
          llmOk++;
        }
      } catch (e) {
        log(`Phân tích bằng Claude lỗi, dùng bộ luật cho lô này: ${e.message}`);
      }
    }
  }
  for (const r of todo) if (!r.analysis) r.analysis = ruleAnalyze({ text: r.text || `${r.title} ${r.snippet || ''}`, rating: r.rating });
  return { total: todo.length, llm: llmOk };
}
