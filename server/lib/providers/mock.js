// Dữ liệu MẪU để chạy giao diện khi chưa có SERPAPI_KEY. Tác giả, nội dung và URL đều là giả lập.
import { DAY, hash } from '../util.js';

function rng(seedStr) {
  let a = parseInt(hash(seedStr), 36) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const AUTHORS = ['Nguyễn Thu Hà', 'Trần Minh Anh', 'Lê Hoài Nam', 'Phạm Ngọc Lan', 'Võ Thanh Tùng', 'Đặng Mỹ Linh', 'Bùi Quốc Huy', 'Hoàng Kim Ngân', 'Sarah M.', 'David K.', 'Anna P.', 'Olga S.', 'Min-jun Kim'];
const POS_VI = [
  'Nhân viên tư vấn nhiệt tình, bác sĩ làm rất nhẹ tay, mình rất hài lòng.',
  'Cơ sở sạch sẽ, quy trình chuyên nghiệp, sẽ quay lại lần sau.',
  'Làm xong thấy cải thiện rõ, bác sĩ theo dõi ca kỹ lắm.',
  'Giá hợp lý, tư vấn không ép làm thêm dịch vụ.',
  'Lễ tân dễ thương, đặt lịch nhanh, không phải chờ lâu.',
];
const POS_EN = ['Friendly staff and a very professional doctor. Highly recommend.', 'Clean clinic, great service, the result exceeded my expectations.'];
const NEU_VI = ['Dịch vụ ổn, nhưng phải chờ hơi lâu so với giờ hẹn.', 'Tạm được, giá hơi cao so với mặt bằng chung.'];
const NEG_VI = [
  'Tư vấn viên ép làm thêm liệu trình, giá cao hơn báo ban đầu.',
  'Chờ gần 2 tiếng dù đã đặt lịch trước, nhân viên thái độ khó chịu.',
  'Sau điều trị bị sưng đau mà không ai theo dõi, gọi hotline không nghe máy.',
  'Tư vấn một đằng làm một nẻo, chi phí phát sinh nhiều.',
];
const NEG_EN = ['They tried to upsell me constantly, felt like a rip off.', 'Waited over an hour past my appointment and nobody apologised.'];
const DUP = "Bad service untrustworthy people, I won't come here next time";

function reviewFor(r, id, daysAgo, pPos) {
  const x = r();
  let rating;
  let text;
  if (x < pPos) {
    rating = r() < 0.7 ? 5 : 4;
    text = r() < 0.2 ? pick(r, POS_EN) : r() < 0.15 ? '' : pick(r, POS_VI);
  } else if (x < pPos + 0.08) {
    rating = 3;
    text = pick(r, NEU_VI);
  } else {
    rating = r() < 0.6 ? 1 : 2;
    text = r() < 0.25 ? pick(r, NEG_EN) : pick(r, NEG_VI);
  }
  return {
    id,
    author: pick(r, AUTHORS),
    rating,
    text,
    date: new Date(Date.now() - daysAgo * DAY - Math.floor(r() * DAY)).toISOString(),
    url: null,
  };
}

export function mockReviews({ brandId, entityId, branchName, crisisDemo }) {
  const key = `${brandId}|${entityId}|${branchName}`;
  const r = rng(key);
  const isSelf = entityId === 'self';
  const pPos = isSelf ? 0.74 : 0.6 + r() * 0.2;
  const n = isSelf ? 70 : 45;
  const out = [];
  for (let i = 0; i < n; i++) out.push(reviewFor(r, `m-${hash(key)}-${i}`, 1 + (i / n) * 170 + r() * 3, pPos));

  // Review "trực tiếp": cứ mỗi 3 giờ trong ngày có thể có 1 review mới (id ổn định để demo cập nhật realtime)
  const now = Date.now();
  const midnight = new Date().setHours(0, 0, 0, 0);
  for (let slot = 0; midnight + slot * 3 * 3600e3 <= now; slot++) {
    const rs = rng(`${key}|live|${new Date(midnight).toDateString()}|${slot}`);
    if (rs() < (isSelf ? 0.55 : 0.35)) {
      const rv = reviewFor(rs, `m-${hash(key)}-live-${midnight}-${slot}`, 0, pPos);
      rv.date = new Date(midnight + slot * 3 * 3600e3 + 600e3).toISOString();
      out.push(rv);
    }
  }

  // Cụm review tiêu cực gần đây để minh họa cảnh báo khủng hoảng (chỉ brand mình, chi nhánh đầu tiên)
  if (isSelf && crisisDemo) {
    const mk = (id, author, rating, text, daysAgo) => ({ id: `m-crisis-${id}`, author, rating, text, date: new Date(Date.now() - daysAgo * DAY).toISOString(), url: null });
    out.push(
      mk(1, 'Tester Một', 1, DUP, 2.2),
      mk(2, 'Tester Hai', 1, DUP, 2.1),
      mk(3, 'Tester Ba', 1, 'Đặt cọc rồi muốn hoàn tiền thì bị từ chối, không có hợp đồng rõ ràng. Cẩn thận lừa đảo.', 1.4),
      mk(4, 'Tester Bốn', 1, 'Sau khi làm bị sưng, nhiễm trùng, nhân viên không theo dõi ca, gọi hotline không ai nghe.', 0.6),
    );
  }
  return { reviews: out, placeInfo: { title: branchName, rating: +(3.6 + r() * 1.2).toFixed(1), reviews: out.length + Math.floor(r() * 300) } };
}

const OTHER = ['webtretho.com', 'vnexpress.net', 'tuoitre.vn', 'afamily.vn', 'lamdep.vn', 'hellobacsi.com', 'youtube.com', 'facebook.com', 'tiktok.com', 'yeah1.com'];

export function mockSearch(brand, keyword) {
  const r = rng(`${brand.id}|${keyword}|${new Date().toDateString()}`);
  const pool = [...(brand.domains.length ? brand.domains : [`${brand.id}.example`]), ...brand.competitors.flatMap((c) => (c.domains.length ? c.domains : [`${c.id}.example`])), ...OTHER];
  const mk = (source, n) =>
    Array.from({ length: n }, (_, i) => {
      const domain = r() < 0.28 ? pool[Math.floor(r() * (brand.domains.length ? 1 : 1))] : pick(r, pool);
      return {
        position: i + 1,
        title: `[MẪU] ${keyword} - kết quả ${i + 1}`,
        url: `https://${domain}/mau/${hash(keyword + i + source)}`,
        snippet: pick(r, ['Địa chỉ uy tín, tư vấn miễn phí, nhiều ưu đãi.', 'Review chi tiết sau khi trải nghiệm dịch vụ, có ưu và nhược điểm.', 'Bảng giá tham khảo và quy trình thực hiện.', 'Khách hàng phản ánh về thái độ phục vụ và chi phí phát sinh.']),
        date: new Date(Date.now() - Math.floor(r() * 30) * DAY).toISOString(),
        source,
        publisher: source === 'google_news' ? pick(r, ['VnExpress', 'Tuổi Trẻ', 'Afamily']) : null,
      };
    });
  return [...mk('google_search', 10), ...mk('google_news', 5)];
}
