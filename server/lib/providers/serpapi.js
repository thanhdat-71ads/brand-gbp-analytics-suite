import { config } from '../config.js';

const BASE = 'https://serpapi.com/search.json';

async function call(params) {
  const u = new URL(BASE);
  for (const [k, v] of Object.entries({ ...params, api_key: config.serpKey })) {
    if (v != null && v !== '') u.searchParams.set(k, v);
  }
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`SerpAPI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // "Không có kết quả" là trạng thái hợp lệ, không phải lỗi (tránh bỏ kết quả đã tốn credit và tìm lại mỗi giờ)
  if (j.error && /hasn't returned any results/i.test(j.error)) return {};
  if (j.error) throw new Error('SerpAPI: ' + j.error);
  return j;
}

// Lấy review mới nhất trước, dừng khi gặp review đã có (đồng bộ tăng dần để tiết kiệm credit)
// Phản hồi của chủ sở hữu (null nếu chưa phản hồi)
const replyOf = (r) => (r.response ? { text: r.response.extracted_snippet?.original || r.response.snippet || '', date: r.response.iso_date || null } : null);

// Trả về review mới (reviews) và trạng thái phản hồi mới nhất của review đã có trong các trang vừa lấy (seen)
export async function fetchReviews({ dataId, knownIds, maxPages }) {
  const reviews = [];
  const seen = [];
  let placeInfo = null;
  let token = null;
  for (let p = 0; p < maxPages; p++) {
    const j = await call({ engine: 'google_maps_reviews', data_id: dataId, sort_by: 'newestFirst', hl: 'vi', next_page_token: token });
    if (p === 0 && j.place_info) {
      placeInfo = { title: j.place_info.title, address: j.place_info.address, rating: j.place_info.rating, reviews: j.place_info.reviews };
    }
    let hitKnown = false;
    for (const r of j.reviews || []) {
      const id = r.review_id;
      if (!id) continue;
      if (knownIds.has(id)) {
        hitKnown = true;
        seen.push({ id, reply: replyOf(r) });
        continue;
      }
      reviews.push({
        id,
        author: r.user?.name || 'Ẩn danh',
        rating: r.rating,
        text: r.extracted_snippet?.original || r.snippet || '',
        date: r.iso_date || null,
        url: r.link || null,
        reply: replyOf(r),
      });
    }
    token = j.serpapi_pagination?.next_page_token;
    if (!token || hitKnown) break;
  }
  return { reviews, seen, placeInfo };
}

export async function fetchSearch(q) {
  const web = await call({ engine: 'google', q, gl: 'vn', hl: 'vi', google_domain: 'google.com.vn', num: 10 });
  const news = await call({ engine: 'google', q, tbm: 'nws', gl: 'vn', hl: 'vi', num: 10 });
  const organic = (web.organic_results || []).map((r, i) => ({
    position: r.position || i + 1,
    title: r.title,
    url: r.link,
    snippet: r.snippet || '',
    date: r.date || null,
    source: 'google_search',
  }));
  const newsItems = (news.news_results || []).map((r, i) => ({
    position: i + 1,
    title: r.title,
    url: r.link,
    snippet: r.snippet || '',
    date: r.iso_date || r.date || null,
    publisher: r.source?.name || r.source || null,
    source: 'google_news',
  }));
  return [...organic, ...newsItems];
}

// Dùng cho scripts/find-place.js để tìm data_id của địa điểm
export async function findPlace(q) {
  const j = await call({ engine: 'google_maps', type: 'search', q, hl: 'vi' });
  const list = j.local_results || (j.place_results ? [j.place_results] : []);
  return list.map((p) => ({ title: p.title, address: p.address, dataId: p.data_id, rating: p.rating, reviews: p.reviews }));
}
