export const DAY = 864e5;

// Bỏ dấu tiếng Việt để so khớp từ khóa kể cả khi khách gõ không dấu
export const fold = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const VI_NODIAC = /\b(khong|nhan vien|rat|bac si|cua|duoc|cho|va|toi|minh|dich vu|tu van)\b/;

export function detectLang(text) {
  const t = text || '';
  if (/[Ѐ-ӿ]/.test(t)) return 'ru';
  if (/[一-鿿]/.test(t)) return 'zh';
  if (/[가-힯]/.test(t)) return 'ko';
  if (VI_CHARS.test(t)) return 'vi';
  if (VI_NODIAC.test(fold(t))) return 'vi';
  return 'en';
}

export function weekStart(ts) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7; // Thứ 2 = 0
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - day * DAY).toISOString().slice(0, 10);
}

export const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
export const ts = (r) => Date.parse(r.date) || 0;
