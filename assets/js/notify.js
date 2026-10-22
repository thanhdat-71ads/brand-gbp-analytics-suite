/* =====================================================================
CheckBrand – Cảnh báo review 1–2★ (chuông rung + thông báo góc phải)
---------------------------------------------------------------------
- Chỉ báo review 1★ và 2★ của BRAND MÌNH (không báo đối thủ)
- Chuông góc trên phải: số đỏ + rung 3 nhịp, lặp lại mỗi 30 giây khi còn chưa đọc
- Toast: 1★ giữ đến khi đóng / bấm Xem; 2★ tự ẩn sau 10 giây; tối đa 3 cái
- Tự kiểm tra mỗi 60 giây + ngay khi server đồng bộ xong (chỉ đọc dữ liệu trên máy,
KHÔNG tốn lượt SerpApi)
- Review đã có từ trước khi cài: KHÔNG báo (tránh spam lần đầu)
- Tùy chọn trong menu chuông: âm báo, thông báo trình duyệt, gửi thử
Cài đặt: xem HUONG_DAN_CANH_BAO.md
===================================================================== */
    (function () {
      'use strict';

      /* ---------- Cấu hình (có thể chỉnh) ---------- */
      const CFG = {
        maxStars: 2,          // báo review từ 1★ đến mức này
        pollMs: 60000,        // tự kiểm tra mỗi 60 giây
        shakeEveryMs: 30000,  // chuông rung lại mỗi 30 giây nếu còn chưa đọc
        toastMs2: 10000,      // toast 2★ tự ẩn sau 10 giây (1★ giữ nguyên)
        maxToasts: 3,         // tối đa số toast cùng lúc
        fetchLimit: 50,       // số review mới nhất kiểm tra mỗi mức sao / brand
        keepItems: 50,        // số cảnh báo lưu trong danh sách chuông
      };

      const KEY = { seen: 'cbn-seen', items: 'cbn-items', base: 'cbn-baseline', sound: 'cbn-sound', push: 'cbn-push' };
      const store = {
        get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
      };
      const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      let seen = new Set(store.get(KEY.seen, []));
      let items = store.get(KEY.items, []);
      const baseline = store.get(KEY.base, {});
      let shakeTimer = null;
      let interacted = false;
      let checking = false;

      const saveSeen = () => store.set(KEY.seen, [...seen].slice(-3000));
      const saveItems = () => store.set(KEY.items, items);
      const unread = () => items.filter((i) => !i.read);

      /* ---------- Tiện ích hiển thị ---------- */
      function timeAgo(date) {
        const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (!isFinite(m) || m < 1) return 'vừa xong';
        if (m < 60) return m + ' phút trước';
        const h = Math.floor(m / 60);
        if (h < 24) return h + ' giờ trước';
        const d = Math.floor(h / 24);
        if (d < 7) return d + ' ngày trước';
        if (d < 30) return Math.floor(d / 7) + ' tuần trước';
        if (d < 365) return Math.floor(d / 30) + ' tháng trước';
        return Math.floor(d / 365) + ' năm trước';
      }
      // Sao vàng = số sao khách chấm, sao xám = phần còn lại (giống Google Maps)
      const starsTxt = (n) => '<span class="on">' + '★'.repeat(n) + '</span><span class="off">' + '★'.repeat(5 - n) + '</span>';
      const shortBranch = (branch, brandName) => String(branch || '').replace(new RegExp('^' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–]\\s*'), '');
      const snippet = (t, n) => { t = String(t || '').trim(); return t.length > n ? t.slice(0, n).trim() + '…' : t; };

      /* ---------- Giao diện: chuông + menu + vùng toast ---------- */
      const BELL_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>';

      function mount() {
        if (document.getElementById('cbn-bell')) return;
        const wrap = document.createElement('div');
        wrap.id = 'cbn-root';
        wrap.innerHTML =
          '<button id="cbn-bell" type="button" aria-label="Cảnh báo review" aria-haspopup="true" aria-expanded="false">' + BELL_SVG +
          '<span id="cbn-badge" hidden>0</span></button>' +
          '<div id="cbn-panel" role="dialog" aria-label="Cảnh báo review xấu" hidden>' +
          '<div class="cbn-p-head"><b>Cảnh báo review 1–2★</b><button type="button" class="cbn-link" data-cbn="readall">Đọc hết</button></div>' +
          '<div id="cbn-list"></div>' +
          '<div class="cbn-p-foot">' +
          '<label><input type="checkbox" data-cbn="sound"> Âm báo</label>' +
          '<label><input type="checkbox" data-cbn="push"> Thông báo trình duyệt</label>' +
          '<button type="button" class="cbn-link" data-cbn="test">Gửi thử</button>' +
          '</div></div>' +
          '<div id="cbn-toasts" aria-live="polite"></div>';
        document.body.appendChild(wrap);

        wrap.querySelector('[data-cbn="sound"]').checked = !!store.get(KEY.sound, false);
        wrap.querySelector('[data-cbn="push"]').checked = !!store.get(KEY.push, false) && 'Notification' in window && Notification.permission === 'granted';

        document.getElementById('cbn-bell').addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
        wrap.addEventListener('click', onClick);
        wrap.addEventListener('change', onChange);
        document.addEventListener('click', (e) => { if (!e.target.closest('#cbn-root')) togglePanel(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') togglePanel(false); });
        ['click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { interacted = true; }, { once: true }));
      }

      function togglePanel(force) {
        const p = document.getElementById('cbn-panel');
        const open = force === undefined ? p.hidden : force;
        p.hidden = !open;
        document.getElementById('cbn-bell').setAttribute('aria-expanded', String(open));
        if (open) renderList();
      }

      function renderBell() {
        const n = unread().length;
        const badge = document.getElementById('cbn-badge');
        const bell = document.getElementById('cbn-bell');
        if (!badge) return;
        badge.hidden = n === 0;
        badge.textContent = n > 9 ? '9+' : String(n);
        bell.classList.toggle('has-unread', n > 0);
        bell.title = n ? n + ' review xấu chưa xem' : 'Không có review xấu mới';
        if (n > 0 && !shakeTimer) shakeTimer = setInterval(shake, CFG.shakeEveryMs);
        if (n === 0 && shakeTimer) { clearInterval(shakeTimer); shakeTimer = null; }
        if (!document.getElementById('cbn-panel').hidden) renderList();
      }

      function renderList() {
        const box = document.getElementById('cbn-list');
        if (!items.length) { box.innerHTML = '<div class="cbn-empty">Chưa có review xấu mới</div>'; return; }
        box.innerHTML = items.map((it) =>
          '<div class="cbn-item ' + (it.read ? '' : 'unread') + '" data-cbn="open" data-id="' + esc(it.id) + '">' +
          '<div class="cbn-i-top"><span class="cbn-stars r' + it.rating + '">' + starsTxt(it.rating) + '</span>' +
          '<span class="cbn-brand"><i style="background:' + esc(it.color) + '"></i>' + esc(it.brandName) + '</span>' +
          '<span class="cbn-time">' + timeAgo(it.date) + '</span></div>' +
          '<div class="cbn-i-branch">' + esc(it.branchShort) + ' · ' + esc(it.author) + '</div>' +
          '<div class="cbn-i-text">' + esc(snippet(it.text, 90) || 'Chỉ đánh giá sao, không có nội dung') + '</div></div>'
        ).join('');
      }

      function shake() {
        const bell = document.getElementById('cbn-bell');
        if (!bell || !unread().length) return;
        bell.classList.remove('cbn-shake');
        void bell.offsetWidth; // khởi động lại hiệu ứng
        bell.classList.add('cbn-shake');
      }

      /* ---------- Toast ---------- */
      function showToast(it) {
        const box = document.getElementById('cbn-toasts');
        const t = document.createElement('div');
        t.className = 'cbn-toast r' + it.rating;
        t.dataset.id = it.id;
        t.innerHTML =
          '<div class="cbn-t-top"><span class="cbn-stars r' + it.rating + '">' + starsTxt(it.rating) + '</span>' +
          '<b>Review ' + it.rating + ' sao mới</b><button type="button" class="cbn-x" data-cbn="close" aria-label="Đóng">✕</button></div>' +
          '<div class="cbn-t-brand"><i style="background:' + esc(it.color) + '"></i>' + esc(it.brandName) + ' · ' + esc(it.branchShort) + '</div>' +
          '<div class="cbn-t-text">' + (it.text ? '“' + esc(snippet(it.text, 110)) + '”' : '<span class="cbn-muted">Chỉ đánh giá sao, không có nội dung</span>') + '</div>' +
          '<div class="cbn-t-foot"><span class="cbn-muted">' + esc(it.author) + ' · ' + timeAgo(it.date) + '</span>' +
          '<button type="button" class="cbn-view" data-cbn="open" data-id="' + esc(it.id) + '">Xem →</button></div>';
        box.prepend(t);
        while (box.children.length > CFG.maxToasts) box.lastElementChild.remove();
        if (it.rating > 1) setTimeout(() => closeToast(t), CFG.toastMs2);
      }

      function showSummaryToast(n) {
        const box = document.getElementById('cbn-toasts');
        const t = document.createElement('div');
        t.className = 'cbn-toast cbn-sum';
        t.innerHTML = '<div class="cbn-t-top"><b>+' + n + ' review xấu mới khác</b><button type="button" class="cbn-x" data-cbn="close" aria-label="Đóng">✕</button></div>' +
          '<div class="cbn-t-foot"><span class="cbn-muted">Bấm chuông để xem tất cả</span><button type="button" class="cbn-view" data-cbn="openpanel">Mở danh sách</button></div>';
        box.append(t);
      }

      function closeToast(t) {
        if (!t || !t.isConnected) return;
        t.classList.add('cbn-out');
        setTimeout(() => t.remove(), 250);
      }

      /* ---------- Âm báo & thông báo trình duyệt ---------- */
      function ting() {
        if (!store.get(KEY.sound, false) || !interacted) return;
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          const ctx = new Ctx();
          [880, 1320].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            const t0 = ctx.currentTime + i * 0.14;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
            o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.4);
          });
          setTimeout(() => ctx.close(), 1000);
        } catch (e) { /* bỏ qua */ }
      }

      function browserNotify(it) {
        if (!store.get(KEY.push, false) || !('Notification' in window) || Notification.permission !== 'granted') return;
        if (!document.hidden) return; // đang xem dashboard thì đã có toast
        try {
          const n = new Notification('Review ' + it.rating + '★ mới – ' + it.brandName, {
            body: it.branchShort + '\n' + (snippet(it.text, 120) || 'Chỉ đánh giá sao'),
            tag: it.id,
          });
          n.onclick = () => { window.focus(); openReview(it.id); n.close(); };
        } catch (e) { /* bỏ qua */ }
      }

      /* ---------- Thông báo khi có review mới ---------- */
      function announce(fresh) {
        // Nhiều hơn 3 review: hiện 2 toast + 1 toast gộp "+N review xấu mới khác"
        const shown = fresh.length > CFG.maxToasts ? fresh.slice(0, CFG.maxToasts - 1) : fresh;
        shown.slice().reverse().forEach(showToast); // review nặng nhất nằm trên cùng
        const extra = fresh.length - shown.length;
        if (extra > 0) showSummaryToast(extra);
        renderBell();
        shake();
        ting();
        fresh.forEach(browserNotify);
      }

      /* ---------- Đánh dấu đã đọc & mở review ---------- */
      function markRead(id) {
        items.forEach((i) => { if (!id || i.id === id) i.read = true; });
        saveItems();
        document.querySelectorAll('.cbn-toast').forEach((t) => { if (!id || t.dataset.id === id) closeToast(t); });
        renderBell();
      }

      // Dùng hàm của app.js: chuyển đúng brand, lọc đúng mức sao, tự tải thêm trang tới khi thấy review (theo id)
      async function openReview(id) {
        const it = items.find((i) => i.id === id);
        if (!it) return;
        markRead(id);
        togglePanel(false);
        if (it.test) { location.hash = 'reviews'; return; }
        if (!window.CB || !window.CB.showReview) { location.hash = 'reviews'; return; }
        const el = await window.CB.showReview({ brandId: it.brandId, rating: it.rating, id: it.id });
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('cbn-flash');
        await sleep(3000);
        el.classList.remove('cbn-flash');
      }

      /* ---------- Sự kiện trong chuông / toast ---------- */
      function onClick(e) {
        const el = e.target.closest('[data-cbn]');
        if (!el) return;
        const act = el.dataset.cbn;
        if (act === 'open') { e.stopPropagation(); openReview(el.dataset.id); }
        else if (act === 'close') closeToast(el.closest('.cbn-toast'));
        else if (act === 'readall') markRead();
        else if (act === 'openpanel') { e.stopPropagation(); closeToast(el.closest('.cbn-toast')); togglePanel(true); }
        else if (act === 'test') { e.stopPropagation(); test(); }
      }

      async function onChange(e) {
        const el = e.target.closest('[data-cbn]');
        if (!el) return;
        if (el.dataset.cbn === 'sound') { store.set(KEY.sound, el.checked); interacted = true; if (el.checked) ting(); }
        if (el.dataset.cbn === 'push') {
          if (el.checked) {
            if (!('Notification' in window)) { el.checked = false; alert('Trình duyệt này không hỗ trợ thông báo.'); return; }
            const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
            el.checked = p === 'granted';
            if (p !== 'granted') alert('Bạn cần bấm "Cho phép" thông báo cho trang này trong Chrome.');
          }
          store.set(KEY.push, el.checked);
        }
      }

      /* ---------- Lấy dữ liệu ---------- */
      async function getJSON(url) {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }

      function toItem(r, b) {
        return {
          id: r.id, brandId: b.id, brandName: b.name, color: b.color || '#888',
          branch: r.branch || '', branchShort: shortBranch(r.branch, b.name) || r.branch || '',
          author: r.author || 'Ẩn danh', rating: Number(r.rating), text: r.text || '',
          date: r.date || r.fetchedAt || new Date().toISOString(), url: r.url || '', read: false,
        };
      }

      async function check() {
        if (checking) return;
        checking = true;
        try {
          const cfg = await getJSON('/api/config');
          const fresh = [];
          for (const b of cfg.brands || []) {
            const list = [];
            let ok = true;
            for (let s = 1; s <= CFG.maxStars; s++) {
              try {
                const d = await getJSON('/api/' + encodeURIComponent(b.id) + '/reviews?limit=' + CFG.fetchLimit + '&stars=' + s);
                list.push(...(d.items || []));
              } catch (e) { ok = false; }
            }
            if (!ok) continue; // lỗi mạng: lần sau kiểm tra lại, không đánh dấu gì
            const own = list.filter((r) => (r.entity == null || r.entity === 'self') && Number(r.rating) >= 1 && Number(r.rating) <= CFG.maxStars);
            if (!baseline[b.id]) { // lần đầu gặp brand này: ghi nhận review cũ, không báo
              own.forEach((r) => seen.add(r.id));
              baseline[b.id] = true;
              continue;
            }
            own.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); fresh.push(toItem(r, b)); } });
          }
          store.set(KEY.base, baseline);
          saveSeen();
          if (fresh.length) {
            fresh.sort((a, b) => a.rating - b.rating || new Date(b.date) - new Date(a.date)); // 1★ lên trước
            items = fresh.concat(items).slice(0, CFG.keepItems);
            saveItems();
            announce(fresh);
          } else {
            renderBell();
          }
        } catch (e) {
          /* server chưa chạy hoặc lỗi mạng: thử lại lần sau */
        } finally {
          checking = false;
        }
      }

      /* ---------- Gửi thử (để kiểm tra giao diện) ---------- */
      async function test(rating) {
        let b = { id: 'test', name: 'Brand thử', color: '#1a73e8' };
        try { const cfg = await getJSON('/api/config'); if (cfg.brands && cfg.brands[0]) b = cfg.brands[0]; } catch (e) { /* bỏ qua */ }
        const it = toItem({
          id: 'test-' + Date.now(), branch: b.name + ' - Chi nhánh thử', author: 'Khách hàng thử',
          rating: rating || 1, text: 'Đây là cảnh báo THỬ để kiểm tra chuông và thông báo. Bấm Xem hoặc ✕ để tắt.',
          date: new Date().toISOString(),
        }, b);
        it.test = true;
        items = [it].concat(items).slice(0, CFG.keepItems);
        saveItems();
        interacted = true;
        announce([it]);
      }

      /* ---------- Khởi động ---------- */
      function start() {
        mount();
        renderBell();
        check();
        setInterval(check, CFG.pollMs);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
        try {
          if (typeof RUNTIME_MODE === 'undefined' || RUNTIME_MODE !== 'snapshot') {
            const es = new EventSource('/api/stream');
            es.addEventListener('sync', () => setTimeout(check, 1500));
          }
        } catch (e) { /* đã có kiểm tra định kỳ */ }
        if (unread().length) setTimeout(shake, 800);
      }

      window.CBNotify = {
        test, check,
        reset() { ['seen', 'items', 'base'].forEach((k) => localStorage.removeItem(KEY[k])); location.reload(); },
      };

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    })();
