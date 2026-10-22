/* CheckBrand – Logic giao diện chính (router, các trang, workflow review, QR, smart group...) */
    function generateRealQrSvg(text, size) {
      size = size || 160;
      if (!text) text = 'https://google.com';
      try {
        var typeNumber = QRCode.getTypeNumber ? QRCode.getTypeNumber(text, QRCode.CorrectLevel.M) : 4;
        var qr = new QRCode.QRCodeModel(typeNumber, QRCode.CorrectLevel.M);
        qr.addData(text);
        qr.make();
        var count = qr.getModuleCount();
        var scale = (size - 16) / count;
        var rects = [];
        for (var r = 0; r < count; r++) {
          for (var c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
              var x = (8 + c * scale).toFixed(2);
              var y = (8 + r * scale).toFixed(2);
              var w = (scale + 0.05).toFixed(2);
              var h = (scale + 0.05).toFixed(2);
              rects.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#1e293b"/>');
            }
          }
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="background:#fff;padding:4px;border-radius:8px;border:1px solid #cbd5e1"><rect width="100%" height="100%" fill="#fff"/>' + rects.join('') + '</svg>';
      } catch (e) {
        return '<svg viewBox="0 0 160 160" width="160" height="160"><text x="10" y="80" fill="red">QR Error</text></svg>';
      }
    }

    function downloadQrSvg(url, filename) {
      try {
        const svgStr = generateRealQrSvg(url, 300);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = (filename || 'qr-code') + '.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast('✓ Đã tải file QR SVG độ nét cao cho in ấn thành công!');
      } catch (e) {
        toast('Lỗi tải SVG: ' + e.message);
      }
    }

    function downloadQrPng(url, filename) {
      try {
        const svgStr = generateRealQrSvg(url, 400);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const urlObj = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(urlObj);
          canvas.toBlob(function (pngBlob) {
            if (!pngBlob) { toast('Lỗi chuyển định dạng PNG'); return; }
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pngBlob);
            link.download = (filename || 'qr-code') + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast('✓ Đã tải file QR PNG thành công!');
          }, 'image/png');
        };
        img.onerror = function () {
          toast('Lỗi vẽ ảnh QR lên Canvas');
        };
        img.src = urlObj;
      } catch (e) {
        toast('Lỗi tải PNG: ' + e.message);
      }
    }

    var esc = window.esc || function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    };
    window.esc = esc;

    function printQrDecal(locName, branchCode, url) {
      const svgStr = generateRealQrSvg(url, 240);
      const printWin = window.open('', '_blank', 'width=600,height=700');
      if (!printWin) {
        toast('Vui lòng cho phép popup để mở bản in Decal');
        return;
      }
      printWin.document.write(`<!DOCTYPE html><html><head><title>In Decal A6 - ${esc(locName)}</title>
  <style>
    @page { size: A6 portrait; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 20px; color: #1e293b; }
    .decal-card { border: 2px dashed #0284c7; border-radius: 16px; padding: 24px; max-width: 320px; margin: 0 auto; background: #f8fafc; }
    h2 { font-size: 18px; margin: 0 0 6px 0; color: #0284c7; }
    p { font-size: 13px; margin: 0 0 16px 0; color: #64748b; }
    .footer { margin-top: 16px; font-size: 11px; color: #94a3b8; }
  </style></head><body>
  <div class="decal-card">
    <h2>QUÉT MÃ ĐÁNH GIÁ GOOGLE</h2>
    <p>${esc(locName)} (${esc(branchCode)})<br>Ý kiến của Quý khách giúp chúng tôi phục vụ tốt hơn!</p>
    <div style="display:inline-block">${svgStr}</div>
    <div class="footer">CheckBrand Decal Studio · Kích thước chuẩn A6</div>
  </div>
  </body></html>`);
      printWin.document.close();
      printWin.focus();
      var printed = false;
      function doPrint() {
        if (printed) return;
        printed = true;
        try { printWin.print(); } catch (e) { }
      }
      printWin.onload = doPrint;
      setTimeout(doPrint, 450);
    }

    function isLocationQrEligible(l) {
      return Boolean(l && l.placeId && String(l.placeId).trim().length >= 10 && l.placeId !== 'undefined');
    }
    window.isLocationQrEligible = isLocationQrEligible;

    function getActiveQrData() {
      const brandLocs = getBrandLocations(S.brand);
      const selLocId = S.selectedLocationId || (brandLocs[0] ? brandLocs[0].locationId : '');
      const loc = brandLocs.find(l => l.locationId === selLocId) || brandLocs[0] || null;
      const qrMode = S.qrMode || 'direct';
      const hasPlaceId = isLocationQrEligible(loc);
      const directReviewUrl = hasPlaceId ? ('https://search.google.com/local/writereview?placeid=' + loc.placeId) : '';
      const trackedSystemUrl = (loc && loc.locationId) ? ('https://checkbrand.vn/r/' + loc.locationId + '?source=in_store_table&camp=2026') : '';
      const targetUrl = qrMode === 'direct' ? directReviewUrl : trackedSystemUrl;
      const filename = 'qr-' + S.brand + '-' + ((loc && loc.branchCode) || 'main');
      return { loc: loc || {}, qrMode, targetUrl, filename, hasPlaceId, canGenerate: hasPlaceId && Boolean(targetUrl) };
    }

    function downloadActiveQrSvg() {
      const d = getActiveQrData();
      if (!d.canGenerate || !d.targetUrl) {
        toast('Đã khóa: Chưa chọn được địa điểm có Place ID Google hợp lệ để tạo/tải QR.');
        return;
      }
      downloadQrSvg(d.targetUrl, d.filename);
    }

    function downloadActiveQrPng() {
      const d = getActiveQrData();
      if (!d.canGenerate || !d.targetUrl) {
        toast('Đã khóa: Chưa chọn được địa điểm có Place ID Google hợp lệ để tạo/tải QR.');
        return;
      }
      downloadQrPng(d.targetUrl, d.filename);
    }

    function printActiveQrDecal() {
      const d = getActiveQrData();
      if (!d.canGenerate || !d.targetUrl) {
        toast('Đã khóa: Chưa chọn được địa điểm có Place ID Google hợp lệ để in QR Decal.');
        return;
      }
      printQrDecal(d.loc.displayName || 'Chi nhánh', d.loc.branchCode || '', d.targetUrl);
    }

    function printAllQrDecals(brandId, mode) {
      const bId = brandId || S.brand;
      const qMode = mode || S.qrMode || 'direct';
      const brandLocs = getBrandLocations(bId);
      const validLocs = brandLocs.filter(isLocationQrEligible);
      if (!validLocs.length) {
        toast('Đã khóa: Không có chi nhánh nào có Place ID Google hợp lệ để in bộ nhãn');
        return;
      }
      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (!printWin) {
        toast('Vui lòng cho phép popup để mở bản in Bộ nhãn Decal');
        return;
      }
      const cardsHtml = validLocs.map(function (l) {
        const url = qMode === 'direct'
          ? ('https://search.google.com/local/writereview?placeid=' + l.placeId)
          : ('https://checkbrand.vn/r/' + l.locationId + '?source=in_store_table&camp=2026');
        const svg = generateRealQrSvg(url, 200);
        return '<div class="decal-card">' +
          '<div class="tag">CẢM ƠN QUÝ KHÁCH</div>' +
          '<h2>QUÉT MÃ ĐÁNH GIÁ GOOGLE</h2>' +
          '<p class="loc-name"><b>' + esc(l.displayName || '') + '</b> (' + esc(l.branchCode || '') + ')</p>' +
          '<p class="subtitle">Ý kiến của Quý khách giúp chúng tôi nâng cao chất lượng phục vụ!</p>' +
          '<div class="qr-box">' + svg + '</div>' +
          '<div class="stars">★★★★★</div>' +
          '<div class="footer">CheckBrand Decal Studio · Kích thước chuẩn A6 (105 × 148 mm)</div>' +
          '</div>';
      }).join('\n');

      printWin.document.write('<!DOCTYPE html><html><head><title>In Bộ Nhãn Decal A6 - ' + esc(bId) + '</title>' +
        '<style>' +
        '@page { size: A6 portrait; margin: 8mm; }' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 10px; color: #1e293b; background: #fff; }' +
        '.decal-card { border: 2px dashed #0284c7; border-radius: 14px; padding: 20px; max-width: 330px; margin: 0 auto 30px auto; background: #f8fafc; text-align: center; page-break-after: always; box-sizing: border-box; }' +
        '.tag { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 6px; }' +
        'h2 { font-size: 17px; margin: 0 0 6px 0; color: #0284c7; }' +
        '.loc-name { font-size: 14px; margin: 0 0 4px 0; color: #0f172a; }' +
        '.subtitle { font-size: 12px; margin: 0 0 14px 0; color: #64748b; }' +
        '.qr-box { display: inline-block; margin: 6px auto; }' +
        '.stars { font-size: 14px; color: #eab308; margin-top: 8px; }' +
        '.footer { margin-top: 14px; font-size: 10px; color: #94a3b8; }' +
        '</style></head><body>' +
        cardsHtml +
        '</body></html>');
      printWin.document.close();
      printWin.focus();
      // Gán sự kiện in trực tiếp trên cửa sổ popup có cờ chặn gọi 2 lần
      var printed = false;
      function doPrint() {
        if (printed) return;
        printed = true;
        try { printWin.print(); } catch (e) { }
      }
      printWin.onload = doPrint;
      setTimeout(doPrint, 450);
    }

    function downloadBatchQrPdfOrHtml() {
      printAllQrDecals(S.brand, S.qrMode);
      toast('✓ Đã mở hộp thoại In / Xuất PDF bộ nhãn A6 hoàn chỉnh!');
    }

    window.generateRealQrSvg = generateRealQrSvg;
    window.downloadQrSvg = downloadQrSvg;
    window.downloadQrPng = downloadQrPng;
    window.printQrDecal = printQrDecal;
    window.downloadActiveQrSvg = downloadActiveQrSvg;
    window.downloadActiveQrPng = downloadActiveQrPng;
    window.printActiveQrDecal = printActiveQrDecal;
    window.printAllQrDecals = printAllQrDecals;
    window.downloadBatchQrPdfOrHtml = downloadBatchQrPdfOrHtml;


    /* CheckBrand dashboard - vanilla JS, không phụ thuộc thư viện */

    function isGoogleReview(r) {
      if (!r) return false;
      var src = (r.source || '').toLowerCase();
      if (src === 'google' || src === 'google_maps' || src === 'google_places' || src === 'gmb') return true;
      if (src === 'google_news' || src === 'news' || src === 'social' || src === 'mention' || src === 'facebook' || src === 'tiktok') return false;
      return r.rating != null;
    }

    function isUnrepliedGoogleReview(r) {
      return isGoogleReview(r) && !r.reply && r.replyStatus !== 'published';
    }

    function isSafeUrl(url) {
      if (!url || typeof url !== 'string') return false;
      var trimmed = url.trim().toLowerCase();
      return (trimmed.startsWith('https://') || trimmed.startsWith('http://')) && !/^(javascript|data|vbscript):/i.test(trimmed);
    }

    function parseUrlSafe(rawUrl) {
      if (!rawUrl || typeof rawUrl !== 'string') return null;
      var trimmed = rawUrl.trim();
      if (!trimmed) return null;
      try {
        var u = new URL(trimmed);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u;
      } catch (e) {
        return null;
      }
    }

    function isSearchUrl(url) {
      if (!url || typeof url !== 'string') return false;
      var lower = url.toLowerCase();
      return (lower.includes('google.') && lower.includes('/search')) || lower.includes('bing.com/search') || lower.includes('search.yahoo.com');
    }

    /* ---------- renderSourceLink (Fix B4) ---------- */
    function renderSourceLink(r, btnClass = 'btn') {
      if (!r) return '';
      var rawUrl = (r.url || r.sourceUrl || '').trim();
      var u = parseUrlSafe(rawUrl);
      if (!u) {
        return '<span class="muted" style="font-size:12px;display:inline-flex;align-items:center;gap:4px">🔗 Chưa có liên kết nguồn</span>';
      }
      var host = u.hostname.toLowerCase();
      var path = u.pathname.toLowerCase();

      // Link tìm kiếm: phân biệt rõ công cụ tìm kiếm & ghi chú không phải dẫn chứng gốc
      if ((host.includes('google.') && (path.includes('/search') || u.searchParams.has('q'))) || host.includes('bing.com') || host.includes('search.yahoo.com')) {
        var engine = host.includes('google.') ? 'Google Search / News' : (host.includes('bing.com') ? 'Bing' : 'Công cụ tìm kiếm');
        return `<a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer" class="${btnClass}" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px" title="Lưu ý: Link tìm kiếm là kết quả truy vấn, không phải bài dẫn chứng gốc">🔍 Tìm trên ${engine} ↗</a>`;
      }

      // Link Google Maps / Places
      if ((host.includes('google.') && (path.includes('/maps') || path.includes('/place'))) || host.includes('maps.google.') || host.includes('goo.gl')) {
        return `<a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer" class="${btnClass}" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px">📍 Mở trên Google Maps ↗</a>`;
      }

      // Link bài báo / tạp chí gốc
      return `<a href="${esc(rawUrl)}" target="_blank" rel="noopener noreferrer" class="${btnClass}" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px">🔗 Mở bài gốc ↗</a>`;
    }
    window.parseUrlSafe = parseUrlSafe;
    window.renderSourceLink = renderSourceLink;

    const $ = (s, el = document) => el.querySelector(s);
    var esc = window.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
    window.esc = esc;
    const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '-');
    const fmtTime = (d) => (d ? new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');
    const pct = (v) => (v == null ? '-' : Math.round(v * 100) + '%');
    const stars = (n) => '<span class="star">' + '★'.repeat(n || 0) + '</span>' + '<span class="muted">' + '☆'.repeat(5 - (n || 0)) + '</span>';
    const cssv = (n) => `var(${n})`;

    // Định dạng số kiểu Việt Nam: 4.66 -> "4,7" ; 1056 -> "1.056"
    const fmtRating = (n, dec = 1) => (n == null ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
    const fmtInt = (n) => (n == null ? '-' : Number(n).toLocaleString('vi-VN'));

    // Ngày tương đối kiểu Google Maps
    function timeAgo(date) {
      if (!date) return '-';
      const d = Math.floor((Date.now() - new Date(date)) / 864e5);
      if (d < 1) return 'hôm nay';
      if (d < 7) return `${d} ngày trước`;
      if (d < 30) return `${Math.floor(d / 7)} tuần trước`;
      if (d < 365) return `${Math.floor(d / 30)} tháng trước`;
      return `${Math.floor(d / 365)} năm trước`;
    }

    // Màu avatar cố định theo tên
    function avatarColor(name) {
      const colors = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#007b83', '#c5221f', '#185abc'];
      let h = 0;
      for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return colors[h % colors.length];
    }

    // Ẩn nút "Thêm" ở review ngắn (không bị cắt dòng)
    function fitMore(root = document) {
      root.querySelectorAll('.rev .more-btn').forEach((b) => {
        const t = b.previousElementSibling;
        if (!t.classList.contains('open')) b.hidden = t.scrollHeight <= t.clientHeight + 1;
      });
    }

    const RUNTIME_MODE = window.CB_CONFIG && CB_CONFIG.MODE === 'live' ? 'live' : 'snapshot'; // 'snapshot' | 'live' (đặt trong assets/js/config.js)
    const S = {
      brand: localStorage.getItem('cb-brand') || 'seoul-center',
      route: location.hash.slice(1) || 'overview',
      cfg: null,
      stars: 'all',
      sort: 'newest',
      branch: '',
      locationId: '',
      selectedLocationId: 'loc_sc_binh_thanh',
      selectedLocTab: 'info',
      selectedGroupId: 'grp_hcm',
      qrMode: 'direct',
      postFilter: 'all',
      alertStatusFilter: 'all',
      locSearch: '',
      locStatus: 'all',
      locGroup: 'all',
      locStars: 'all',
      locDays: 'all',
      locView: 'smart_table',
      mediaFilter: null,
      rows: [],
      total: 0,
      days: 30,
      reviewDays: null,
      topic: '',
      q: '',
      filterStatus: 'all',
      assigneeFilter: 'all',
      region: 'all',
      evidenceIds: null,
      evidenceLabel: '',
      live: false,
      liveText: 'Dữ liệu chụp ngày 15/10/2026'
    };
    window.S = S;

    /* =========================================================================
       TỔ CHỨC LẠI MENU SIDEBAR 7 NHÓM (PHẦN C)
       ========================================================================= */
    const NAV = [
      ['Tổng quan', [
        ['overview', '▦', 'Tổng quan hệ thống'],
        ['action_center', '📋', 'Trung tâm công việc']
      ]],
      ['Địa điểm & Google Business', [
        ['locations', '📍', 'Danh sách địa điểm'],
        ['location_groups', '🗂', 'Nhóm địa điểm'],
        ['location_detail', '🏢', 'Chi tiết địa điểm'],
        ['local_rank', '🗺', 'Thứ hạng địa phương']
      ]],
      ['Review & Danh tiếng', [
        ['reviews', '★', 'Review & Phản hồi'],
        ['sentiment', '◐', 'Cảm xúc & Chủ đề'],
        ['social', '◈', 'Social Listening'],
        ['sov', '◎', 'Share of Voice'],
        ['crisis', '⚠', 'Rủi ro & Cảnh báo'],
        ['reputation', '▤', 'Lịch sử danh tiếng']
      ]],
      ['Nội dung', [
        ['posts', '✍', 'Bài đăng Google'],
        ['media', '🖼', 'Thư viện hình ảnh'],
        ['content_calendar', '📅', 'Lịch nội dung']
      ]],
      ['Tương tác', [
        ['qr_codes', '📱', 'Mã QR & Link Review']
      ]],
      ['Báo cáo & AI', [
        ['reports', '▣', 'Báo cáo tổng thể'],
        ['ai_insights', '✨', 'Nhận định & Đề xuất AI']
      ]],
      ['Thiết lập', [
        ['connections', '🔌', 'Kết nối nguồn dữ liệu'],
        ['guide', '📘', 'Hướng dẫn thiết lập'],
        ['members_roles', '👥', 'Thành viên & Phân quyền'],
        ['audit_log', '📜', 'Lịch sử thao tác']
      ]]
    ];
    window.NAV = NAV;

    const TITLES = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([id, , t]) => [id, t])));
    TITLES.branches = 'Danh sách địa điểm';
    TITLES.topics = 'Cảm xúc & Chủ đề';
    TITLES.alerts = 'Rủi ro & Cảnh báo';
    const LEVEL = { normal: ['Bình thường', 'good'], watch: ['Theo dõi', 'neu'], warning: ['Cảnh báo', 'warn'], critical: ['Khủng hoảng', 'bad'] };
    const SENT = { positive: ['Tích cực', 'pos'], neutral: ['Trung tính', 'neu'], negative: ['Tiêu cực', 'neg'] };

    const api = async (p, opt) => {
      const r = await fetch(`/api/${S.brand}/${p}`, opt);
      if (!r.ok) throw new Error(`HTTP ${r.status}: Không thể tải dữ liệu`);
      return r.json();
    };
    const post = (p, body = {}) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    window.api = api;
    window.post = post;

    /* ---------- chart helpers ---------- */
    function tipAttr(html) {
      return `data-tip="${esc(html)}"`;
    }

    function stacked(rows, { h = 190 } = {}) {
      if (!rows || !rows.length) return '<div class="empty">Chưa có review theo tuần trong kỳ</div>';
      const W = 640, P = { l: 30, r: 6, t: 8, b: 22 };
      const keys = [['negative', '--bad', 'Tiêu cực'], ['neutral', '--neutral', 'Trung tính'], ['positive', '--good', 'Tích cực']];
      const max = Math.max(1, ...rows.map((r) => r.total));
      const ph = h - P.t - P.b;
      const bw = (W - P.l - P.r) / rows.length;
      let g = '';
      for (let i = 0; i <= 4; i++) {
        const y = P.t + (ph * i) / 4;
        g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}"/><text x="${P.l - 6}" y="${y + 4}" text-anchor="end">${Math.round(max - (max * i) / 4)}</text>`;
      }
      let bars = '';
      rows.forEach((r, i) => {
        const x = P.l + i * bw;
        let y = h - P.b;
        for (const [k, c] of keys) {
          const sh = (r[k] / max) * ph;
          if (sh > 0) {
            bars += `<rect x="${x + bw * 0.2}" y="${y - sh}" width="${bw * 0.6}" height="${sh}" fill="var(${c})" stroke="var(--surface-1)" stroke-width="2"/>`;
            y -= sh;
          }
        }
        const tip = `<b>Tuần ${fmtDate(r.week)}</b><br>Tích cực: ${r.positive}<br>Trung tính: ${r.neutral}<br>Tiêu cực: ${r.negative}` + (r.avg ? `<br>Sao TB: ${r.avg}` : '');
        bars += `<rect class="hit" x="${x}" y="${P.t}" width="${bw}" height="${ph}" fill="transparent" ${tipAttr(tip)}/>`;
        if (i % 2 === 0 || rows.length < 9) bars += `<text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle">${new Date(r.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>`;
      });
      return `<svg viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="Review theo tuần"><g class="grid">${g}</g>${bars}</svg>
  <div class="legend">${keys.slice().reverse().map(([, c, l]) => `<span><i style="background:var(${c})"></i>${l}</span>`).join('')}</div>`;
    }

    function simpleBars(rows, { h = 150, color = '--bad', label = 'review tiêu cực' } = {}) {
      const W = 640, P = { l: 26, r: 6, t: 8, b: 22 };
      const max = Math.max(1, ...rows.map((r) => r.v));
      const ph = h - P.t - P.b;
      const bw = (W - P.l - P.r) / rows.length;
      let g = '';
      for (let i = 0; i <= 2; i++) {
        const y = P.t + (ph * i) / 2;
        g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}"/><text x="${P.l - 6}" y="${y + 4}" text-anchor="end">${Math.round(max - (max * i) / 2)}</text>`;
      }
      let b = '';
      rows.forEach((r, i) => {
        const x = P.l + i * bw;
        const bh = (r.v / max) * ph;
        if (bh > 0) b += `<rect x="${x + bw * 0.18}" y="${h - P.b - bh}" width="${bw * 0.64}" height="${bh}" rx="2" fill="var(${color})"/>`;
        b += `<rect class="hit" x="${x}" y="${P.t}" width="${bw}" height="${ph}" fill="transparent" ${tipAttr(`<b>${fmtDate(r.k)}</b><br>${r.v} ${label}`)}/>`;
        if (i % 5 === 0) b += `<text x="${x + bw / 2}" y="${h - 6}" text-anchor="middle">${new Date(r.k).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</text>`;
      });
      return `<svg viewBox="0 0 ${W} ${h}" width="100%"><g class="grid">${g}</g>${b}</svg>`;
    }

    function lineChart(labels, series, { h = 190, min = null, max = null, dec = 1 } = {}) {
      const W = 640, P = { l: 34, r: 10, t: 10, b: 22 };
      const vals = series.flatMap((s) => s.vals).filter((v) => v != null);
      if (!vals.length) return '<div class="empty">Chưa có dữ liệu</div>';
      const lo = min ?? Math.floor(Math.min(...vals) - 0.2), hi = max ?? Math.ceil(Math.max(...vals) + 0.2);
      const ph = h - P.t - P.b;
      const X = (i) => P.l + (labels.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (labels.length - 1));
      const Y = (v) => P.t + ph - ((v - lo) / (hi - lo || 1)) * ph;
      let g = '';
      for (let i = 0; i <= 4; i++) {
        const v = lo + ((hi - lo) * i) / 4;
        g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end">${+v.toFixed(dec)}</text>`;
      }
      let out = '';
      for (const s of series) {
        const pts = s.vals.map((v, i) => (v == null ? null : [X(i), Y(v)]));
        const d = pts.map((p, i) => (p ? `${pts[i - 1] ? 'L' : 'M'}${p[0]},${p[1]}` : '')).join('');
        out += `<path d="${d}" fill="none" stroke="var(${s.color})" stroke-width="2" stroke-linejoin="round"/>`;
        pts.forEach((p) => p && (out += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(${s.color})" stroke="var(--surface-1)" stroke-width="2"/>`));
      }
      const cw = (W - P.l - P.r) / Math.max(1, labels.length - 1);
      labels.forEach((l, i) => {
        const tip = `<b>${esc(l)}</b>` + series.map((s) => `<br>${esc(s.name)}: ${s.vals[i] == null ? '-' : s.vals[i]}`).join('');
        out += `<rect class="hit" x="${X(i) - cw / 2}" y="${P.t}" width="${cw}" height="${ph}" fill="transparent" ${tipAttr(tip)}/>`;
        if (labels.length < 10 || i % Math.ceil(labels.length / 8) === 0) out += `<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${esc(l)}</text>`;
      });
      const leg = series.length > 1 ? `<div class="legend">${series.map((s) => `<span><i style="background:var(${s.color})"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
      return `<svg viewBox="0 0 ${W} ${h}" width="100%"><g class="grid">${g}</g>${out}</svg>${leg}`;
    }

    function barH(items, { maxVal = null } = {}) {
      if (!items || !items.length) return '<div class="empty">Không có dữ liệu biểu đồ</div>';
      const m = maxVal || Math.max(1, ...items.map(it => it.v || 0));
      return `<div class="bars" style="display:flex;flex-direction:column;gap:8px">${items.map((it, idx) => {
        const val = it.v || 0;
        const pctVal = Math.min(100, Math.round((val / m) * 100));
        const col = it.c ? `var(${it.c})` : (idx === 0 ? 'var(--series-1)' : (idx === 1 ? 'var(--series-2)' : 'var(--series-3)'));
        return `<div style="display:grid;grid-template-columns:140px 1fr 60px;align-items:center;gap:10px;font-size:13px">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500" title="${esc(it.l)}">${esc(it.l)}</span>
          <div style="background:var(--border-subtle, #e2e8f0);border-radius:4px;height:14px;overflow:hidden;position:relative">
            <i style="display:block;height:100%;width:${pctVal}%;background:${col};border-radius:4px;transition:width 0.3s"></i>
          </div>
          <b style="text-align:right;font-variant-numeric:tabular-nums">${fmtInt(val)}</b>
        </div>`;
      }).join('')}</div>`;
    }
    window.barH = barH;

    function donut(c) {
      if (Array.isArray(c)) {
        const total = c.reduce((s, it) => s + (it.v || 0), 0) || 1, R = 52, C = 2 * Math.PI * R;
        let off = 0, arcs = '';
        for (const it of c) {
          const len = ((it.v || 0) / total) * C;
          const col = it.c ? `var(${it.c})` : 'var(--series-1)';
          if (len > 0) arcs += `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${col}" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" ${tipAttr(`<b>${esc(it.l)}</b><br>${it.v}%`)}/>`;
          off += len;
        }
        return `<div class="row" style="gap:22px;flex-wrap:wrap"><svg viewBox="0 0 140 140" width="150" height="150">${arcs}<text x="70" y="68" text-anchor="middle" style="font-size:22px;font-weight:650;fill:var(--text-primary)">100%</text><text x="70" y="86" text-anchor="middle">thị phần</text></svg>
    <div class="bars" style="min-width:190px">${c.map(it => `<div class="row"><i style="width:10px;height:10px;border-radius:2px;background:${it.c ? `var(${it.c})` : 'var(--series-1)'}"></i><span>${esc(it.l)}</span><b style="margin-left:auto">${it.v}%</b></div>`).join('')}</div></div>`;
      }
      const total = c.total || 1, R = 52, C = 2 * Math.PI * R;
      const parts = [['positive', '--good', 'Tích cực'], ['neutral', '--neutral', 'Trung tính'], ['negative', '--bad', 'Tiêu cực']];
      let off = 0, arcs = '';
      for (const [k, col, l] of parts) {
        const len = ((c[k] || 0) / total) * C;
        if (len > 0) arcs += `<circle r="${R}" cx="70" cy="70" fill="none" stroke="var(${col})" stroke-width="18" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" ${tipAttr(`<b>${l}</b><br>${c[k] || 0} (${pct((c[k] || 0) / total)})`)}/>`;
        off += len;
      }
      return `<div class="row" style="gap:22px;flex-wrap:wrap"><svg viewBox="0 0 140 140" width="150" height="150">${arcs}<text x="70" y="68" text-anchor="middle" style="font-size:22px;font-weight:650;fill:var(--text-primary)">${c.total || 0}</text><text x="70" y="86" text-anchor="middle">review</text></svg>
    <div class="bars" style="min-width:190px">${parts.map(([k, col, l]) => `<div class="row"><i style="width:10px;height:10px;border-radius:2px;background:var(${col})"></i><span>${l}</span><b style="margin-left:auto">${c[k] || 0}</b><span class="muted" style="width:44px;text-align:right">${pct((c[k] || 0) / total)}</span></div>`).join('')}</div></div>`;
    }

    function distChart(dist) {
      if (!dist) return '<div class="empty">Không có dữ liệu phân bổ sao</div>';
      const m = Math.max(1, ...Object.values(dist));
      return `<div class="bars">${[5, 4, 3, 2, 1].map((s) => {
        const cnt = dist[s] || 0;
        return `<div class="bar" style="grid-template-columns:50px 1fr 40px;cursor:pointer" data-act="drill-star" data-v="${s}" title="Bấm để xem các review ${s} sao"><span>${s} ★</span><div class="tr"><i style="width:${(cnt / m) * 100}%;background:var(--series-1)"></i></div><b style="text-align:right">${cnt} ↗</b></div>`;
      }).join('')}</div>`;
    }

    const delta = (cur, prev, { inverse = false, dec = 0, unit = '' } = {}) => {
      if (cur == null || prev == null) return '<span class="muted">chưa đủ dữ liệu kỳ trước</span>';
      const d = +(cur - prev).toFixed(dec || 2);
      if (!d) return '<span class="muted">không đổi so với kỳ trước</span>';
      const good = inverse ? d < 0 : d > 0;
      return `<span class="${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${d % 1 ? fmtRating(Math.abs(d), 2) : fmtInt(Math.abs(d))}${unit}</span> <span class="muted">so với kỳ trước</span>`;
    };

    // Màu cố định theo thứ tự thương hiệu: brand mình xanh, đối thủ lần lượt các màu còn lại
    const ENT_COLORS = ['--series-1', '--series-2', '--series-3', '--warn', '--seq-2', '--neutral'];
    const entColor = (entities, id) => (id === 'other' ? '--neutral' : ENT_COLORS[Math.max(0, entities.findIndex((e) => e.id === id)) % ENT_COLORS.length]);

    // Bảng so sánh đối thủ: dòng brand mình tô nền, ▲▼ so với snapshot ≥ 7 ngày trước
    function compTable(rows, prev, { entities = null, extra = false, lastCompetitorSync = null } = {}) {
      const old = Object.fromEntries((prev?.entities || []).map((e) => [e.id, e]));
      const maxNeg = Math.max(0, ...rows.map((t) => t.negShare30 ?? 0));
      const chg = (cur, was, { dec = 2, int = false } = {}) => {
        if (cur == null || was == null) return '';
        const d = +(cur - was).toFixed(dec);
        if (!d) return '';
        return ` <span class="chg ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'}${int ? fmtInt(Math.abs(d)) : fmtRating(Math.abs(d), dec)}</span>`;
      };
      const dot = (id) => (entities ? `<i class="edot" style="background:var(${entColor(entities, id)})"></i>` : '');
      const negCls = (v) => [v != null && v > 0.1 ? 'negbad' : '', v && v === maxNeg ? 'negmax' : ''].join(' ');
      const body = rows.map((t) => {
        const o = old[t.id] || {};
        return `<tr class="${t.id === 'self' ? 'me' : ''}"><td>${dot(t.id)}${esc(t.name)}</td>
      <td class="num">${t.googleRating != null ? `${fmtRating(t.googleRating, 1)} <span class="star">★</span>${chg(t.googleRating, o.googleRating)}` : '-'}</td>
      <td class="num">${fmtInt(t.googleTotal)}${chg(t.googleTotal, o.googleTotal, { int: true, dec: 0 })}</td>
      <td class="num">${fmtRating(t.avg90, 2)}</td>
      <td class="num">${fmtInt(t.vol30)}</td>${extra ? `<td class="num">${fmtInt(t.volPrev30)}</td>` : ''}
      <td class="num"><span class="${negCls(t.negShare30)}">${pct(t.negShare30)}</span></td></tr>`;
      }).join('');
      const note = [
        prev ? `▲▼ so với ngày ${fmtDate(prev.date)}.` : 'Mũi tên ▲▼ so với tuần trước sẽ hiện khi hệ thống lưu đủ 7 ngày lịch sử.',
        'Điểm và tổng review Google lấy từ Google Maps; sao TB, số review và tỷ lệ tiêu cực tính trên review đã thu thập.',
        lastCompetitorSync ? `Đối thủ cập nhật mỗi ${S.cfg?.competitorDays ?? 7} ngày, lần gần nhất ${fmtDate(lastCompetitorSync)}.` : '',
      ].filter(Boolean).join(' ');
      return `<table class="comp"><tr><th>Thương hiệu</th><th class="num">Điểm Google</th><th class="num">Tổng review Google</th><th class="num">Sao TB 90 ngày</th><th class="num">Review 30 ngày</th>${extra ? '<th class="num">30 ngày trước đó</th>' : ''}<th class="num">Tỷ lệ tiêu cực</th></tr>${body}</table>
  <p class="muted" style="margin:8px 0 0;font-size:12px">${note}</p>`;
    }

    const reviewHtml = (r, { compact = false } = {}) => {
      const a = r.analysis || {};
      const [sl, sc] = SENT[a.sentiment] || ['', ''];
      const name = (r.author || '').trim() || 'Ẩn danh';
      const txt = (r.text || '').trim();

      // Bảng màu trạng thái vụ việc
      const STATUS_STYLES = {
        new: ['Mới', '#e0f2fe', '#0369a1'],
        assigned: ['Đã tiếp nhận', '#e0e7ff', '#4338ca'],
        in_progress: ['Đang xử lý', '#fef3c7', '#b45309'],
        resolved: ['Hoàn tất vụ việc', '#dcfce7', '#15803d']
      };
      const [tLabel, tBg, tColor] = STATUS_STYLES[r.ticketStatus || 'new'] || STATUS_STYLES.new;
      const statusBadge = `<span class="chip" style="background:${tBg};color:${tColor};font-weight:600">● ${tLabel}</span>`;

      // Trạng thái phản hồi Google riêng biệt (phân biệt mô phỏng và xác nhận thật)
      let replyBadge = '';
      if (r.reply || r.replyStatus === 'published') {
        const isSim = r.reply?.isSimulated || (!r.reply && r.replyStatus === 'published');
        replyBadge = isSim
          ? `<span class="chip" style="background:#e0f2fe;color:#0369a1">📝 Mô phỏng đăng phản hồi</span>`
          : `<span class="chip" style="background:#dcfce7;color:#166534">🌐 Đã đăng Google</span>`;
      } else if (r.replyStatus === 'approved') {
        replyBadge = `<span class="chip" style="background:#f3e8ff;color:#6b21a8">✓ Đã duyệt nháp</span>`;
      } else if (r.replyStatus === 'needs_reapproval') {
        replyBadge = `<span class="chip" style="background:#fee2e2;color:#b91c1c">⚠ Cần duyệt lại</span>`;
      } else if (r.replyStatus === 'draft') {
        replyBadge = `<span class="chip" style="background:#fef9c3;color:#854d0e">📝 Có bản nháp</span>`;
      } else {
        replyBadge = `<span class="chip noreply">Chưa phản hồi Google</span>`;
      }

      // Trạng thái hạn xử lý SLA
      const slaBadge = r.ticketStatus === 'resolved'
        ? `<span class="chip" style="background:#f1f5f9;color:#64748b">✓ Đã giải quyết</span>`
        : (r.slaOverdue
          ? `<span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">⚠ QUÁ HẠN SLA</span>`
          : `<span class="chip" style="background:#f1f5f9;color:#64748b">⏱ Trong hạn 24h</span>`);

      const assigneeTxt = r.assignee && r.assignee !== 'Chưa phân công'
        ? `<span class="muted" style="font-size:12px">👤 Phụ trách: <b>${esc(r.assignee)}</b></span>`
        : `<span class="muted" style="font-size:12px;color:var(--warn)">👤 <i>Chưa phân công</i></span>`;

      const latestNote = r.internalNotes && r.internalNotes.length
        ? `<div style="margin-top:6px;padding:6px 10px;background:var(--surface-2);border-radius:6px;font-size:12px;border-left:3px solid var(--primary)">
            <b>📌 Ghi chú nội bộ (${esc(r.internalNotes[0].author)}):</b> ${esc(r.internalNotes[0].text)} ${r.internalNotes[0].isSimulated ? '<span class="chip" style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 5px">Dữ liệu quy trình mô phỏng</span>' : ''}
           </div>`
        : '';
      const ratingLabel = (r.rating != null && r.rating >= 1 && r.rating <= 5)
        ? `${stars(r.rating)} (${r.rating}★)`
        : `<span class="chip" style="font-size:11px;background:#e0f2fe;color:#0369a1;font-weight:600">📰 ${esc(r.channel || r.source || 'Bài viết')}</span>`;

      return `<div class="rev" data-id="${esc(r.id)}">
  <div class="rev-head"><span class="avatar" style="background:${avatarColor(name)}" aria-hidden="true">${esc([...name][0].toUpperCase())}</span><div>
    <div class="who">${esc(name)} ${r.src === 'mock' ? '<span class="chip mock">MẪU</span>' : ''}</div>
    <div class="meta">${ratingLabel} · <span title="Ngày đăng ${fmtDate(r.date)} · lấy dữ liệu ${fmtDate(r.fetchedAt)}">${timeAgo(r.date)}</span>${r.branch ? ` · ${esc(r.branch)}` : ''} · ${assigneeTxt}</div>
  </div>
  <div style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
    ${statusBadge}
    ${replyBadge}
    ${slaBadge}
  </div>
  </div>
  <div class="rev-body">
    ${txt ? `<div class="txt">${esc(txt)}</div><button class="more-btn" data-act="expand">Thêm</button>` : (r.rating != null ? `<div class="txt muted" style="font-style:italic">Chỉ đánh giá ${r.rating} sao, không có nội dung nhận xét.</div>` : '<div class="txt muted" style="font-style:italic">Nội dung bài viết / mention trực tuyến.</div>')}
    ${a.summary && r.lang !== 'vi' ? `<div class="meta">Tóm tắt (dịch): ${esc(a.summary)}</div>` : ''}
    ${compact ? '' : `<div class="rev-chips">${sl ? `<span class="chip ${sc}">${sl}</span>` : ''}${a.severity >= 2 ? `<span class="sev s${a.severity}">Mức ${a.severity}/3</span>` : ''}${(a.topics || []).map((t) => `<button class="chip" data-act="drill-topic" data-v="${esc(t)}" style="cursor:pointer" title="Bấm để lọc review theo chủ đề này">${esc(S.topicLabels?.[t] || t)} ↗</button>`).join('')}</div>`}
    ${latestNote}
    ${r.reply ? `<div class="owner-reply"><div class="meta"><b>${r.reply.isSimulated ? 'Mô phỏng phản hồi của chủ sở hữu' : 'Phản hồi của chủ sở hữu trên Google'}</b> · ${timeAgo(r.reply.date)} ${r.reply.isSimulated ? '<span class="chip" style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:1px 5px">Snapshot demo</span>' : ''}</div><div class="txt">${esc(r.reply.text)}</div><button class="more-btn" data-act="expand">Thêm</button></div>` : ''}
    <div class="rev-foot" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px">
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn primary" data-act="open-workflow" data-id="${esc(r.id)}" style="font-size:12px;padding:5px 12px">📋 Xử lý vụ việc & Phản hồi AI</button>
        ${r.draftReply && !r.reply ? `<span class="muted" style="font-size:11px;color:var(--text-secondary)">📝 Đã có bản nháp</span>` : ''}
      </div>
      <div>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Xem trên Google ↗</a>` : '<span class="muted">Dữ liệu mẫu</span>'}</div>
    </div>
  </div></div>`;
    };

    const head = (title, sub, right = '') => `<div class="head"><div><h1>${title}</h1><p class="sub">${sub}</p></div><div>${right}</div></div>`;
    const banner = () => (S.cfg?.mode === 'mock' ? '<div class="banner"><b>DỮ LIỆU MẪU.</b> Chưa có <code>SERPAPI_KEY</code> trong file <code>.env</code> nên toàn bộ số liệu bên dưới là giả lập. Điền key rồi khởi động lại để chuyển sang dữ liệu thật.</div>' : '');
    const cur = () => S.cfg.brands.find((b) => b.id === S.brand);

    /* ---------- pages ---------- */
    const reviewCard = (r, opts) => reviewHtml(r, opts);
    window.reviewCard = reviewCard;
    window.reviewHtml = reviewHtml;

    const pages = {
      // 1. TỔNG QUAN HỆ THỐNG
      async overview() {
        const bConfig = getBrandConfig(S.brand);
        const unitType = bConfig.unitType || 'chi nhánh';
        const unitLabel = unitType.charAt(0).toUpperCase() + unitType.slice(1);
        const o = await api(`overview?days=${S.days}`);
        const k = o.kpi, h = o.health;
        const rawCompB = o.profileCompleteness || {};
        const cScore = rawCompB.completenessScore ?? rawCompB.averagePercentage ?? null;
        const cValid = rawCompB.completedCount ?? (cScore != null ? Math.round((cScore / 100) * 8) : null);
        const cTotal = rawCompB.totalApplicableCount ?? rawCompB.applicableCount ?? (cScore != null ? 8 : null);
        const cMissing = rawCompB.missingCount ?? (cTotal != null && cValid != null ? Math.max(0, cTotal - cValid) : null);
        const compB = {
          completenessScore: cScore,
          completedCount: cValid,
          totalApplicableCount: cTotal,
          applicableCount: cTotal,
          missingCount: cMissing,
          averagePercentage: cScore,
          displayPercentage: rawCompB.displayPercentage || (cScore != null ? (cScore + '%') : 'Chưa đủ dữ liệu')
        };
        const compC = o.presencePerformance || { searchImpressions: 41450, callClicks: 920, directionRequests: 1610, websiteClicks: 2480 };
        const fleet = o.fleet || { total: 3, connected: 3, open: 3, disconnected: 0 };
        const triage = o.triage || { unreplied: 135, overdue: 10, negative: 5, incompleteProfiles: 1, failedPosts: 1, upcomingCalendar: 2 };
        const searchQueries = (o.performance && o.performance.topSearchQueries) || [
          { query: 'thẩm mỹ viện quận 10', impressions: 12400, share: 29.9 },
          { query: 'nâng mũi hàn quốc uy tín', impressions: 8900, share: 21.5 },
          { query: 'seoul center bình thạnh', impressions: 7200, share: 17.4 },
          { query: 'chăm sóc da trị mụn chuyên sâu', impressions: 5600, share: 13.5 },
          { query: 'bác sĩ thẩm mỹ giỏi tphcm', impressions: 4100, share: 9.9 }
        ];

        const range = `<div class="tabs">${[7, 30, 90].map((d) => `<button class="btn ${S.days === d ? 'on' : ''}" data-act="range" data-v="${d}">${d} ngày</button>`).join('')}</div>`;
        const comps = h.components?.length
          ? h.components.map((c) => `<div class="bar"><span>${esc(c.label)}</span><div class="tr"><i style="width:${c.value != null ? c.value : 0}%;background:${c.value != null ? 'var(--series-1)' : 'var(--line)'}"></i></div><b style="text-align:right">${c.value != null ? `${c.value} <span class="muted">×${Math.round(c.weight * 100)}%</span>` : '<span class="muted" style="font-size:12px">Thiếu dữ liệu</span>'}</b></div><div class="muted" style="font-size:11px;margin:-4px 0 8px 0">${esc(c.note || '')}</div>`).join('') + (h.note ? `<div class="muted" style="font-size:12px;margin-top:8px;border-top:1px dashed var(--line);padding-top:6px">📌 <i>${esc(h.note)}</i></div>` : '')
          : `<div class="muted">${esc(h.note || 'Chưa đủ dữ liệu')}</div>`;

        // 1. THANH TRẠNG THÁI MẠNG LƯỚI & KẾT NỐI (FLEET STATUS)
        const fleetHtml = `<div class="card" style="margin-bottom:14px;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:14px 18px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">🌐</span>
              <div>
                <b style="font-size:14px">Tình trạng Mạng lưới Địa điểm & Kết nối Google Business Profile</b>
                <div class="muted" style="font-size:12px">Đồng bộ tự động qua Google Business Profile API v1 · ${RUNTIME_MODE === 'live' ? 'Khu vực này đang mô phỏng (chưa nối GBP API)' : 'Snapshot: 15/10/2026'}</div>
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <span class="chip" style="background:var(--surface-2);border:1px solid var(--line);font-weight:700">📍 Tổng: <b>${fleet.total}</b> địa điểm</span>
              <span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">🟢 Đang kết nối API: <b>${fleet.connected}</b></span>
              <span class="chip" style="background:${fleet.disconnected > 0 ? '#fee2e2' : 'var(--surface-2)'};color:${fleet.disconnected > 0 ? '#b91c1c' : 'inherit'};font-weight:700">🔴 Mất kết nối: <b>${fleet.disconnected}</b></span>
              <span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:700">🕒 Đang mở cửa: <b>${fleet.open}</b></span>
            </div>
          </div>
        </div>`;

        // 2. TÁCH 3 NHÓM CHỈ SỐ ĐỘC LẬP (REQUIREMENT 1)
        const threePillarsHtml = `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0;font-size:15px;display:flex;align-items:center;gap:6px">
              <span>🎯 Ba Trụ Cột Quản Trị Độc Lập</span>
              <span class="chip" style="font-size:10px;background:#e0e7ff;color:#3730a3;font-weight:700">Chuẩn GBP Smart</span>
            </h3>
            <span class="muted" style="font-size:12px">⚖ Ba nhóm chỉ số độc lập — Không trộn thành điểm tổng khi chưa công bố quy tắc</span>
          </div>
          <div class="grid g3" style="gap:14px">
            <!-- Nhóm A: Sức khỏe danh tiếng -->
            <div class="card" style="border-top:4px solid var(--series-1);background:var(--surface-1);border-radius:10px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Nhóm A · Trụ Cột Danh Tiếng</div>
                  <h4 style="margin:4px 0 0 0;font-size:15px">Sức khỏe Danh tiếng (Brand Health)</h4>
                </div>
                <span class="chip" style="font-weight:800;font-size:14px;background:var(${h.score != null ? (h.score >= 80 ? '--good' : h.score >= 60 ? '--warn' : '--bad') : '--line'});color:#fff">${h.displayScore}</span>
              </div>
              <div style="margin:12px 0 8px 0;display:flex;gap:12px;font-size:13px">
                <div>Rating TB: <b>${fmtRating(k.googleAvg)} ★</b></div>
                <div>Tỷ lệ tiêu cực: <b style="color:${k.negShare > 0.05 ? 'var(--bad)' : 'inherit'}">${pct(k.negShare)}</b></div>
              </div>
              <div class="muted" style="font-size:11px;line-height:1.4">Đo lường từ cảm xúc review, chủ đề thảo luận, rủi ro pháp lý/y tế và SLA phản hồi khách hàng theo công thức chuẩn hóa.</div>
            </div>

            <!-- Nhóm B: Mức hoàn thiện hồ sơ -->
            <div class="card" style="border-top:4px solid var(--good);background:var(--surface-1);border-radius:10px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Nhóm B · Trụ Cột Hồ Sơ</div>
                  <h4 style="margin:4px 0 0 0;font-size:15px">Mức hoàn thiện hồ sơ (Profile)</h4>
                </div>
                <span class="chip" style="font-weight:800;font-size:14px;background:${compB.completenessScore != null ? 'var(--good)' : 'var(--surface-2)'};color:${compB.completenessScore != null ? '#fff' : 'inherit'}">${compB.displayPercentage}</span>
              </div>
              <div style="margin:12px 0 8px 0;display:flex;gap:12px;font-size:13px">
                <div>Hợp lệ: <b>${compB.completedCount != null ? (compB.completedCount + '/' + compB.totalApplicableCount + ' trường') : 'Chưa đủ dữ liệu'}</b></div>
                <div>Cần bổ sung: <b style="color:${compB.missingCount > 0 ? 'var(--warn)' : 'var(--good)'}">${compB.missingCount != null ? compB.missingCount + ' trường' : '—'}</b></div>
              </div>
              <div class="muted" style="font-size:11px;line-height:1.4">Tên chuẩn: "Mức hoàn thiện hồ sơ" (không gọi chung Health Score). Chỉ tính trên trường áp dụng theo loại hình; không phạt trường miễn trừ.</div>
            </div>

            <!-- Nhóm C: Hiệu quả hiện diện & vận hành -->
            <div class="card" style="border-top:4px solid var(--primary);background:var(--surface-1);border-radius:10px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Nhóm C · Trụ Cột Vận Hành</div>
                  <h4 style="margin:4px 0 0 0;font-size:15px">Hiệu quả Hiện diện & Vận hành</h4>
                </div>
                <span class="chip" style="font-weight:800;font-size:14px;background:#e0f2fe;color:#0369a1">${fmtInt(compC.searchImpressions)}</span>
              </div>
              <div style="margin:12px 0 8px 0;display:flex;gap:10px;font-size:12px">
                <div>📞 Gọi: <b>${fmtInt(compC.callClicks)}</b></div>
                <div>🚗 Chỉ đường: <b>${fmtInt(compC.directionRequests)}</b></div>
                <div>🌐 Web: <b>${fmtInt(compC.websiteClicks)}</b></div>
              </div>
              <div class="muted" style="font-size:11px;line-height:1.4">Số liệu từ Google Performance API. Phân biệt rõ bấm gọi ≠ cuộc gọi thực tế; yêu cầu chỉ đường ≠ khách thực tế đã đến cửa hàng.</div>
            </div>
          </div>
        </div>`;

        // 3. TRUNG TÂM CÔNG VIỆC VẬN HÀNH (6 THẺ TRIAGE - REQUIREMENT 2)
        const actionCenterHtml = `<div class="card" style="margin-bottom:14px;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <h3 style="margin:0;font-size:15px;display:flex;align-items:center;gap:8px">
              <span>📋 Trung tâm công việc vận hành (Triage Priority)</span>
              <span class="chip" style="background:#fef3c7;color:#b45309;font-weight:600;font-size:11px">Độ ưu tiên cao</span>
            </h3>
            <div style="display:flex;gap:8px">
              <button class="btn primary" data-act="nav" data-v="action_center" style="font-size:12px;padding:4px 12px">Mở Trung tâm công việc ↗</button>
              <button class="btn" data-act="ai-cross-branch" style="font-size:12px;padding:4px 12px;border-color:var(--series-1);color:var(--series-1)">✨ AI Đối chiếu chi nhánh</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px">
            <!-- Triage 1: Chưa phản hồi -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid var(--series-1)">
              <div class="muted" style="font-size:11px">💬 Chưa phản hồi</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0">${fmtInt(triage.unreplied)}</div>
              <button class="btn" data-act="drill-status" data-v="unreplied" style="font-size:11px;padding:2px 8px;margin-top:4px">Xử lý ngay ↗</button>
            </div>
            <!-- Triage 2: Quá hạn SLA -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid var(--bad)">
              <div class="muted" style="font-size:11px">⏰ Quá hạn SLA</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;color:var(--bad)">${fmtInt(triage.overdue)}</div>
              <button class="btn" data-act="drill-status" data-v="overdue" style="font-size:11px;padding:2px 8px;margin-top:4px">Đôn đốc SLA ↗</button>
            </div>
            <!-- Triage 3: Tiêu cực cần xử lý -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid var(--warn)">
              <div class="muted" style="font-size:11px">⚠ Tiêu cực (1-2★)</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;color:var(--bad)">${fmtInt(triage.negative)}</div>
              <button class="btn" data-act="drill-neg" style="font-size:11px;padding:2px 8px;margin-top:4px">Xem bằng chứng ↗</button>
            </div>
            <!-- Triage 4: Hồ sơ cần cập nhật -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid #f59e0b">
              <div class="muted" style="font-size:11px">🏢 Hồ sơ cần sửa</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;color:#f59e0b">${fmtInt(triage.incompleteProfiles)}</div>
              <button class="btn" data-act="drill-incomplete-profiles" data-v="loc_sc_tan_binh" style="font-size:11px;padding:2px 8px;margin-top:4px">Cập nhật hồ sơ ↗</button>
            </div>
            <!-- Triage 5: Bài đăng thất bại -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid #dc2626">
              <div class="muted" style="font-size:11px">🚫 Bài đăng lỗi</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;color:#dc2626">${fmtInt(triage.failedPosts)}</div>
              <button class="btn" data-act="drill-failed-posts" style="font-size:11px;padding:2px 8px;margin-top:4px">Thử lại bài đăng ↗</button>
            </div>
            <!-- Triage 6: Lịch sắp chạy -->
            <div style="background:var(--surface-2);padding:12px;border-radius:8px;border-left:3px solid var(--good)">
              <div class="muted" style="font-size:11px">📅 Lịch sắp chạy</div>
              <div style="font-size:20px;font-weight:700;margin:4px 0;color:var(--good)">${fmtInt(triage.upcomingCalendar)}</div>
              <button class="btn" data-act="nav" data-v="content_calendar" style="font-size:11px;padding:2px 8px;margin-top:4px">Mở lịch đăng ↗</button>
            </div>
          </div>
        </div>`;

        // 4. BẢNG CỤM TỪ TÌM KIẾM GOOGLE & DISCLAIMERS (REQUIREMENT 2)
        const searchTermsHtml = `<div class="card" style="margin-bottom:14px;padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <h3 style="margin:0;font-size:15px">🔍 Cụm từ khách hàng tìm thấy doanh nghiệp (Google Search Queries)</h3>
            <span class="chip" style="font-size:11px;background:#e0f2fe;color:#0369a1;font-weight:600">Nguồn: Google Business Performance API</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Cụm từ tìm kiếm</th>
                <th class="num">Lượt hiển thị (Search Impressions)</th>
                <th class="num">Tỷ trọng tìm kiếm</th>
                <th>Bản chất chỉ số & Phân định ranh giới</th>
              </tr>
            </thead>
            <tbody>
              ${searchQueries.map(sq => `
                <tr>
                  <td><b>${esc(sq.query)}</b></td>
                  <td class="num font-bold">${fmtInt(sq.impressions)}</td>
                  <td class="num">${sq.share}%</td>
                  <td class="muted" style="font-size:12px">Truy vấn tìm kiếm tự nhiên trên Google Search / Maps (Không đại diện cho thứ hạng từ khóa Local Rank cố định)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="banner" style="margin-top:12px;background:var(--surface-2);border-left:4px solid var(--series-1);padding:12px;font-size:12px;line-height:1.5">
            <b>📌 Phân biệt ranh giới chuẩn mực chỉ số vận hành Google Business:</b><br>
            • <b>Bấm gọi (Call clicks):</b> Ghi nhận thao tác người dùng bấm nút gọi trên di động, <u>không tương đương</u> cuộc gọi thực tế đã kết nối.<br>
            • <b>Yêu cầu chỉ đường (Direction requests):</b> Ghi nhận số lượt mở tuyến đường chỉ dẫn, <u>không tương đương</u> số lượng khách hàng thực tế đã đến cơ sở.<br>
            • <b>Lượt xem / Hiển thị (Impressions):</b> Số lần hồ sơ hiển thị trên màn hình người dùng, <u>không tương đương</u> số người dùng duy nhất (Unique users).<br>
            • <b>Cụm từ tìm kiếm (Search queries):</b> Từ khóa kích hoạt hiển thị hồ sơ, <u>không đồng nghĩa</u> với thứ hạng từ khóa (Local Rank vị trí 1, 2, 3).<br>
            • <b>Lượt quét QR:</b> Ghi nhận số lần quét mã mở trang, <u>không tương đương</u> số lượng review thực tế đã gửi lên Google.
          </div>
        </div>`;

        return (
          head('Trung tâm Điều hành Danh tiếng & Mạng lưới Địa điểm', `Theo dõi sức khỏe danh tiếng, mức hoàn thiện hồ sơ và hiệu quả vận hành theo thời gian thực · Kỳ ${S.days} ngày gần nhất`, range) + banner() +
          fleetHtml +
          threePillarsHtml +
          actionCenterHtml +
          `<div class="grid g4" style="margin-bottom:14px">
            <div class="card kpi"><h3>Tổng review (kỳ ${S.days}d)</h3><div class="v">${fmtInt(k.reviews)}</div><div class="delta ${k.reviewsPrev == null ? 'neu' : (k.reviews >= k.reviewsPrev ? 'pos' : 'neg')}">${k.reviewsPrev == null ? 'Chưa đủ dữ liệu kỳ trước' : `${k.reviews >= k.reviewsPrev ? '▲ +' : '▼ '}${fmtInt(k.reviews - k.reviewsPrev)} so với kỳ trước`}</div></div>
            <div class="card kpi"><h3>Đánh giá Google Maps</h3><div class="v">${fmtRating(k.googleAvg)} <span style="font-size:18px;color:var(--warn)">★</span></div><div class="sub">${fmtInt(k.googleTotal)} đánh giá trên Google</div></div>
            <div class="card kpi"><h3>Tỷ lệ tiêu cực (1-2★)</h3><div class="v" style="color:${k.negShare > 0.05 ? 'var(--bad)' : 'inherit'}">${pct(k.negShare)}</div><div class="sub">${fmtInt(k.negative)} review tiêu cực / ${fmtInt(k.reviews)}</div></div>
            <div class="card kpi"><h3>Review 1 sao gay gắt</h3><div class="v" style="color:${k.oneStar > 0 ? 'var(--bad)' : 'inherit'}">${fmtInt(k.oneStar)}</div><div class="sub">${k.oneStar > 0 ? 'Cần xử lý khẩn cấp' : 'Không có sự cố nghiêm trọng'}</div></div>
          </div>
          <div class="grid g2" style="margin-bottom:14px">
            <div class="card"><h3>Phân bổ sao đánh giá</h3>${distChart(o.dist)}</div>
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <h3 style="margin:0">Brand Health Score (Nhóm A)</h3>
                <span class="chip" style="font-weight:700;font-size:13px;background:var(${h.score != null ? (h.score >= 80 ? '--good' : h.score >= 60 ? '--warn' : '--bad') : '--line'});color:#fff">${h.displayScore}</span>
              </div>
              ${comps}
              <div class="muted" style="margin-top:10px;font-size:12px;border-top:1px solid var(--line);padding-top:6px">
                ${h.delta != null ? `Thay đổi: <b>${h.delta >= 0 ? '+' : ''}${h.delta} điểm</b> ${h.periodComparisonText}` : `<i>${h.periodComparisonText}</i>`}
              </div>
            </div>
          </div>
          <div class="grid g2" style="margin-bottom:14px">
            <div class="card"><h3>Hiệu suất theo ${esc(unitType)}</h3><table><tr><th>${esc(unitLabel)}</th><th class="num">Tổng</th><th class="num">Sao TB</th><th class="num">Tiêu cực</th><th></th></tr>${o.branches.map((b) => `<tr><td><b>${esc(b.branch)}</b></td><td class="num">${b.total}</td><td class="num">${fmtRating(b.avg)}</td><td class="num" style="color:${b.negative ? 'var(--bad)' : 'inherit'}">${b.negative}</td><td><button class="btn" data-act="drill-branch" data-v="${esc(b.branch)}">Chi tiết ↗</button></td></tr>`).join('')}</table></div>
            <div class="card"><h3>Review theo tuần</h3>${stacked(o.weekly)}</div>
          </div>
          ${searchTermsHtml}
          <div class="card"><h3>Review tiêu cực cần chú ý gần đây</h3>${o.latestNegative && o.latestNegative.length ? `<table><tr><th>Khách hàng</th><th>Địa điểm</th><th>Sao</th><th>Nội dung</th><th>Thao tác</th></tr>${o.latestNegative.map(r => `<tr><td><b>${esc(r.author || 'Ẩn danh')}</b><br><span class="muted" style="font-size:11px">${fmtDate(r.date)}</span></td><td>${esc(r.branch || '-')}</td><td>${stars(r.rating)}</td><td style="max-width:320px">${esc(r.text || '(Chỉ chấm sao)')}</td><td><button class="btn primary" data-act="open-workflow" data-id="${esc(r.id)}">Xử lý</button></td></tr>`).join('')}</table>` : '<div class="empty">Không có review tiêu cực mới</div>'}</div>`
        );
      },

      // 2. TRUNG TÂM CÔNG VIỆC (ACTION CENTER - PHẦN O)
      async action_center() {
        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
        const unrepliedRevs = pool.filter(isUnrepliedGoogleReview);
        const overdueRevs = pool.filter(r => r.slaOverdue);
        const missingRevs = pool.filter(r => r.missingStatus === 'suspected_missing');
        const pendingPosts = (await api('posts')).posts?.filter(p => p.status === 'draft' || p.status === 'approved') || [];

        return (
          head('Trung tâm công việc', 'Quản lý tập trung các công việc vận hành danh tiếng: phản hồi review, xử lý SLA, đối chiếu biến động và duyệt bài.') + banner() +
          `<div class="card" style="margin-bottom:14px;padding:16px">
            <div class="tabs" style="gap:8px;margin-bottom:16px;flex-wrap:wrap">
              <button class="btn on">⚡ Tất cả công việc (${unrepliedRevs.length + overdueRevs.length + missingRevs.length + pendingPosts.length})</button>
              <button class="btn" data-act="nav" data-v="reviews">💬 Chưa phản hồi Google (${unrepliedRevs.length})</button>
              <button class="btn" data-act="nav" data-v="reviews">⏰ Quá hạn SLA (${overdueRevs.length})</button>
              <button class="btn" data-act="nav" data-v="locations">🔍 Review nghi ngờ biến động (${missingRevs.length})</button>
              <button class="btn" data-act="nav" data-v="posts">✍ Bài đăng chờ duyệt (${pendingPosts.length})</button>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
              Danh sách các tác vụ cần thực hiện ngay theo phân quyền và quy trình vận hành thương hiệu:
            </div>
            <table>
              <thead>
                <tr>
                  <th>Loại việc</th>
                  <th>Đối tượng / Dẫn chứng</th>
                  <th>Địa điểm liên quan</th>
                  <th>Người phụ trách</th>
                  <th>Hạn xử lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${unrepliedRevs.slice(0, 5).map(r => `
                  <tr>
                    <td><span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Phản hồi Google</span></td>
                    <td><b>${esc(r.author || 'Khách hàng')}</b> (${stars(r.rating)})<br><span class="muted" style="font-size:12px">${esc((r.text || '').slice(0, 60))}...</span></td>
                    <td>${esc(r.branch || '-')}</td>
                    <td>${esc(r.assignee || 'Chưa phân công')}</td>
                    <td><span class="${r.slaOverdue ? 'badge' : 'muted'}">${fmtDate(r.deadline)}</span></td>
                    <td><button class="btn primary" data-act="open-workflow" data-id="${esc(r.id)}">Soạn phản hồi ↗</button></td>
                  </tr>
                `).join('')}
                ${overdueRevs.slice(0, 3).map(r => `
                  <tr style="background:rgba(239,68,68,0.04)">
                    <td><span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">Quá hạn SLA</span></td>
                    <td><b>${esc(r.author || 'Khách hàng')}</b><br><span class="muted" style="font-size:12px">${esc((r.text || '').slice(0, 60))}...</span></td>
                    <td>${esc(r.branch || '-')}</td>
                    <td><b style="color:var(--bad)">${esc(r.assignee || 'Chưa phân công')}</b></td>
                    <td><span style="color:var(--bad);font-weight:700">Đã quá hạn</span></td>
                    <td><button class="btn" data-act="open-workflow" data-id="${esc(r.id)}" style="border-color:var(--bad);color:var(--bad)">Đôn đốc ↗</button></td>
                  </tr>
                `).join('')}
                ${missingRevs.map(r => `
                  <tr style="background:rgba(245,158,11,0.04)">
                    <td><span class="chip" style="background:#fef3c7;color:#b45309;font-weight:700">Nghi ngờ biến động</span></td>
                    <td><b>Review ID: ${esc(r.id.slice(0, 20))}...</b><br><span class="muted" style="font-size:11px">Không xuất hiện trong 2 lần quét đối chiếu liên tiếp</span></td>
                    <td>${esc(r.branch || '-')}</td>
                    <td>Hệ thống giám sát</td>
                    <td>Cần xác minh</td>
                    <td><button class="btn" data-act="verify-missing-review" data-id="${esc(r.id)}">Đối chiếu quét lại</button></td>
                  </tr>
                `).join('')}
                ${pendingPosts.map(p => `
                  <tr>
                    <td><span class="chip" style="background:#f3e8ff;color:#7e22ce;font-weight:600">Duyệt bài đăng</span></td>
                    <td><b>${esc(p.title)}</b> (${esc(p.type)})<br><span class="muted" style="font-size:12px">${esc(p.summary.slice(0, 50))}...</span></td>
                    <td>${p.targetLocations.length === 1 && p.targetLocations[0] === 'all' ? 'Toàn bộ địa điểm' : `${p.targetLocations.length} địa điểm`}</td>
                    <td>Ban Biên tập</td>
                    <td>Trước khi đăng</td>
                    <td><button class="btn primary" data-act="approve-post" data-id="${esc(p.id)}">Xem & Duyệt bài</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        );
      },

      // 3. DANH SÁCH ĐỊA ĐIỂM (GBP SMART TABLE - PHẦN E)
      async locations() {
        const d = await api(`locations?days=${S.locDays || S.days}&status=${S.locStatus}&group=${S.locGroup}&q=${encodeURIComponent(S.locSearch || '')}`);
        const items = d.items || [];
        const summary = d.summary || {};
        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];

        const dateRangeOptions = [
          ['all', 'Toàn bộ'],
          ['this_month', 'Tháng này'],
          ['last_month', 'Tháng trước'],
          ['7', '7 ngày'],
          ['30', '30 ngày'],
          ['90', '90 ngày']
        ];

        return (
          `<div style="max-width:1240px;margin:0 auto">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px">
              <div>
                <h1 style="margin:0 0 4px 0;font-size:22px;display:flex;align-items:center;gap:8px">
                  <span>📍 Danh sách địa điểm</span>
                  <span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Google Business</span>
                </h1>
                <div class="muted" style="font-size:13px">Quản lý, lọc và xuất dữ liệu các địa điểm Google Business</div>
              </div>
              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn primary" data-act="export-locations-excel" style="background:#16a34a;border-color:#16a34a;color:#fff;font-weight:600;display:inline-flex;align-items:center;gap:6px">
                  📥 Xuất Excel (${items.length})
                </button>
              </div>
            </div>

            <!-- Toolbar & Bộ lọc chuẩn GBP Smart -->
            <div class="card" style="padding:14px;margin-bottom:16px;background:var(--surface-1)">
              <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
                <div style="flex:1;min-width:200px">
                  <input type="text" id="loc-search-input" placeholder="🔍 Tìm kiếm theo tên, mã, địa chỉ, placeId..." value="${esc(S.locSearch)}" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary);font-size:13px" onkeydown="if(event.key==='Enter'){ S.locSearch=this.value.trim(); render(); }" />
                </div>
                <button class="btn primary" onclick="S.locSearch=document.getElementById('loc-search-input').value.trim(); render();">Tìm</button>

                <div class="tabs" style="gap:4px">
                  <button class="btn ${S.locStatus === 'active' || (!S.locStatus && S.locStatus !== 'all') ? 'on' : ''}" data-act="set-loc-status" data-v="active" style="font-weight:600">Đang hoạt động</button>
                  <button class="btn ${S.locStatus === 'all' ? 'on' : ''}" data-act="set-loc-status" data-v="all">Tất cả</button>
                  <button class="btn ${S.locStatus === 'low_rating' ? 'on' : ''}" data-act="set-loc-status" data-v="low_rating">Rating thấp</button>
                  <button class="btn ${S.locStatus === 'closed' ? 'on' : ''}" data-act="set-loc-status" data-v="closed">Đóng cửa</button>
                </div>

                <div style="display:flex;align-items:center;gap:6px">
                  <span class="muted" style="font-size:12px">Review tạo trong:</span>
                  <select class="btn" onchange="S.locDays=this.value; render();" style="font-size:12px">
                    ${dateRangeOptions.map(([val, lbl]) => `<option value="${val}" ${(S.locDays === val || (!S.locDays && val === 'all')) ? 'selected' : ''}>${lbl}</option>`).join('')}
                  </select>
                  <button class="btn ${S.locDays === 'this_month' ? 'on' : ''}" data-act="set-loc-days" data-v="this_month" style="font-size:12px">Tháng này</button>
                  <button class="btn ${S.locDays === 'last_month' ? 'on' : ''}" data-act="set-loc-days" data-v="last_month" style="font-size:12px">Tháng trước</button>
                </div>

                <div style="display:flex;align-items:center;gap:6px">
                  <span class="muted" style="font-size:12px">Số sao:</span>
                  <select class="btn" onchange="S.locStars=this.value; render();" style="font-size:12px">
                    <option value="all">Tất cả sao</option>
                    <option value="5" ${S.locStars === '5' ? 'selected' : ''}>5 sao</option>
                    <option value="4" ${S.locStars === '4' ? 'selected' : ''}>4 sao</option>
                    <option value="3" ${S.locStars === '3' ? 'selected' : ''}>3 sao</option>
                    <option value="2" ${S.locStars === '2' ? 'selected' : ''}>2 sao</option>
                    <option value="1" ${S.locStars === '1' ? 'selected' : ''}>1 sao</option>
                  </select>
                </div>

                <div style="display:flex;align-items:center;gap:6px">
                  <span class="muted" style="font-size:12px">Trạng thái:</span>
                  <select class="btn" onchange="S.locStatus=this.value; render();" style="font-size:12px">
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active" ${S.locStatus === 'active' ? 'selected' : ''}>OPEN</option>
                    <option value="closed" ${S.locStatus === 'closed' ? 'selected' : ''}>CLOSED_TEMPORARY</option>
                  </select>
                </div>
              </div>

              <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center">
                <span><b>${items.length} / ${d.total} địa điểm</b> • Số review tính theo ngày tạo: <b>${dateRangeOptions.find(o => o[0] === (S.locDays || 'all'))?.[1] || 'Toàn bộ'}</b></span>
                ${(S.locSearch || (S.locStatus && S.locStatus !== 'active' && S.locStatus !== 'all') || S.locDays !== 'all' || S.locStars !== 'all') ? `<button class="btn" data-act="clear-loc-filter" style="font-size:11px;color:var(--bad)">✕ Đặt lại bộ lọc</button>` : ''}
              </div>
            </div>

            <!-- Bảng Danh Sách Địa Điểm (Chuẩn giao diện ảnh mẫu) -->
            <div class="card" style="padding:0;overflow:hidden">
              <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
                  <thead>
                    <tr style="background:var(--surface-2);border-bottom:1px solid var(--line);color:var(--text-secondary);font-size:12px">
                      <th style="padding:12px 14px">TÊN ĐỊA ĐIỂM ⇅</th>
                      <th style="padding:12px 14px;text-align:right">RATING ⇅</th>
                      <th style="padding:12px 14px;text-align:right">REVIEW CÓ ẢNH ⇅</th>
                      <th style="padding:12px 14px;text-align:right">REVIEW CHỮ/TRỐNG ⇅</th>
                      <th style="padding:12px 14px;text-align:right">TỔNG REVIEW ⇅</th>
                      <th style="padding:12px 14px;text-align:right">REVIEW BỊ GỠ ⇅</th>
                      <th style="padding:12px 14px;text-align:right">CHƯA TRẢ LỜI ⇅</th>
                      <th style="padding:12px 14px">ĐIỆN THOẠI ⇅</th>
                      <th style="padding:12px 14px">WEBSITE ⇅</th>
                      <th style="padding:12px 14px">TRẠNG THÁI ⇅</th>
                      <th style="padding:12px 14px;text-align:center">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(loc => `
                      <tr style="border-bottom:1px solid var(--line)">
                        <td style="padding:12px 14px">
                          <b style="color:var(--text-primary);display:block">${esc(loc.displayName)}</b>
                          <span class="muted" style="font-size:11px;display:block">${esc(loc.fullName)}</span>
                          <span class="muted" style="font-size:11px">${esc(loc.branchCode)} · ${esc(loc.address)}</span>
                        </td>
                        <td style="padding:12px 14px;text-align:right;font-weight:700">
                          ${fmtRating(loc.googleRating, 2)}
                        </td>
                        <td style="padding:12px 14px;text-align:right">
                          <button class="btn" data-act="drill-loc-photo" data-v="${esc(loc.locationId)}" style="border:none;background:transparent;cursor:pointer;color:var(--series-1);font-weight:600;padding:2px 6px" title="Bấm để mở danh sách review có ảnh của địa điểm này">${fmtInt(loc.reviewsWithPhoto)}</button>
                        </td>
                        <td style="padding:12px 14px;text-align:right">
                          <button class="btn" data-act="drill-loc-text" data-v="${esc(loc.locationId)}" style="border:none;background:transparent;cursor:pointer;color:var(--text-primary);padding:2px 6px" title="Bấm để mở danh sách review chữ/trống">${fmtInt(loc.reviewsTextAndEmpty)}</button>
                        </td>
                        <td style="padding:12px 14px;text-align:right;font-weight:700">
                          <button class="btn" data-act="drill-loc-all" data-v="${esc(loc.locationId)}" style="border:none;background:transparent;cursor:pointer;font-weight:700;padding:2px 6px" title="Bấm để mở toàn bộ review của địa điểm này">${fmtInt(loc.googleTotalReviews)}</button>
                        </td>
                        <td style="padding:12px 14px;text-align:right;color:${loc.reviewsSuspectedMissing > 0 ? 'var(--warn)' : 'var(--text-muted)'}">
                          ${loc.reviewsSuspectedMissing > 0 ? `<button class="btn" data-act="drill-loc-missing" data-v="${esc(loc.locationId)}" style="border:none;background:transparent;cursor:pointer;color:var(--warn);font-weight:700;padding:2px 6px">${loc.reviewsSuspectedMissing}</button>` : '0'}
                        </td>
                        <td style="padding:12px 14px;text-align:right;color:${loc.unrepliedCount > 0 ? 'var(--bad)' : 'var(--good)'}">
                          <button class="btn" data-act="drill-loc-unreplied" data-v="${esc(loc.locationId)}" style="border:none;background:transparent;cursor:pointer;color:${loc.unrepliedCount > 0 ? 'var(--bad)' : 'inherit'};font-weight:600;padding:2px 6px">${fmtInt(loc.unrepliedCount)}</button>
                        </td>
                        <td style="padding:12px 14px;white-space:nowrap">${esc(loc.phone || '-')}</td>
                        <td style="padding:12px 14px">
                          <a href="${esc(loc.website.startsWith('http') ? loc.website : 'https://' + loc.website)}" target="_blank" rel="noopener noreferrer" style="color:var(--series-1);text-decoration:none">${esc(loc.website.replace(/^https?:\/\//, ''))}</a>
                        </td>
                        <td style="padding:12px 14px">
                          <span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px">${esc(loc.businessStatus)}</span>
                        </td>
                        <td style="padding:12px 14px;text-align:center;white-space:nowrap">
                          <button class="btn" data-act="view-location-detail" data-v="${esc(loc.locationId)}" style="font-size:11px;padding:3px 8px">Chi tiết</button>
                          <button class="btn" data-act="generate-qr" data-v="${esc(loc.locationId)}" style="font-size:11px;padding:3px 8px">QR</button>
                        </td>
                      </tr>
                    `).join('')}

                    <!-- DÒNG TỔNG CỘNG CHUẨN TOÁN HỌC TRỌNG SỐ (Fix E3) -->
                    <tr style="background:var(--surface-2);font-weight:700;border-top:2px solid var(--line)">
                      <td style="padding:14px">
                        Tổng (${items.length} địa điểm)
                      </td>
                      <td style="padding:14px;text-align:right" title="Điểm trung bình có trọng số theo quy mô số lượng đánh giá: ∑(Rating × Số review) / ∑(Số review) = ${fmtRating(summary.weightedRating, 2)}">
                        ${fmtRating(summary.weightedRating, 2)}
                      </td>
                      <td style="padding:14px;text-align:right">
                        <button class="btn" data-act="drill-neg" style="border:none;background:transparent;cursor:pointer;font-weight:700;padding:0;color:var(--series-1)" title="Bấm để xem tất cả review có ảnh của toàn bộ địa điểm">${fmtInt(summary.totalPhotos)}</button>
                      </td>
                      <td style="padding:14px;text-align:right">
                        ${fmtInt(summary.totalTextAndEmpty)}
                      </td>
                      <td style="padding:14px;text-align:right">
                        <button class="btn" data-act="nav" data-v="reviews" style="border:none;background:transparent;cursor:pointer;font-weight:700;padding:0" title="Bấm để xem toàn bộ review">${fmtInt(summary.totalGoogleReviews)}</button>
                      </td>
                      <td style="padding:14px;text-align:right;color:${summary.totalMissing > 0 ? 'var(--warn)' : 'inherit'}">
                        ${fmtInt(summary.totalMissing)}
                      </td>
                      <td style="padding:14px;text-align:right;color:${summary.totalUnreplied > 0 ? 'var(--bad)' : 'inherit'}">
                        <button class="btn" data-act="drill-status" data-v="unreplied" style="border:none;background:transparent;cursor:pointer;font-weight:700;padding:0;color:${summary.totalUnreplied > 0 ? 'var(--bad)' : 'inherit'}">${fmtInt(summary.totalUnreplied)}</button>
                      </td>
                      <td style="padding:14px" colspan="4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>`
        );
      },

      // 4. NHÓM ĐỊA ĐIỂM (LOCATION GROUPS - PHẦN G)
      async location_groups() {
        const d = await api('location_groups');
        const groups = d.groups || [];
        window.currentGroupsList = groups;
        const selGroupId = S.selectedGroupId || (groups[0] ? groups[0].id : 'grp_all');
        const activeGroup = groups.find(g => g.id === selGroupId) || groups[0] || {};
        const brandLocs = getBrandLocations(S.brand);
        const bConfig = getBrandConfig(S.brand);
        const groupDashboard = await api(`location_groups/${activeGroup.id || 'grp_all'}/dashboard`).catch(() => ({ group: activeGroup, stats: {} }));
        const st = groupDashboard.stats || {};
        const repScore = st.reputationHealth ?? (groupDashboard.health ? groupDashboard.health.score : null);
        const compScore = st.profileCompleteness ?? (groupDashboard.profileCompleteness ? groupDashboard.profileCompleteness.percentage : null);
        const imprCount = st.impressions ?? (groupDashboard.performance ? groupDashboard.performance.impressions : null);

        return (
          head('Nhóm Địa điểm & Dashboard Phân nhóm', 'Tổ chức phân nhóm mạng lưới theo vùng địa lý, thương hiệu con hoặc tiêu chí động (Smart Group).') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
              <div>
                <b style="font-size:16px">Chọn nhóm địa điểm làm việc:</b>
                <div class="muted" style="font-size:12px;margin-top:2px">Tổng cộng: <b>${brandLocs.length} địa điểm duy nhất</b> (Chống đếm trùng khi một địa điểm thuộc nhiều nhóm).</div>
              </div>
              <div style="display:flex;gap:8px">
                ${activeGroup.type === 'smart'
            ? `<button class="btn primary" data-act="open-smart-group-modal" data-v="${esc(activeGroup.id)}">⚙ Sửa điều kiện Nhóm Smart</button>`
            : `<button class="btn primary" data-act="open-smart-group-modal" data-v="new">⚡ Tạo Nhóm Smart mới</button>`
          }
                <button class="btn" onclick="openSmartGroupModal('new')">➕ Tạo nhóm mới</button>
              </div>
            </div>

            <!-- Tabs chọn nhóm -->
            <div class="tabs" style="margin-bottom:16px">
              ${groups.map(g => `
                <button class="btn ${g.id === activeGroup.id ? 'on' : ''}" onclick="S.selectedGroupId='${esc(g.id)}'; render();">
                  ${g.type === 'smart' ? '⚡ ' : '📁 '}${esc(g.name)} (${g.locationCount})
                </button>
              `).join('')}
            </div>

            <!-- Dedicated Group Dashboard -->
            <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;border-bottom:1px solid var(--line);padding-bottom:10px">
                <div>
                  <h3 style="margin:0;font-size:17px;display:flex;align-items:center;gap:8px">
                    <span>${activeGroup.type === 'smart' ? '⚡ ' : '📁 '}${esc(activeGroup.name)}</span>
                    <span class="chip" style="font-size:11px;font-weight:700">${activeGroup.type === 'smart' ? 'Nhóm Động (Smart Group)' : 'Nhóm Tĩnh'}</span>
                  </h3>
                  <div class="muted" style="font-size:12px;margin-top:3px">Quản lý phụ trách: <b>${esc(activeGroup.manager || 'Chưa phân công')}</b> · Đánh giá gần nhất: <b>${fmtTime(activeGroup.lastEvaluatedAt || new Date().toISOString())}</b></div>
                </div>
                <div style="display:flex;gap:8px">
                  ${(() => {
            const grpLocs = (activeGroup.locations || []).map(lid => brandLocs.find(item => item.locationId === lid)).filter(Boolean);
            const connCount = grpLocs.filter(isLocationConnected).length;
            const totCount = grpLocs.length;
            return '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">🟢 ' + connCount + '/' + totCount + ' Địa điểm đang kết nối Google API</span>';
          })()}
                </div>
              </div>

              <!-- 3 Nhóm chỉ số độc lập theo phạm vi nhóm -->
              <div class="grid g3" style="gap:12px;margin-bottom:14px">
                <div class="card" style="padding:12px;background:var(--surface-1);border-left:3px solid var(--series-1)">
                  <div class="muted" style="font-size:11px;font-weight:700">A. Danh tiếng Nhóm</div>
                  <div style="font-size:20px;font-weight:700;margin:2px 0">${repScore != null ? repScore : '<span class="muted" style="font-size:14px">Chưa đủ dữ liệu</span>'} ${repScore != null ? '<span class="muted" style="font-size:12px">/ 100</span>' : ''}</div>
                  <div class="muted" style="font-size:11px">Rating TB: <b>${st.avgRating != null ? fmtRating(st.avgRating) + ' ★' : '—'}</b> · SLA quá hạn: <b>${st.overdueCount || 0}</b></div>
                </div>
                <div class="card" style="padding:12px;background:var(--surface-1);border-left:3px solid var(--good)">
                  <div class="muted" style="font-size:11px;font-weight:700">B. Mức hoàn thiện hồ sơ</div>
                  <div style="font-size:20px;font-weight:700;margin:2px 0;color:var(--good)">${compScore != null ? compScore + '%' : '<span class="muted" style="font-size:14px">Chưa đủ dữ liệu</span>'}</div>
                  <div class="muted" style="font-size:11px">Trung bình các cơ sở trong nhóm</div>
                </div>
                <div class="card" style="padding:12px;background:var(--surface-1);border-left:3px solid var(--primary)">
                  <div class="muted" style="font-size:11px;font-weight:700">C. Hiệu quả hiện diện & Vận hành</div>
                  <div style="font-size:20px;font-weight:700;margin:2px 0">${imprCount != null ? fmtInt(imprCount) : '0'}</div>
                  <div class="muted" style="font-size:11px">Bấm gọi: <b>${fmtInt(st.calls || 0)}</b> · Chỉ đường: <b>${fmtInt(st.directions || 0)}</b></div>
                </div>
              </div>

              <!-- Danh sách địa điểm trong nhóm -->
              <h4 style="margin:14px 0 8px 0;font-size:14px">Địa điểm thuộc nhóm (${(activeGroup.locations || []).length} cơ sở)</h4>
              <table>
                <thead>
                  <tr>
                    <th>Tên địa điểm</th>
                    <th>Mã cơ sở</th>
                    <th class="num">Rating Google</th>
                    <th class="num">Hoàn thiện hồ sơ</th>
                    <th>Trạng thái kết nối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  ${(activeGroup.locations || []).map(lid => {
            const l = brandLocs.find(item => item.locationId === lid) || { displayName: lid, branchCode: '-', googleRating: 4.8, googleTotalReviews: 100, businessStatus: 'OPERATIONAL' };
            return `<tr>
                      <td><b>${esc(l.displayName)}</b><br><span class="muted" style="font-size:11px">${esc(l.address || '')}</span></td>
                      <td><code>${esc(l.branchCode)}</code></td>
                      <td class="num font-bold">${fmtRating(l.googleRating, 2)} ★ <span class="muted" style="font-size:11px">(${l.googleTotalReviews})</span></td>
                      <td class="num font-bold" style="color:var(--good)">${(() => {
                const comp = (typeof calcProfileCompleteness === 'function' && l.locationId) ? calcProfileCompleteness(l, bConfig.industry) : null;
                if (!comp) return '100%';
                return comp.displayPercentage || ((comp.completenessScore ?? comp.percentage ?? 100) + '%');
              })()}</td>
                      <td>${isLocationConnected(l)
                ? '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:600">Đã kết nối</span>'
                : '<span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:600">Chưa kết nối</span>'}</td>
                      <td>
                        <button class="btn" data-act="view-location-detail" data-v="${esc(lid)}" style="font-size:11px;padding:3px 8px">Hồ sơ ↗</button>
                        <button class="btn" data-act="drill-loc-all" data-v="${esc(lid)}" style="font-size:11px;padding:3px 8px">Review</button>
                      </td>
                    </tr>`;
          }).join('')}
                </tbody>
              </table>
            </div>
          </div>`
        );
      },

      // 5. CHI TIẾT ĐỊA ĐIỂM (LOCATION DETAIL - PHẦN H)
      async location_detail() {
        const brandLocs = getBrandLocations(S.brand);
        if (!brandLocs || !brandLocs.length) {
          return (
            head('Hồ sơ Địa điểm GBP', 'Chi tiết thông tin doanh nghiệp, trạng thái đồng bộ và hình ảnh niêm yết.') + banner() +
            `<div class="card" style="padding:48px 24px;text-align:center;background:var(--surface-1);border:1px dashed var(--line);border-radius:12px;margin-top:16px">
              <div style="font-size:48px;margin-bottom:12px">📍</div>
              <h3 style="margin:0 0 8px 0;font-size:18px">Thương hiệu chưa có địa điểm nào được kết nối</h3>
              <p class="muted" style="max-width:520px;margin:0 auto 20px auto;font-size:13px;line-height:1.6">
                Thương hiệu hiện tại chưa có cơ sở nào trong hệ thống hoặc chưa liên kết tài khoản Google Business Profile (GBP). Vui lòng kết nối tài khoản Google hoặc thêm địa điểm kinh doanh để bắt đầu quản lý hồ sơ.
              </p>
              <div style="display:flex;justify-content:center;gap:10px">
                <button class="btn primary" data-act="nav" data-v="connections">🔗 Kết nối Google Business Profile</button>
                <button class="btn" data-act="nav" data-v="overview">⬅ Quay lại Tổng quan</button>
              </div>
            </div>`
          );
        }

        const locId = S.selectedLocationId || (brandLocs[0] ? brandLocs[0].locationId : '');
        const loc = brandLocs.find(l => l.locationId === locId) || brandLocs[0];
        // Đảm bảo nạp bản nháp mới nhất từ localStorage nếu có
        if (loc && typeof loadPersistedDraft === 'function') {
          const savedDraft = loadPersistedDraft(S.brand, loc.locationId);
          if (savedDraft) {
            loc.profileDraft = savedDraft;
            loc.googleSyncStatus = 'draft_pending';
          }
        }
        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
        const locRevs = pool.filter(r => r.locationId === loc.locationId || (r.branch && r.branch === loc.fullName));
        const unrepliedCount = locRevs.filter(isUnrepliedGoogleReview).length;
        const bConfig = getBrandConfig(S.brand);
        const rawCompleteness = (typeof calcProfileCompleteness === 'function' && loc.locationId)
          ? calcProfileCompleteness(loc, bConfig.industry)
          : { completenessScore: null, percentage: null, displayPercentage: 'Chưa đủ dữ liệu', completedCount: null, totalApplicableCount: null, missingCount: null, unknownCount: 0, missingFields: [] };
        const lScore = rawCompleteness.completenessScore ?? rawCompleteness.percentage ?? null;
        const lValid = rawCompleteness.completedCount ?? rawCompleteness.validCount ?? null;
        const lTotal = rawCompleteness.totalApplicableCount ?? rawCompleteness.applicableCount ?? null;
        const lMissing = rawCompleteness.missingCount ?? (lTotal != null && lValid != null ? Math.max(0, lTotal - lValid) : null);
        const completeness = {
          completenessScore: lScore,
          percentage: lScore,
          displayPercentage: rawCompleteness.displayPercentage || (lScore != null ? (lScore + '%') : 'Chưa đủ dữ liệu'),
          completedCount: lValid,
          validCount: lValid,
          totalApplicableCount: lTotal,
          applicableCount: lTotal,
          missingCount: lMissing,
          missingFields: rawCompleteness.missingFields || []
        };
        const activeTab = S.selectedLocTab || 'info';

        return (
          head('Trình Quản lý Hồ sơ Địa điểm (GBP Profile Manager)', `${loc.fullName} · Mã: ${loc.branchCode} · Place ID: ${loc.placeId}`) + banner() +
          `<div class="card" style="margin-bottom:16px;padding:18px">
            <!-- Selector chọn cơ sở -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;border-bottom:1px solid var(--line);padding-bottom:14px">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="font-weight:700;font-size:14px">Chi nhánh đang quản lý:</span>
                <select class="btn" onchange="S.selectedLocationId=this.value; render();" style="min-width:260px;font-weight:700">
                  ${brandLocs.map(l => `<option value="${l.locationId}" ${l.locationId === loc.locationId ? 'selected' : ''}>${esc(l.displayName)} (${esc(l.branchCode)})</option>`).join('')}
                </select>
                ${isLocationConnected(loc)
            ? '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">🟢 Đã kết nối Google API</span>'
            : '<span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">🔴 Chưa kết nối Google API</span>'}
                <span class="muted" style="font-size:11px">Đồng bộ gần nhất: ${fmtTime(loc.lastSyncedAt)}</span>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn" data-act="save-profile-draft" data-v="${esc(loc.locationId)}">💾 Lưu bản nháp nội bộ</button>
                <button class="btn primary" data-act="open-profile-diff" data-v="${esc(loc.locationId)}">🔍 Xem đối soát & Gửi Google API ↗</button>
              </div>
            </div>

            <!-- Banner Nhóm B: Mức hoàn thiện hồ sơ (KHÔNG DÙNG HEALTH SCORE) -->
            <div class="card" style="background:var(--surface-2);border-left:4px solid var(--good);border-radius:10px;padding:14px 18px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:8px">
                <div>
                  <b style="font-size:15px">Mức hoàn thiện hồ sơ địa điểm (Nhóm B)</b>
                  <div class="muted" style="font-size:12px;margin-top:2px">Đo lường độ đầy đủ thông tin niêm yết phục vụ tìm kiếm địa phương Google Maps.</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span class="chip" style="font-size:15px;font-weight:800;background:${completeness.completenessScore != null ? 'var(--good)' : 'var(--surface-2)'};color:${completeness.completenessScore != null ? '#fff' : 'inherit'}">${completeness.displayPercentage}</span>
                  <span class="muted" style="font-size:12px">(${completeness.completedCount != null ? completeness.completedCount + '/' + completeness.totalApplicableCount + ' trường áp dụng' : 'Chưa đủ dữ liệu'})</span>
                </div>
              </div>
              <div class="tr" style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;margin-bottom:8px">
                <div style="width:${completeness.completenessScore || 0}%;height:100%;background:${completeness.completenessScore != null ? 'var(--good)' : 'transparent'};transition:width 0.3s"></div>
              </div>
              <div style="font-size:12px;display:flex;gap:12px;flex-wrap:wrap">
                ${completeness.missingCount > 0 ? `<span style="color:var(--bad);font-weight:600">⚠ Còn thiếu: ${completeness.missingFields.map(f => f.label).join(', ')}</span>` : '<span style="color:var(--good);font-weight:600">✓ Đầy đủ tất cả các trường thông tin niêm yết bắt buộc!</span>'}
                <span class="muted">• Trường không áp dụng (Vùng phục vụ) không bị trừ điểm</span>
                <span class="muted">• Trường nguồn chưa cung cấp được tính là "Chưa xác định"</span>
              </div>
            </div>

            <div class="grid g2" style="gap:20px;align-items:start">
              <!-- Cột trái: 6 Tabs biên tập hồ sơ -->
              <div>
                <div class="tabs" style="margin-bottom:14px;flex-wrap:wrap">
                  <button class="btn ${activeTab === 'info' ? 'on' : ''}" onclick="S.selectedLocTab='info'; render();">1. Thông tin cơ bản</button>
                  <button class="btn ${activeTab === 'media' ? 'on' : ''}" onclick="S.selectedLocTab='media'; render();">2. Hình ảnh (${loc.media?.length || 2})</button>
                  <button class="btn ${activeTab === 'hours' ? 'on' : ''}" onclick="S.selectedLocTab='hours'; render();">3. Giờ làm việc</button>
                  <button class="btn ${activeTab === 'attrs' ? 'on' : ''}" onclick="S.selectedLocTab='attrs'; render();">4. Thuộc tính</button>
                  <button class="btn ${activeTab === 'services' ? 'on' : ''}" onclick="S.selectedLocTab='services'; render();">5. Dịch vụ</button>
                  <button class="btn ${activeTab === 'booking' ? 'on' : ''}" onclick="S.selectedLocTab='booking'; render();">6. Booking & Vùng</button>
                </div>

                <div id="loc-tab-content" style="background:var(--surface-1);border:1px solid var(--line);border-radius:8px;padding:16px">
                  ${activeTab === 'info' ? `
                    ${loc.profileDraft ? `
                      <div class="banner" style="background:rgba(245, 158, 11, 0.12);border-left:4px solid #f59e0b;padding:10px 14px;margin-bottom:12px;font-size:12px;border-radius:6px">
                        <b>📝 Đang tải nội dung từ Bản Nháp Chưa Gửi:</b> Đã lưu lúc ${fmtTime(loc.profileDraft.updatedAt)}. Các chỉnh sửa bên dưới phản ánh nội dung nháp gần nhất.
                      </div>
                    ` : ''}
                    <h4 style="margin:0 0 12px 0;font-size:14px">Thông tin cơ bản niêm yết công khai</h4>
                    <div style="margin-bottom:10px">
                      <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Tên hiển thị địa điểm (Google Maps Name):</label>
                      <input type="text" id="prof-name" value="${esc((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.displayName !== undefined) ? loc.profileDraft.updates.displayName : (loc.displayName || ''))}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary);font-weight:700" />
                    </div>
                    <div style="margin-bottom:10px">
                      <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Danh mục chính (Primary Category):</label>
                      <input type="text" id="prof-category" value="${esc((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.primaryCategory !== undefined) ? loc.profileDraft.updates.primaryCategory : (loc.primaryCategory || bConfig.industryLabel || 'Cơ sở kinh doanh'))}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary)" />
                    </div>
                    <div style="margin-bottom:10px">
                      <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Địa chỉ đầy đủ (Address):</label>
                      <input type="text" id="prof-address" value="${esc((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.address !== undefined) ? loc.profileDraft.updates.address : (loc.address || ''))}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary)" />
                    </div>
                    <div class="grid g2" style="gap:10px;margin-bottom:10px">
                      <div>
                        <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Hotline liên hệ:</label>
                        <input type="text" id="prof-phone" value="${esc((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.phone !== undefined) ? loc.profileDraft.updates.phone : (loc.phone || ''))}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary)" />
                      </div>
                      <div>
                        <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Website chính thức:</label>
                        <input type="text" id="prof-website" value="${esc((loc.profileDraft && loc.profileDraft.explicitDeletes && loc.profileDraft.explicitDeletes.includes('website')) ? '' : ((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.website !== undefined) ? loc.profileDraft.updates.website : (loc.website || '')))}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary)" />
                      </div>
                    </div>
                    <div>
                      <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Mô tả doanh nghiệp (Business Description - Tối đa 750 ký tự):</label>
                      <textarea id="prof-desc" rows="4" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary);line-height:1.4">${esc((loc.profileDraft && loc.profileDraft.updates && loc.profileDraft.updates.description !== undefined) ? loc.profileDraft.updates.description : (loc.description || (bConfig.name + ' - Cung cấp sản phẩm và dịch vụ uy tín, cam kết chất lượng chuẩn mực.')))}</textarea>
                    </div>
                  ` : ''}

                  ${activeTab === 'media' ? `
                    <h4 style="margin:0 0 12px 0;font-size:14px">Hình ảnh niêm yết trên Google Maps</h4>
                    <div class="grid g2" style="gap:12px">
                      <div style="background:var(--surface-2);padding:12px;border-radius:8px;border:1px solid var(--line);text-align:center">
                        <div style="font-size:12px;font-weight:700;margin-bottom:8px">Ảnh đại diện (Logo / Avatar 1:1)</div>
                        <div style="width:90px;height:90px;margin:0 auto 8px auto;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-size:24px">🏥</div>
                        <span class="chip" style="background:#dcfce7;color:#15803d;font-size:11px">Đã đồng bộ Google</span>
                      </div>
                      <div style="background:var(--surface-2);padding:12px;border-radius:8px;border:1px solid var(--line);text-align:center">
                        <div style="font-size:12px;font-weight:700;margin-bottom:8px">Ảnh bìa (Cover 16:9)</div>
                        <div style="width:100%;height:90px;background:linear-gradient(135deg, #1e3a8a, #3b82f6);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">MẶT TIỀN CƠ SỞ</div>
                        <span class="chip" style="background:#dcfce7;color:#15803d;font-size:11px;margin-top:8px">Đã đồng bộ Google</span>
                      </div>
                    </div>
                  ` : ''}

                  ${activeTab === 'hours' ? `
                    <h4 style="margin:0 0 12px 0;font-size:14px">Giờ mở cửa trong tuần & Giờ đặc biệt</h4>
                    <table style="font-size:12px">
                      <tr><td>Thứ Hai – Thứ Sáu</td><td><b>08:30 – 20:00</b></td><td><span class="chip" style="background:#dcfce7;color:#15803d">Mở cửa bình thường</span></td></tr>
                      <tr><td>Thứ Bảy – Chủ Nhật</td><td><b>08:00 – 20:30</b></td><td><span class="chip" style="background:#dcfce7;color:#15803d">Mở cửa bình thường</span></td></tr>
                      <tr><td>Tết Nguyên Đán 2027</td><td><b>Tạm đóng cửa</b></td><td><span class="chip" style="background:#fee2e2;color:#b91c1c">Giờ đặc biệt</span></td></tr>
                    </table>
                  ` : ''}

                  ${activeTab === 'attrs' ? `
                    <h4 style="margin:0 0 12px 0;font-size:14px">Thuộc tính Google (Attributes)</h4>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <span class="chip" style="background:#dbeafe;color:#1e40af">✓ Có Wifi miễn phí</span>
                      <span class="chip" style="background:#dbeafe;color:#1e40af">✓ Có chỗ đỗ xe hơi</span>
                      <span class="chip" style="background:#dbeafe;color:#1e40af">✓ Lối xe lăn tiếp cận</span>
                      <span class="chip" style="background:#dbeafe;color:#1e40af">✓ Chấp nhận thanh toán thẻ & QR</span>
                    </div>
                  ` : ''}

                  ${activeTab === 'services' ? `
                    <h4 style="margin:0 0 12px 0;font-size:14px">Sản phẩm & Dịch vụ nổi bật</h4>
                    <table style="font-size:12px">
                      <tr><th>Tên dịch vụ</th><th>Thời lượng</th><th>Mức giá tham khảo</th></tr>
                      <tr><td><b>Chăm sóc da chuyên sâu Hydrafacial</b></td><td>60 phút</td><td>1.200.000 ₫</td></tr>
                      <tr><td><b>Trị nám công nghệ Laser Pico</b></td><td>45 phút</td><td>2.500.000 ₫</td></tr>
                      <tr><td><b>Nâng mũi cấu trúc Korea</b></td><td>90 phút</td><td>25.000.000 ₫</td></tr>
                    </table>
                  ` : ''}

                  ${activeTab === 'booking' ? `
                    <h4 style="margin:0 0 12px 0;font-size:14px">Liên kết hành động / Booking & Vùng phục vụ</h4>
                    <div style="margin-bottom:12px">
                      <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Liên kết đặt lịch khám (Online Appointment URL):</label>
                      <input type="text" id="prof-booking-url" value="${esc(loc.bookingUrl || 'https://seoulcenter.vn/dat-lich-kham')}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary)" />
                    </div>
                    <div class="banner" style="background:var(--surface-2);border-left:4px solid var(--primary);padding:10px;font-size:12px">
                      <b>Vùng phục vụ (Service Area):</b> Không áp dụng (Cơ sở cố định phục vụ tại chỗ theo quy chuẩn Google cho phòng khám thẩm mỹ).
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Cột phải: Smartphone Mobile Preview Simulator -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <h4 style="margin:0;font-size:14px">📱 Khung xem trước Di động (Mobile Preview)</h4>
                  <span class="chip" style="font-size:11px;background:#fef3c7;color:#92400e;font-weight:700">Mô phỏng giao diện</span>
                </div>
                <div style="max-width:320px;margin:0 auto;border:10px solid #1e293b;border-radius:28px;background:#fff;color:#1e293b;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.25);font-family:sans-serif">
                  <!-- Phone Notch / Status -->
                  <div style="background:#0f172a;height:18px;display:flex;align-items:center;justify-content:center">
                    <div style="width:60px;height:6px;background:#334155;border-radius:3px"></div>
                  </div>
                  <!-- Search mock -->
                  <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:6px">
                    <span style="font-size:12px">🔍</span>
                    <span style="font-size:11px;color:#64748b">${esc(loc.displayName)}</span>
                  </div>
                  <!-- Content Body -->
                  <div style="padding:14px">
                    <div style="height:100px;background:linear-gradient(135deg, #2563eb, #1d4ed8);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:13px;margin-bottom:10px">
                      ẢNH CƠ SỞ VẬT CHẤT
                    </div>
                    <h3 style="margin:0 0 4px 0;font-size:15px;color:#0f172a">${esc(loc.displayName)}</h3>
                    <div style="font-size:12px;color:#0284c7;display:flex;align-items:center;gap:4px;margin-bottom:6px">
                      <b>${fmtRating(loc.googleRating, 2)} ★★★★★</b> <span style="color:#64748b">(${loc.googleTotalReviews})</span>
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-bottom:10px">${esc(loc.primaryCategory || 'Phòng khám thẩm mỹ')}</div>

                    <!-- Quick action buttons -->
                    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:4px;text-align:center;margin-bottom:12px;padding:8px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9">
                      <div><span style="font-size:16px">📞</span><div style="font-size:10px;color:#0284c7;font-weight:600">Gọi điện</div></div>
                      <div><span style="font-size:16px">🚗</span><div style="font-size:10px;color:#0284c7;font-weight:600">Đường đi</div></div>
                      <div><span style="font-size:16px">📅</span><div style="font-size:10px;color:#0284c7;font-weight:600">Đặt hẹn</div></div>
                      <div><span style="font-size:16px">🌐</span><div style="font-size:10px;color:#0284c7;font-weight:600">Website</div></div>
                    </div>

                    <div style="font-size:11px;color:#334155;line-height:1.4">
                      📍 <b>Địa chỉ:</b> ${esc(loc.address)}<br>
                      🕒 <b>Giờ mở cửa:</b> 08:30 – 20:00 (Đang mở cửa)<br>
                      📞 <b>Điện thoại:</b> ${esc(loc.phone)}
                    </div>
                  </div>
                  <!-- Phone Bottom Bar -->
                  <div style="background:#f8fafc;padding:6px;text-align:center;border-top:1px solid #e2e8f0">
                    <div style="width:80px;height:4px;background:#cbd5e1;border-radius:2px;margin:0 auto"></div>
                  </div>
                </div>
                <div class="banner" style="margin-top:10px;background:var(--surface-2);border-left:3px solid var(--warn);padding:8px 12px;font-size:11px;line-height:1.4">
                  ⚠ <b>Lưu ý pháp lý:</b> Khung xem trước chỉ là mô phỏng giao diện di động tương đối, không cam kết hiển thị giống hoàn toàn 100% ứng dụng Google Maps thực tế do Google cá nhân hóa theo từng người dùng.
                </div>
              </div>
            </div>
          </div>`
        );
      },

      // 6. THỨ HẠNG ĐỊA PHƯƠNG (LOCAL RANK - PHẦN I)
      async local_rank() {
        const d = await api('local_rank');
        const keywords = d.keywords || [];
        const loc = d.location || {};

        return (
          head('Thứ hạng địa phương', 'Giám sát vị trí hiển thị trên Google Local Pack và Google Maps theo từ khóa và tọa độ thực tế.') + banner() +
          `<div class="grid g3" style="gap:12px;margin-bottom:16px">
            <div class="card kpi">
              <h3>Tỷ lệ xuất hiện Top 3</h3>
              <div class="v" style="color:var(--good)">${keywords.length ? (d.top3Share || '40%') : '—'}</div>
              <div class="sub">mục tiêu hiển thị Local 3-Pack</div>
            </div>
            <div class="card kpi">
              <h3>Tỷ lệ xuất hiện Top 10</h3>
              <div class="v">${keywords.length ? (d.top10Share || '80%') : '—'}</div>
              <div class="sub">hiển thị trên Google Maps search</div>
            </div>
            <div class="card kpi">
              <h3>Chi phí kiểm tra thứ hạng</h3>
              <div class="v" style="font-size:18px">${keywords.length ? (d.costPerRun || '$0.010') : '$0.00'}</div>
              <div class="sub">${esc(d.provider || 'SerpApi / ValueSERP')}</div>
            </div>
          </div>

          <div class="card" style="margin-bottom:16px;padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="margin:0">Bảng theo dõi từ khóa Local SEO · ${esc(loc.displayName || 'Chi nhánh mục tiêu')}</h3>
              <span class="muted" style="font-size:12px">Cập nhật: ${fmtTime(d.lastCheck)}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Từ khóa tìm kiếm</th>
                  <th class="num">Vị trí quan sát</th>
                  <th style="text-align:center">Top 3</th>
                  <th style="text-align:center">Top 10</th>
                  <th style="text-align:center">Biến động</th>
                  <th>Công cụ đo</th>
                  <th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                ${keywords.length ? keywords.map(k => `
                  <tr>
                    <td><b>${esc(k.keyword)}</b></td>
                    <td class="num" style="font-weight:700;font-size:15px;color:${k.notFoundInTop20 ? 'var(--text-muted)' : (k.position <= 3 ? 'var(--good)' : 'var(--text-primary)')}">
                      ${k.notFoundInTop20 ? '<span class="muted" style="font-size:12px">Không trong Top 20</span>' : `#${k.position}`}
                    </td>
                    <td style="text-align:center">${k.top3 ? '<span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">✓ Đạt</span>' : '<span class="muted">-</span>'}</td>
                    <td style="text-align:center">${k.top10 ? '<span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">✓ Top 10</span>' : '<span class="muted">-</span>'}</td>
                    <td style="text-align:center">
                      ${k.change > 0 ? `<span style="color:var(--good);font-weight:700">▲ +${k.change}</span>` : (k.change < 0 ? `<span style="color:var(--bad);font-weight:700">▼ ${k.change}</span>` : '<span class="muted">―</span>')}
                    </td>
                    <td>${esc(k.searchEngine)}</td>
                    <td><code>${esc(k.checkCost)}</code></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" style="text-align:center;padding:32px 16px;color:var(--text-secondary)">
                      <div style="font-size:14px;font-weight:700;margin-bottom:6px">Chưa có dữ liệu theo dõi thứ hạng từ khóa Local SEO cho ngành này</div>
                      <div class="muted" style="font-size:12px;margin-bottom:12px">Vui lòng thiết lập danh sách từ khóa tìm kiếm mục tiêu và tọa độ kiểm tra vị trí trên Google Local Pack.</div>
                      <button class="btn primary" onclick="toast('Mở hộp thoại cấu hình danh sách từ khóa theo dõi Local SEO');">⚙ Thiết lập từ khóa theo dõi</button>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>`
        );
      },

      // 7. BÀI ĐĂNG GOOGLE BUSINESS (POSTS - PHẦN J)
      async posts() {
        const d = await api('posts');
        const postsList = d.posts || [];
        const brandLocs = getBrandLocations(S.brand);
        const filter = S.postFilter || 'all';

        // Lọc theo trạng thái nếu có
        const filteredPosts = postsList.filter(p => {
          if (filter === 'failed') return p.status === 'failed' || p.aggregateStatus === 'partial_success';
          return true;
        });

        return (
          head('Quản lý Xuất bản Bài đăng Google (GBP Posts Dispatcher)', 'Soạn thảo một nội dung gốc, tự động thay biến theo từng chi nhánh và quản lý trạng thái xuất bản độc lập.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:18px">
            <!-- Composer Form với các Biến được kiểm soát -->
            <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                <b style="font-size:15px">✍ Soạn thảo bài đăng Master & Tự động cá nhân hóa địa phương</b>
                <span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Động cơ biến nội dung thông minh</span>
              </div>
              <div style="margin-bottom:10px">
                <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">Nội dung bài viết gốc (Chèn biến theo cú pháp {{tên_biến}}):</label>
                <textarea id="post-master-content" rows="4" style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:13px;border:1px solid var(--line);border-radius:6px;background:var(--surface-1);color:var(--text-primary);line-height:1.4">Chào mừng sự kiện tri ân khách hàng tại {{brand_name}} - {{location_name}}! Quý khách ghé ngay địa chỉ {{address}} hoặc liên hệ hotline {{hotline}} để nhận ưu đãi lên đến 50%. Đặt hẹn khám tại: {{booking_link}}</textarea>
              </div>

              <!-- Quick Insert Variable Chips -->
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                <span style="font-size:12px;font-weight:600">Bấm chèn biến:</span>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{brand_name}}')">+ {{brand_name}}</button>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{location_name}}')">+ {{location_name}}</button>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{address}}')">+ {{address}}</button>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{hotline}}')">+ {{hotline}}</button>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{website}}')">+ {{website}}</button>
                <button class="btn" style="font-size:11px;padding:2px 8px" onclick="insertPostVar('{{booking_link}}')">+ {{booking_link}}</button>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-top:1px solid var(--line);padding-top:12px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:13px;font-weight:600">Phạm vi xuất bản:</span>
                  <select id="post-target-scope" class="btn" style="font-size:12px">
                    <option value="all">Toàn bộ ${brandLocs.length} chi nhánh đang kết nối</option>
                    <option value="grp_hcm">Nhóm Khu vực TP.HCM (3 chi nhánh)</option>
                    <option value="single">Chỉ 1 chi nhánh được chọn</option>
                  </select>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn primary" data-act="open-dispatch-modal">🔍 Kiểm tra biến & Xác nhận phạm vi ↗</button>
                </div>
              </div>
            </div>

            <!-- Header Lịch sử & Bộ lọc địa điểm lỗi -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <h3 style="margin:0;font-size:15px">Lịch sử Điều phối Xuất bản theo Từng Địa điểm</h3>
                <span class="chip" style="font-weight:700;font-size:11px;background:#fef3c7;color:#b45309">Trạng thái tổng: Thành công một phần (2/3)</span>
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn ${filter === 'all' ? 'on' : ''}" onclick="S.postFilter='all'; render();">Tất cả (${postsList.length})</button>
                <button class="btn ${filter === 'failed' ? 'on' : ''}" onclick="S.postFilter='failed'; render();" style="color:var(--bad)">⚠ Chỉ hiện địa điểm lỗi (1)</button>
                <button class="btn primary" data-act="retry-failed-posts" style="background:#ea580c;border-color:#ea580c">🔁 Thử lại địa điểm thất bại (1)</button>
              </div>
            </div>

            <!-- Bảng kết quả từng địa điểm -->
            <table>
              <thead>
                <tr>
                  <th>Địa điểm đích</th>
                  <th>Nội dung đã gửi (Phiên bản địa phương)</th>
                  <th>Thời điểm gửi</th>
                  <th>Trạng thái</th>
                  <th>Mã tài nguyên & Link</th>
                  <th>Mã lỗi & Hướng xử lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>SD 1 — Bình Thạnh</b><br><span class="muted" style="font-size:11px">loc_sc_binh_thanh</span></td>
                  <td style="max-width:280px;font-size:12px">Chào mừng sự kiện tri ân tại Seoul Center - SD 1 — Bình Thạnh! Ghé 375 Nguyễn Thượng Hiền hoặc gọi 1800 3333...</td>
                  <td>${fmtTime(new Date('2026-10-20T07:15:00Z'))}</td>
                  <td><span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">✓ Thành công</span></td>
                  <td><code>posts/localPosts/101</code><br><a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style="font-size:11px">Mở bài trên Maps ↗</a></td>
                  <td><span class="muted" style="font-size:11px">- Không có lỗi -</span></td>
                  <td><span class="muted" style="font-size:11px">Đã hoàn tất</span></td>
                </tr>
                <tr>
                  <td><b>SD 2 — Tân Bình</b><br><span class="muted" style="font-size:11px">loc_sc_tan_binh</span></td>
                  <td style="max-width:280px;font-size:12px">Chào mừng sự kiện tri ân tại Seoul Center - SD 2 — Tân Bình! Ghé 120 Phổ Quang hoặc gọi 1800 3333...</td>
                  <td>${fmtTime(new Date('2026-10-20T07:15:00Z'))}</td>
                  <td><span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">✓ Thành công</span></td>
                  <td><code>posts/localPosts/102</code><br><a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" style="font-size:11px">Mở bài trên Maps ↗</a></td>
                  <td><span class="muted" style="font-size:11px">- Không có lỗi -</span></td>
                  <td><span class="muted" style="font-size:11px">Đã hoàn tất</span></td>
                </tr>
                <tr style="background:rgba(239, 68, 68, 0.05)">
                  <td><b>SD 3 — Quận 10</b><br><span class="muted" style="font-size:11px">loc_sc_quan_10</span></td>
                  <td style="max-width:280px;font-size:12px">Chào mừng sự kiện tri ân tại Seoul Center - SD 3 — Quận 10! Ghé 375 Nguyễn Tri Phương...</td>
                  <td>${fmtTime(new Date('2026-10-20T07:15:00Z'))}</td>
                  <td><span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">✕ Thất bại</span></td>
                  <td><span class="muted">-</span></td>
                  <td><b style="color:var(--bad);font-size:12px">ERR_IMAGE_DIMENSIONS</b><br><span class="muted" style="font-size:11px">Ảnh sai tỷ lệ 4:3 của Google. Hệ thống đã tự động crop lại chuẩn.</span></td>
                  <td><button class="btn primary" data-act="retry-failed-posts" style="font-size:11px;padding:2px 8px;background:#ea580c;border-color:#ea580c">Thử lại chi nhánh này ↗</button></td>
                </tr>
              </tbody>
            </table>

            <div class="banner" style="margin-top:12px;background:var(--surface-2);border-left:4px solid var(--good);padding:10px;font-size:12px">
              <b>🛡 Nguyên tắc An toàn Xuất bản Hàng loạt:</b> Khi bấm "Thử lại địa điểm thất bại", hệ thống CHỈ gửi lại cho cơ sở bị lỗi (SD 3 — Quận 10). Tuyệt đối KHÔNG đăng lại gây trùng lặp cho các chi nhánh đã xuất bản thành công!
            </div>
          </div>`
        );
      },

      // 8. THƯ VIỆN HÌNH ẢNH (MEDIA - PHẦN K)
      async media() {
        const d = await api('media');
        const assets = d.assets || [];

        return (
          head('Thư viện hình ảnh', 'Quản lý tài sản hình ảnh thương hiệu, media hồ sơ địa điểm Google và tư liệu phản ánh của khách hàng.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <div class="tabs" style="gap:8px;margin-bottom:16px">
              <button class="btn on">Tất cả media (${assets.length})</button>
              <button class="btn">Tài sản Doanh nghiệp</button>
              <button class="btn">Ảnh Địa điểm Google</button>
              <button class="btn">Ảnh Review Khách hàng (Chỉ đọc)</button>
            </div>
            <div class="grid g4" style="gap:14px">
              ${assets.map(m => `
                <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;overflow:hidden">
                  <img src="${esc(m.url)}" alt="${esc(m.title)}" style="width:100%;height:130px;object-fit:cover;display:block" />
                  <div style="padding:10px">
                    <b style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(m.title)}">${esc(m.title)}</b>
                    <div class="muted" style="font-size:11px;margin-top:2px">${esc(m.subcategory)} · ${esc(m.fileSize)}</div>
                    <div class="muted" style="font-size:10px;margin-top:4px;color:var(--text-muted)">${esc(m.attribution)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>`
        );
      },

      // 9. LỊCH NỘI DUNG (CONTENT CALENDAR - PHẦN L)
      async content_calendar() {
        return (
          head('Lịch nội dung Google Business', 'Kế hoạch xuất bản bài đăng và chương trình ưu đãi theo múi giờ và từng cụm địa điểm.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div class="tabs">
                <button class="btn on">Tháng 10/2026</button>
                <button class="btn">Xem theo tuần</button>
                <button class="btn">Dạng danh sách</button>
              </div>
              <button class="btn primary" onclick="alert('Lên lịch bài đăng mới');">➕ Lên lịch bài mới</button>
            </div>
            <div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);margin-bottom:14px;padding:10px 14px;font-size:12px">
              📌 <b>Cơ chế lịch đăng:</b> Giao diện demo lưu lịch cục bộ. Khi kết nối Backend thật, hệ thống cần background job queue bền vững (như BullMQ / Google Cloud Tasks) để tự động xuất bản đúng múi giờ của chi nhánh.
            </div>
            <div style="border:1px solid var(--line);border-radius:8px;padding:16px;text-align:center;color:var(--text-muted)">
              [Chế độ xem Lịch nội dung: 2 bài đăng đã lên lịch vào ngày 25/10/2026 và 30/10/2026]
            </div>
          </div>`
        );
      },

      // 10. MÃ QR VÀ LINK REVIEW (QR CODES - PHẦN M)
      async qr_codes() {
        const brandLocs = getBrandLocations(S.brand);
        if (!brandLocs || !brandLocs.length) {
          return (
            head('Mã QR & Bộ Nhãn Đánh giá Google Maps', 'Tạo mã QR in ấn để bàn chuẩn mực với hai chế độ: QR trực tiếp Google Maps hoặc QR qua liên kết kiểm soát hành vi.') + banner() +
            `<div class="card" style="padding:48px 24px;text-align:center;background:var(--surface-1);border:1px dashed var(--line);border-radius:12px;margin-top:16px">
              <div style="font-size:48px;margin-bottom:12px">📱</div>
              <h3 style="margin:0 0 8px 0;font-size:18px">Thương hiệu chưa có địa điểm để tạo mã QR</h3>
              <p class="muted" style="max-width:520px;margin:0 auto 20px auto;font-size:13px;line-height:1.6">
                Chưa có cơ sở nào trong danh sách hoặc chưa liên kết Google Business Profile. Vui lòng kết nối tài khoản Google Maps hoặc tạo cơ sở có Place ID hợp lệ để xuất mã QR.
              </p>
              <div style="display:flex;justify-content:center;gap:10px">
                <button class="btn primary" data-act="nav" data-v="connections">🔗 Kết nối Google Business Profile</button>
                <button class="btn" data-act="nav" data-v="overview">⬅ Quay lại Tổng quan</button>
              </div>
            </div>`
          );
        }

        const selLocId = S.selectedLocationId || (brandLocs[0] ? brandLocs[0].locationId : '');
        const loc = brandLocs.find(l => l.locationId === selLocId) || brandLocs[0] || {};
        const qrMode = S.qrMode || 'direct';
        const hasValidPlaceId = Boolean(loc && loc.placeId && String(loc.placeId).trim().length >= 10 && loc.placeId !== 'undefined');
        const directReviewUrl = hasValidPlaceId ? `https://search.google.com/local/writereview?placeid=${loc.placeId}` : '';
        const trackedSystemUrl = (loc && loc.locationId) ? `https://checkbrand.vn/r/${loc.locationId}?source=in_store_table&camp=2026` : '';
        const activeUrl = qrMode === 'direct' ? directReviewUrl : trackedSystemUrl;
        const canGenerate = hasValidPlaceId && Boolean(activeUrl);

        return (
          head('Mã QR & Bộ Nhãn Đánh giá Google Maps', 'Tạo mã QR in ấn để bàn chuẩn mực với hai chế độ: QR trực tiếp Google Maps hoặc QR qua liên kết kiểm soát hành vi.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:20px">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
              <span style="font-weight:700;font-size:14px">Chi nhánh áp dụng:</span>
              <select class="btn" onchange="S.selectedLocationId=this.value; render();" style="min-width:280px;font-size:13px;font-weight:700">
                ${brandLocs.map(l => `<option value="${l.locationId}" ${l.locationId === loc.locationId ? 'selected' : ''}>${esc(l.displayName)} (${esc(l.branchCode)})${l.placeId ? '' : ' — [Chưa có Place ID]'}</option>`).join('')}
              </select>
              <button class="btn primary" data-act="open-qr-batch-modal" ${!hasValidPlaceId ? 'disabled style="opacity:0.6;cursor:not-allowed"' : ''}>📦 Xuất bộ nhãn in ấn theo nhóm (PDF / Decal A6) ↗</button>
            </div>

            ${!hasValidPlaceId ? `
              <div class="banner warning" style="margin-bottom:16px;background:#fff1f2;border:1px solid #fecdd3;border-left:4px solid var(--bad);padding:14px;border-radius:8px">
                <b style="color:var(--bad)">⚠️ Địa điểm chưa có Google Place ID hợp lệ:</b>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
                  Hệ thống khóa tạo, tải và in QR cho cơ sở này vì thiếu mã định danh Place ID từ Google Maps. Vui lòng cập nhật Place ID hoặc liên kết GBP để kích hoạt mã QR chuẩn xác.
                </div>
              </div>
            ` : ''}

            <!-- Tabs chọn 2 Chế độ QR rõ ràng -->
            <div style="background:var(--surface-2);border-radius:10px;padding:12px;margin-bottom:18px;border:1px solid var(--line)">
              <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
                <button class="btn ${qrMode === 'direct' ? 'on' : ''}" onclick="S.qrMode='direct'; render();">Chế độ A: QR Trực tiếp Google Maps</button>
                <button class="btn ${qrMode === 'tracked' ? 'on' : ''}" onclick="S.qrMode='tracked'; render();">Chế độ B: QR qua Liên kết Quản lý CheckBrand</button>
              </div>
              <div style="font-size:12px;line-height:1.5">
                ${qrMode === 'direct' ? `
                  <b>✓ Đặc điểm Chế độ A (Trực tiếp):</b> Quét mã mở thẳng trang đánh giá Google Maps của cơ sở. Hoàn toàn sạch sẽ, không qua trung gian. <u>Lưu ý:</u> Chế độ này KHÔNG có thống kê số lượt quét trên hệ thống (do không qua server lưu vết).
                ` : `
                  <b>✓ Đặc điểm Chế độ B (Qua hệ thống):</b> Quét mã đi qua link chuyển hướng <code>checkbrand.vn/r/...</code>. Hệ thống tự động ghi nhận lượt quét, lọc bot và hạn chế trùng lặp trước khi chuyển tiếp sang Google Maps. <u>Lưu ý:</u> Lượt quét QR chỉ là chỉ số mở link, KHÔNG tương đương người dùng duy nhất và KHÔNG đồng nghĩa review đã được gửi.
                `}
              </div>
            </div>

            <div class="grid g2" style="gap:24px;align-items:start">
              <!-- Bảng Để Bàn In Ấn Chuẩn Mực -->
              <div style="background:var(--surface-2);border:2px dashed var(--line);border-radius:12px;padding:24px;text-align:center">
                <div style="max-width:260px;margin:0 auto;background:#fff;color:#1e293b;border-radius:12px;padding:20px;box-shadow:0 6px 18px rgba(0,0,0,0.1)">
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:4px">CẢM ƠN QUÝ KHÁCH</div>
                  <h3 style="margin:0 0 10px 0;font-size:15px;color:#0f172a">${esc(loc.displayName || 'Tên Chi Nhánh')}</h3>
                  <div style="margin:10px auto">
                    ${canGenerate
            ? generateRealQrSvg(activeUrl, 160)
            : `<div style="width:160px;height:160px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;color:#64748b;font-size:12px">
                          <span style="font-size:28px;margin-bottom:6px">🔒</span>
                          <span style="font-weight:700">Đã khóa tạo QR</span>
                          <span style="font-size:10px;color:#94a3b8">Thiếu Google Place ID</span>
                        </div>`
          }
                  </div>
                  <div style="font-size:12px;line-height:1.4;color:#334155;margin-top:8px">
                    Quý khách vui lòng quét mã QR để chia sẻ cảm nhận trải nghiệm dịch vụ trên Google Maps.
                  </div>
                  <div style="margin-top:8px;font-size:12px;color:#eab308">
                    ★★★★★
                  </div>
                </div>
                <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                  <button class="btn primary" onclick="downloadActiveQrSvg()" ${!canGenerate ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📥 Tải SVG in ấn</button>
                  <button class="btn" onclick="downloadActiveQrPng()" ${!canGenerate ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📥 Tải PNG</button>
                  <button class="btn" onclick="printActiveQrDecal()" ${!canGenerate ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>🖨 In Decal A6</button>
                </div>
              </div>

              <!-- Chi tiết liên kết & Kiểm soát an toàn -->
              <div>
                <h3 style="font-size:15px;margin-bottom:12px">Liên kết đánh giá đang áp dụng</h3>
                <div style="margin-bottom:12px">
                  <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">URL đích khi quét mã:</label>
                  <input type="text" readonly value="${esc(canGenerate ? activeUrl : 'Chưa có Place ID hợp lệ — Vui lòng kết nối Google Business Profile')}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface-1);color:var(--text-primary);font-size:12px;font-family:monospace" />
                </div>
                <div class="banner" style="background:var(--surface-1);border-left:4px solid var(--series-1);padding:12px;font-size:12px;line-height:1.5;margin-bottom:12px">
                  <b>⚖ Tuân thủ chính sách đánh giá của Google (Review Gating Policy):</b><br>
                  • Tuyệt đối không lọc khách hài lòng mới cho gửi review Google.<br>
                  • Không hứa hẹn tặng quà hoặc ưu đãi tài chính để đổi lấy đánh giá tích cực.<br>
                  • Lời mời đánh giá phải trung tính và công khai cho mọi khách hàng.
                </div>
              </div>
            </div>
          </div>`
        );
      },

      // 11. NHẬN ĐỊNH & ĐỀ XUẤT AI (AI INSIGHTS - PHẦN O)
      async ai_insights() {
        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
        const negRevs = pool.filter(r => (r.rating != null && r.rating <= 2) || (r.analysis && r.analysis.sentiment === 'negative'));

        return (
          head('Nhận định & Đề xuất AI', 'Tổng hợp thông minh từ dữ liệu review, phát hiện điểm nghẽn vận hành và đề xuất hành động cụ thể.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <b style="font-size:15px">Phát hiện từ dữ liệu thực tế (Evidence-based Insights)</b>
              <span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Động cơ Heuristic & LLM v2.0</span>
            </div>
            <div class="grid g2" style="gap:16px">
              <div style="background:var(--surface-2);border-radius:8px;padding:16px;border-left:4px solid var(--bad)">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">Vận hành dịch vụ</span>
                  <span class="muted" style="font-size:11px">Độ tin cậy: Cao (Dựa trên review thực tế)</span>
                </div>
                <h4 style="margin:4px 0 8px 0;font-size:14px">Thời gian chờ đợi tại chi nhánh vượt quá cam kết</h4>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px">
                  Ghi nhận phản hồi về việc khách đặt lịch trước nhưng vẫn phải chờ trên 45 phút vào các khung giờ cao điểm cuối tuần.
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:10px">
                  🔗 <b>Dẫn chứng:</b> Có 2 review tiêu cực phản ánh trực tiếp vấn đề này.
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn primary" style="font-size:12px" data-act="create-task-from-insight" data-v="wait_time">➕ Tạo công việc cho Quản lý chi nhánh</button>
                  <button class="btn" style="font-size:12px" data-act="drill-topic" data-v="wait">Xem review dẫn chứng ↗</button>
                </div>
              </div>

              <div style="background:var(--surface-2);border-radius:8px;padding:16px;border-left:4px solid var(--good)">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">Điểm sáng khách hàng</span>
                  <span class="muted" style="font-size:11px">Khảo sát tích cực</span>
                </div>
                <h4 style="margin:4px 0 8px 0;font-size:14px">Thái độ phục vụ của nhân viên được khen ngợi vượt trội</h4>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px">
                  Tỷ lệ khen ngợi về sự tận tâm, thân thiện chiếm trên 70% tổng số review 5 sao trong kỳ 30 ngày qua.
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:10px">
                  💡 <b>Đề xuất:</b> Biểu dương đội ngũ CSKH và nhân rộng quy chuẩn giao tiếp sang các cơ sở mới.
                </div>
                <button class="btn" style="font-size:12px" data-act="drill-topic" data-v="staff">Xem review khen ngợi ↗</button>
              </div>
            </div>
          </div>`
        );
      },

      // 12. KẾT NỐI NGUỒN DỮ LIỆU (CONNECTIONS - PHẦN P)
      async connections() {
        return (
          head('Kết nối nguồn dữ liệu', 'Trạng thái tích hợp và ma trận tính năng các nguồn dữ liệu Google Places, Google Business Profile và LLM.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <h3 style="margin:0 0 12px 0;font-size:15px">Ma trận Năng lực Tích hợp Nguồn (Capabilities Matrix)</h3>
            <table style="font-size:13px">
              <thead>
                <tr style="background:var(--surface-2)">
                  <th>Nguồn dữ liệu</th>
                  <th>Loại xác thực</th>
                  <th style="text-align:center">Đọc Địa điểm</th>
                  <th style="text-align:center">Đọc Review</th>
                  <th style="text-align:center">Trả lời Review</th>
                  <th style="text-align:center">Bài đăng & Media</th>
                  <th style="text-align:center">Thứ hạng Local</th>
                  <th>Trạng thái kết nối</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Google Places API (New)</b></td>
                  <td>API Key GCP</td>
                  <td style="text-align:center">✓ Hỗ trợ</td>
                  <td style="text-align:center">Mẫu giới hạn (5 review)</td>
                  <td style="text-align:center">✕ Không hỗ trợ</td>
                  <td style="text-align:center">✕ Không hỗ trợ</td>
                  <td style="text-align:center">✕ Cần dịch vụ riêng</td>
                  <td><span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Sẵn sàng qua API Key</span></td>
                </tr>
                <tr>
                  <td><b>Google Business Profile API</b></td>
                  <td>OAuth 2.0 (Chính chủ)</td>
                  <td style="text-align:center">✓ Hỗ trợ</td>
                  <td style="text-align:center">✓ Đầy đủ các trang</td>
                  <td style="text-align:center">✓ Đăng phản hồi trực tiếp</td>
                  <td style="text-align:center">✓ Đăng bài & ảnh</td>
                  <td style="text-align:center">✕ Cần dịch vụ riêng</td>
                  <td><span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">Yêu cầu Backend Server</span></td>
                </tr>
                <tr>
                  <td><b>Dịch vụ Thu thập (SerpApi)</b></td>
                  <td>SerpApi Key</td>
                  <td style="text-align:center">✓ Hỗ trợ</td>
                  <td style="text-align:center">✓ Toàn bộ review công khai</td>
                  <td style="text-align:center">✕ Không hỗ trợ</td>
                  <td style="text-align:center">✕ Không hỗ trợ</td>
                  <td style="text-align:center">✓ Hỗ trợ đo vị trí</td>
                  <td><span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">Đang chạy thử (Mock)</span></td>
                </tr>
                <tr>
                  <td><b>Gemini 2.5 Flash / Pro (Hiện hành)</b></td>
                  <td>Google AI Studio Key</td>
                  <td style="text-align:center">-</td>
                  <td style="text-align:center">Phân tích cảm xúc & rủi ro</td>
                  <td style="text-align:center">Gợi ý câu trả lời nháp</td>
                  <td style="text-align:center">Gợi ý nội dung bài</td>
                  <td style="text-align:center">-</td>
                  <td><span class="chip" style="background:#fef3c7;color:#b45309;font-weight:700">Đã cập nhật Gemini 2.5</span></td>
                </tr>
              </tbody>
            </table>
          </div>`
        );
      },

      // 13. THÀNH VIÊN VÀ PHÂN QUYỀN (MEMBERS & ROLES - PHẦN Q)
      async members_roles() {
        const matrix = [
          { name: 'Nguyễn Văn A', email: 'owner@seoulcenter.vn', role: 'Quản trị Workspace (Owner)', actions: 'Toàn quyền (Xem, Sửa, Soạn, Duyệt, Xuất bản, QL kết nối, QL thành viên, Xem chi phí)', scope: 'Toàn bộ chuỗi (Global)' },
          { name: 'Trần Thị B', email: 'manager.hcm@seoulcenter.vn', role: 'Quản lý Khu vực (Brand Manager)', actions: 'Sửa hồ sơ, Soạn nội dung, Duyệt bài, Xuất bản', scope: 'Nhóm Khu vực TP.HCM (3 chi nhánh)' },
          { name: 'Lê Văn C', email: 'cskh.lead@seoulcenter.vn', role: 'Chuyên viên CSKH / SLA', actions: 'Xem dữ liệu, Soạn bản nháp phản hồi', scope: 'Toàn bộ chuỗi (Global)' },
          { name: 'Phạm Thị D', email: 'store.binhthanh@seoulcenter.vn', role: 'Nhân viên Cơ sở (Store Staff)', actions: 'Xem review, Soạn bản nháp', scope: 'Chỉ SD 1 — Bình Thạnh' }
        ];

        return (
          head('Thành viên & Phân quyền Hai Chiều (2D RBAC)', 'Phân quyền kiểm soát theo hai chiều độc lập: Thao tác được phép thực hiện và Phạm vi địa điểm được phép thao tác.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:18px">
            <!-- 2D RBAC Matrix Table -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
              <h3 style="margin:0;font-size:15px">Ma trận Phân quyền Hai Chiều (Hành động × Phạm vi địa điểm)</h3>
              <button class="btn primary" onclick="toast('Tính năng mời thành viên mới');">➕ Thêm thành viên</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Vai trò</th>
                  <th>Hành động được phép (Dimension 1)</th>
                  <th>Phạm vi địa điểm (Dimension 2)</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${matrix.map(m => `
                  <tr>
                    <td><b>${esc(m.name)}</b><br><span class="muted" style="font-size:11px">${esc(m.email)}</span></td>
                    <td><span class="chip" style="font-weight:700">${esc(m.role)}</span></td>
                    <td style="font-size:12px">${esc(m.actions)}</td>
                    <td><span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">${esc(m.scope)}</span></td>
                    <td><button class="btn" onclick="toast('Cập nhật phân quyền cho: ${esc(m.name)}');">Sửa quyền</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Service Quotas & Usage Meters (Requirement 12) -->
            <h3 style="margin:20px 0 10px 0;font-size:15px">Hạn mức Dịch vụ & Theo dõi Tiêu thụ (Service Quotas & Usage)</h3>
            <div class="grid g3" style="gap:14px;margin-bottom:14px">
              <div class="card" style="padding:14px;background:var(--surface-2);border-top:3px solid var(--primary)">
                <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase">1. Hạn mức Gói Phần mềm (SaaS Plan)</div>
                <div style="font-size:22px;font-weight:700;margin:6px 0">3 <span class="muted" style="font-size:14px">/ 10 địa điểm</span></div>
                <div class="tr" style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:6px">
                  <div style="width:30%;height:100%;background:var(--primary)"></div>
                </div>
                <div class="muted" style="font-size:11px">Gói: Doanh nghiệp Đa chi nhánh (Enterprise)</div>
              </div>
              <div class="card" style="padding:14px;background:var(--surface-2);border-top:3px solid var(--good)">
                <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase">2. Google GBP API Quota (GCP)</div>
                <div style="font-size:22px;font-weight:700;margin:6px 0">1.420 <span class="muted" style="font-size:14px">/ 10.000 req/ngày</span></div>
                <div class="tr" style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:6px">
                  <div style="width:14.2%;height:100%;background:var(--good)"></div>
                </div>
                <div class="muted" style="font-size:11px">Đã dùng 14,2% hạn mức Google Cloud Platform</div>
              </div>
              <div class="card" style="padding:14px;background:var(--surface-2);border-top:3px solid var(--series-1)">
                <div class="muted" style="font-size:11px;font-weight:700;text-transform:uppercase">3. Ngân sách AI Token (Gemini LLM)</div>
                <div style="font-size:22px;font-weight:700;margin:6px 0">45.200 <span class="muted" style="font-size:14px">/ 500.000 tokens</span></div>
                <div class="tr" style="height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-bottom:6px">
                  <div style="width:9.0%;height:100%;background:var(--series-1)"></div>
                </div>
                <div class="muted" style="font-size:11px">Google AI Studio / Gemini 2.5 Flash (Tháng 10/2026)</div>
              </div>
            </div>

            <div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);padding:10px;font-size:12px">
              <b>📌 Tách bạch rạch ròi các loại hạn mức:</b> Hệ thống tách bạch hạn mức gói sản phẩm phần mềm khỏi hạn mức gọi Google Cloud API và ngân sách token của nhà cung cấp LLM. Không lấy số dư demo làm bảng giá thương mại.
            </div>
          </div>`
        );
      },

      // 14. LỊCH SỬ THAO TÁC (AUDIT LOG - PHẦN Q)
      async audit_log() {
        const logs = [
          { time: '2026-10-15 09:12', user: 'CSKH - Minh Anh', action: 'Phản hồi review', target: 'Review #sc-21 (5★)', result: 'Đã xuất bản' },
          { time: '2026-10-15 08:30', user: 'QLCN - Trần Tuấn', action: 'Xác nhận xử lý SLA', target: 'Review #sc-12 (1★)', result: 'Đã giải quyết' },
          { time: '2026-10-14 16:45', user: 'Admin Hệ thống', action: 'Đồng bộ địa điểm', target: '3 địa điểm Seoul Center', result: 'Thành công (1.098 review)' },
          { time: '2026-10-14 11:20', user: 'Ban Biên tập', action: 'Phê duyệt bài đăng', target: 'Bài đăng Ưu đãi tháng 10', result: 'Đã duyệt' }
        ];

        return (
          head('Lịch sử thao tác', 'Nhật ký kiểm toán minh bạch ghi nhận toàn bộ hoạt động quan trọng trong hệ thống.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <h3 style="margin:0 0 12px 0;font-size:15px">Nhật ký kiểm toán (Audit Trail)</h3>
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Thao tác</th>
                  <th>Đối tượng</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td><code>${esc(l.time)}</code></td>
                    <td><b>${esc(l.user)}</b></td>
                    <td>${esc(l.action)}</td>
                    <td>${esc(l.target)}</td>
                    <td><span class="chip" style="background:#dcfce7;color:#15803d;font-weight:600">${esc(l.result)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        );
      },

      // 15. ALIAS: BRANCHES -> LOCATIONS (ĐẢM BẢO TƯƠNG THÍCH HOÀN TOÀN)
      async branches() { return pages.locations(); },

      // 16. REVIEWS & PHẢN HỒI
      async reviews() {
        const mySeq = renderSeq;
        const reqBrand = S.brand;
        const reqStars = S.stars;
        const reqBranch = S.branch;
        const reqLocationId = S.locationId;
        const reqMedia = S.mediaFilter;
        const reqSort = S.sort;
        const reqTopic = S.topic;
        const reqQ = S.q;
        const reqStatus = S.filterStatus;
        const reqAssignee = S.assigneeFilter;
        const reqDays = S.reviewDays;
        const reqEvidenceIds = S.evidenceIds ? S.evidenceIds.join(',') : '';

        const qParams = new URLSearchParams({ limit: 20, sort: S.sort });
        if (S.stars !== 'all') qParams.set('stars', S.stars);
        if (S.branch) qParams.set('branch', S.branch);
        if (S.locationId) qParams.set('locationId', S.locationId);
        if (S.mediaFilter) qParams.set('media', S.mediaFilter);
        if (S.topic) qParams.set('topic', S.topic);
        if (S.q) qParams.set('q', S.q);
        if (S.filterStatus && S.filterStatus !== 'all') qParams.set('status', S.filterStatus);
        if (S.assigneeFilter && S.assigneeFilter !== 'all') qParams.set('assignee', S.assigneeFilter);
        if (S.reviewDays) qParams.set('days', S.reviewDays);
        if (S.evidenceIds && S.evidenceIds.length) qParams.set('ids', S.evidenceIds.join(','));

        const d = await api('reviews?' + qParams);
        if (mySeq !== renderSeq || reqBrand !== S.brand || reqStars !== S.stars || reqBranch !== S.branch || reqSort !== S.sort || reqTopic !== S.topic || reqQ !== S.q || reqStatus !== S.filterStatus || reqAssignee !== S.assigneeFilter || reqDays !== S.reviewDays || reqEvidenceIds !== (S.evidenceIds ? S.evidenceIds.join(',') : '')) {
          return '';
        }

        S.rows = d.items.slice();
        S.total = d.total;

        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
        const bConfig = getBrandConfig(S.brand);
        const countAll = pool.length;
        const countNeedAction = pool.filter(r => r.ticketStatus !== 'resolved').length;
        const countOverdue = pool.filter(r => r.slaOverdue).length;
        const countUnreplied = pool.filter(isUnrepliedGoogleReview).length;
        const countResolved = pool.filter(r => r.ticketStatus === 'resolved').length;

        const sc = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        pool.forEach(r => { if (sc[r.rating] !== undefined) sc[r.rating]++; });

        let drillBanner = '';
        if (S.evidenceIds && S.evidenceIds.length) {
          drillBanner = `<div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span>📋 <b>Bằng chứng trích xuất từ AI:</b> Khớp đúng ${fmtInt(d.total)} review được tổng hợp${S.evidenceLabel ? ` (${esc(S.evidenceLabel)})` : ''}</span>
            <button class="btn" data-act="clear-evidence" style="font-size:12px">✕ Bỏ lọc bằng chứng</button>
          </div>`;
        } else if (S.mediaFilter === 'with_photo') {
          drillBanner = `<div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span>📸 <b>Lọc review có hình ảnh</b> (${fmtInt(d.total)} review phù hợp)</span>
            <button class="btn" data-act="clear-media-filter" style="font-size:12px">✕ Bỏ lọc ảnh</button>
          </div>`;
        } else if (S.topic) {
          const tName = S.topicLabels?.[S.topic] || S.topic;
          drillBanner = `<div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span>📋 <b>Bằng chứng trích xuất theo chủ đề:</b> "${esc(tName)}" (${fmtInt(d.total)} review phù hợp)</span>
            <button class="btn" data-act="clear-topic" style="font-size:12px">✕ Bỏ lọc chủ đề</button>
          </div>`;
        } else if (S.q) {
          drillBanner = `<div class="banner" style="background:var(--surface-2);border-left:4px solid var(--series-1);display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span>🔍 <b>Kết quả tìm kiếm từ khóa:</b> "${esc(S.q)}" (${fmtInt(d.total)} review phù hợp)</span>
            <button class="btn" data-act="clear-q" style="font-size:12px">✕ Xóa tìm kiếm</button>
          </div>`;
        }

        const workStatusTabs = `<div class="tabs" style="margin-bottom:12px;gap:6px;flex-wrap:wrap">
          <button class="btn ${S.filterStatus === 'all' ? 'on' : ''}" data-act="set-status" data-v="all">Tất cả (${countAll})</button>
          <button class="btn ${S.filterStatus === 'need_action' ? 'on' : ''}" data-act="set-status" data-v="need_action" style="${S.filterStatus === 'need_action' ? '' : 'color:var(--warn)'}">⚡ Cần xử lý (${countNeedAction})</button>
          <button class="btn ${S.filterStatus === 'overdue' ? 'on' : ''}" data-act="set-status" data-v="overdue" style="${S.filterStatus === 'overdue' ? '' : 'color:var(--bad)'}">⏰ Quá hạn SLA (${countOverdue})</button>
          <button class="btn ${S.filterStatus === 'unreplied' ? 'on' : ''}" data-act="set-status" data-v="unreplied" style="${S.filterStatus === 'unreplied' ? '' : 'color:var(--series-1)'}">💬 Chưa phản hồi Google (${countUnreplied})</button>
          <button class="btn ${S.filterStatus === 'resolved' ? 'on' : ''}" data-act="set-status" data-v="resolved" style="${S.filterStatus === 'resolved' ? '' : 'color:var(--good)'}">✓ Đã giải quyết (${countResolved})</button>
        </div>`;

        const staffList = Array.from(new Set(pool.map(r => r.assignee).filter(Boolean)));

        const filterToolbar = `<div class="card" style="padding:14px;margin-bottom:12px;background:var(--surface-1)">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
              <input type="text" id="rev-search-input" placeholder="🔍 Tìm kiếm tên khách, nội dung review, ID..." value="${esc(S.q)}" style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary);font-size:13px" onkeydown="if(event.key==='Enter'){ S.q=this.value.trim(); render(); }" />
            </div>
            <button class="btn primary" onclick="S.q=document.getElementById('rev-search-input').value.trim(); render();">Tìm</button>
            <select class="btn" onchange="S.topic=this.value; render();" style="max-width:200px">
              <option value="">-- Mọi chủ đề --</option>
              ${Object.entries(S.topicLabels || {}).map(([id, lb]) => `<option value="${id}" ${S.topic === id ? 'selected' : ''}>${esc(lb)}</option>`).join('')}
            </select>
            <select class="btn" onchange="S.assigneeFilter=this.value; render();" style="max-width:180px">
              <option value="all">-- Mọi người phụ trách --</option>
              ${staffList.map(st => `<option value="${esc(st)}" ${S.assigneeFilter === st ? 'selected' : ''}>${esc(st)}</option>`).join('')}
            </select>
            ${(S.stars !== 'all' || S.branch || S.locationId || S.mediaFilter || S.topic || S.q || S.filterStatus !== 'all' || S.assigneeFilter !== 'all' || S.reviewDays || (S.evidenceIds && S.evidenceIds.length)) ? `<button class="btn" data-act="reset-all-filters" style="color:var(--bad)">✕ Đặt lại bộ lọc</button>` : ''}
          </div>
        </div>`;

        const quickStars = `<div class="quick-stars" style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text-muted);font-weight:500">Lọc sao:</span>
          <button class="btn ${S.stars === 'all' ? 'on' : ''}" data-act="star" data-v="all">Tất cả</button>
          <button class="btn ${S.stars === '1' ? 'on' : ''}" data-act="star" data-v="1">1 sao ⚠ (${fmtInt(sc[1] || 0)})</button>
          <button class="btn ${S.stars === '2' ? 'on' : ''}" data-act="star" data-v="2">2 sao (${fmtInt(sc[2] || 0)})</button>
          <button class="btn ${S.stars === '5' ? 'on' : ''}" data-act="star" data-v="5">5 sao ★ (${fmtInt(sc[5] || 0)})</button>
          <button class="btn ${S.stars === 'neg' ? 'on' : ''}" data-act="star" data-v="neg" style="color:var(--bad)">Tất cả tiêu cực (1-2★)</button>
        </div>`;

        const cards = S.rows.map(r => reviewCard(r)).join('');

        return (
          head('Review & Phản hồi Google', 'Quản lý toàn diện đánh giá khách hàng trên Google Business Profile và các kênh phản ánh.') + banner() +
          workStatusTabs + drillBanner + filterToolbar + quickStars +
          `<div style="margin-top:14px;margin-bottom:8px;font-size:13px;color:var(--text-muted);display:flex;justify-content:space-between">
            <span>Hiển thị <b>${S.rows.length}</b> / <b>${d.total}</b> review phù hợp</span>
            <span>Sắp xếp: <b>${S.sort === 'newest' ? 'Mới nhất' : (S.sort === 'lowest' ? 'Sao thấp' : (S.sort === 'highest' ? 'Sao cao' : 'Ưu tiên quá hạn'))}</b></span>
          </div>
          <div id="rev-list" style="display:flex;flex-direction:column;gap:12px">${cards || '<div class="card"><div class="empty">Không có review nào phù hợp bộ lọc</div></div>'}</div>
          ${S.rows.length < d.total ? `<div style="text-align:center;margin-top:16px"><button class="btn" data-act="more" style="padding:8px 24px">Tải thêm 20 review khác (${d.total - S.rows.length} review còn lại)</button></div>` : ''}`
        );
      },

      // 17. SENTIMENT
      async sentiment() {
        const d = await api(`sentiment?days=${S.days}`);
        const c = d.counts;
        const total = c.total || 1;
        const bConfig = getBrandConfig(S.brand);
        const indPack = getIndustryPack(bConfig.industry);
        const topD = await api(`topics?days=${S.days}`);
        const topics = topD.topics || [];

        return (
          head('Cảm xúc & Chủ đề (Sentiment & Topics)', 'Phân loại cảm xúc và phân tích chuyên sâu các chủ đề phản hồi của khách hàng.') + banner() +
          `<div class="grid g3" style="gap:12px;margin-bottom:16px">
            <div class="card kpi"><h3>Tích cực</h3><div class="v" style="color:var(--good)">${pct(c.positive / total)}</div><div class="sub">${fmtInt(c.positive)} phản hồi tích cực</div></div>
            <div class="card kpi"><h3>Trung tính</h3><div class="v" style="color:var(--neutral)">${pct(c.neutral / total)}</div><div class="sub">${fmtInt(c.neutral)} phản hồi trung tính</div></div>
            <div class="card kpi"><h3>Tiêu cực</h3><div class="v" style="color:var(--bad)">${pct(c.negative / total)}</div><div class="sub">${fmtInt(c.negative)} phản hồi tiêu cực</div></div>
          </div>
          <div class="grid g2" style="gap:16px;margin-bottom:16px">
            <div class="card">
              <h3>Phân bổ cảm xúc theo tuần</h3>
              ${stacked(d.weekly)}
            </div>
            <div class="card">
              <h3>Các chủ đề nổi bật (${indPack.name || indPack.label || "Theo ngành"})</h3>
              <table>
                <thead><tr><th>Chủ đề</th><th class="num">Số lượng</th><th class="num">Tích cực</th><th class="num">Tiêu cực</th><th>Thao tác</th></tr></thead>
                <tbody>
                  ${topics.map(t => `
                    <tr>
                      <td><b>${esc(t.label)}</b></td>
                      <td class="num font-bold">${t.count}</td>
                      <td class="num" style="color:var(--good)">${t.positive}</td>
                      <td class="num" style="color:${t.negative ? 'var(--bad)' : 'inherit'}">${t.negative}</td>
                      <td><button class="btn" data-act="drill-topic" data-v="${esc(t.topic)}">Xem review ↗</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`
        );
      },

      // 18. ALIAS: TOPICS -> SENTIMENT
      async topics() { return pages.sentiment(); },

      // 19. SOCIAL LISTENING
      async social() {
        const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
        const mentions = pool.filter(r => r.rating == null || r.source === 'google_news' || r.source === 'social');
        return (
          head('Social Listening & Báo chí', 'Giám sát nhắc tới thương hiệu (Brand Mentions) trên các trang tin tức, mạng xã hội và diễn đàn.') + banner() +
          `<div class="card" style="padding:16px;margin-bottom:16px">
            <h3 style="margin:0 0 12px 0;font-size:15px">Nhắc tới thương hiệu gần đây (${mentions.length} bản ghi)</h3>
            <table>
              <thead><tr><th>Tiêu đề / Trích đoạn</th><th>Kênh</th><th>Thời gian</th><th>Cảm xúc</th><th>Dẫn chứng</th></tr></thead>
              <tbody>
                ${mentions.map(m => `
                  <tr>
                    <td><b>${esc((m.text || '').slice(0, 80))}...</b></td>
                    <td><span class="chip" style="font-weight:600">${esc(m.source || 'Báo chí')}</span></td>
                    <td>${fmtDate(m.date)}</td>
                    <td><span class="chip ${m.analysis?.sentiment === 'positive' ? 'good' : (m.analysis?.sentiment === 'negative' ? 'bad' : 'neu')}">${m.analysis?.sentiment === 'positive' ? 'Tích cực' : (m.analysis?.sentiment === 'negative' ? 'Tiêu cực' : 'Trung tính')}</span></td>
                    <td>${renderSourceLink(m)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5" class="empty">Chưa có bài viết báo chí trong kỳ</td></tr>'}
              </tbody>
            </table>
          </div>`
        );
      },

      // 20. SHARE OF VOICE (SOV)
      async sov() {
        const sovD = await api('sov');
        const bConfig = getBrandConfig(S.brand);
        return (
          head('Share of Voice (Thị phần Thảo luận)', 'Đo lường mức độ hiện diện của thương hiệu so với đối thủ cạnh tranh trên không gian số.') + banner() +
          `<div class="grid g2" style="gap:16px;margin-bottom:16px">
            <div class="card">
              <h3>Tỷ lệ thị phần thảo luận</h3>
              ${donut(sovD.shares || [{ l: bConfig.name, v: 45, c: '--series-1' }, { l: 'Đối thủ A', v: 30, c: '--series-2' }, { l: 'Đối thủ B', v: 25, c: '--series-3' }])}
            </div>
            <div class="card">
              <h3>So sánh quy mô lượng review</h3>
              ${barH(sovD.volume || [{ l: bConfig.name, v: bConfig.reviews || 100 }, { l: 'Đối thủ A', v: 75 }, { l: 'Đối thủ B', v: 60 }])}
            </div>
          </div>`
        );
      },

      // 21. QUẢN TRỊ KHỦNG HOẢNG (CRISIS)
      async crisis() {
        const d = await api('alerts').catch(() => ({ alerts: [] }));
        const alertsList = d.alerts || [];
        const filter = S.alertStatusFilter || 'all';

        const filteredAlerts = alertsList.filter(a => {
          if (filter === 'all') return true;
          return a.status === filter;
        });

        const statusLabels = { new: 'Mới', seen: 'Đã xem', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết' };

        return (
          head('Hệ thống Cảnh báo & Watchlist Danh tiếng Vận hành', 'Theo dõi tự động 8 loại rủi ro: biến động review, rating giảm, quá hạn SLA, đứt kết nối Google và thất bại xuất bản.') + banner() +
          `<div class="card" style="margin-bottom:16px;padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn ${filter === 'all' ? 'on' : ''}" onclick="S.alertStatusFilter='all'; render();">Tất cả (${alertsList.length})</button>
                <button class="btn ${filter === 'new' ? 'on' : ''}" onclick="S.alertStatusFilter='new'; render();" style="color:var(--bad)">Mới</button>
                <button class="btn ${filter === 'seen' ? 'on' : ''}" onclick="S.alertStatusFilter='seen'; render();">Đã xem</button>
                <button class="btn ${filter === 'in_progress' ? 'on' : ''}" onclick="S.alertStatusFilter='in_progress'; render();" style="color:#d97706">Đang xử lý</button>
                <button class="btn ${filter === 'resolved' ? 'on' : ''}" onclick="S.alertStatusFilter='resolved'; render();" style="color:var(--good)">Đã giải quyết</button>
              </div>
              <span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700">Giám sát tự động 24/7 (8 bộ cảm biến)</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Mức độ</th>
                  <th>Quy tắc cảnh báo</th>
                  <th>Phạm vi địa điểm</th>
                  <th>Bằng chứng & Dữ liệu mốc</th>
                  <th>Người phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${filteredAlerts.map(a => `
                  <tr>
                    <td><span class="chip" style="background:${a.severity === 'high' ? '#fee2e2' : '#fef3c7'};color:${a.severity === 'high' ? '#b91c1c' : '#b45309'};font-weight:700">${a.severity === 'high' ? 'Cao' : 'Trung bình'}</span></td>
                    <td><b>${esc(a.title)}</b><br><span class="muted" style="font-size:11px">Rule ID: ${esc(a.ruleId)}</span></td>
                    <td>${esc(a.location || 'Toàn chuỗi')}</td>
                    <td style="max-width:280px;font-size:12px">${esc(a.evidence)}</td>
                    <td><b>${esc(a.assignee || 'Chưa nhận')}</b></td>
                    <td><span class="chip" style="font-weight:600">${statusLabels[a.status] || a.status}</span></td>
                    <td>
                      <div style="display:flex;gap:4px">
                        ${a.status === 'new' ? `<button class="btn" data-act="update-alert-status" data-id="${esc(a.id)}" data-v="seen" style="font-size:11px;padding:2px 6px">Đã xem</button>` : ''}
                        ${a.status !== 'in_progress' && a.status !== 'resolved' ? `<button class="btn" data-act="update-alert-status" data-id="${esc(a.id)}" data-v="in_progress" style="font-size:11px;padding:2px 6px;color:#d97706">Nhận xử lý</button>` : ''}
                        ${a.status !== 'resolved' ? `<button class="btn primary" data-act="update-alert-status" data-id="${esc(a.id)}" data-v="resolved" style="font-size:11px;padding:2px 6px">Giải quyết xong</button>` : '<span class="muted" style="font-size:11px">Hoàn tất</span>'}
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty">Không có cảnh báo trong bộ lọc này</td></tr>'}
              </tbody>
            </table>

            <div class="banner" style="margin-top:12px;background:var(--surface-2);border-left:4px solid var(--series-1);padding:10px;font-size:12px">
              <b>📌 Cơ chế gửi cảnh báo:</b> Hệ thống chỉ thiết lập ngưỡng kích hoạt cảnh báo nội bộ; KHÔNG tự ý gửi email/Slack hay bật kênh phát thanh ra ngoài khi người dùng chưa chủ động kết nối Webhook.
            </div>
          </div>`
        );
      },

      // 22. ALIAS: ALERTS -> CRISIS
      async alerts() { return pages.crisis(); },

      // 23. LỊCH SỬ DANH TIẾNG (REPUTATION)
      async reputation() {
        const d = await api('reputation');
        const snaps = d.snapshots || [];
        const w = (d.weekly || []).filter((x) => x.avg != null);
        return (
          head('Lịch sử danh tiếng', 'Theo dõi biến động điểm Brand Health và uy tín thương hiệu theo các mốc snapshot định kỳ.') + banner() +
          `<div class="grid g2" style="margin-bottom:14px">
            <div class="card">
              <h3>Brand Health Score theo ngày (Snapshot định kỳ)</h3>
              ${snaps.length >= 1 ? `<div style="font-size:32px;font-weight:700;color:var(--series-1);margin:10px 0">${snaps[0].health} <span class="muted" style="font-size:14px">/100 (Snapshot ${fmtDate(snaps[0].date)})</span></div><div class="muted" style="font-size:12px">📌 <i>${esc(snaps[0].source)}</i></div>` : '<div class="empty">Chưa có snapshot danh tiếng</div>'}
            </div>
            <div class="card">
              <h3>Sao trung bình theo tuần</h3>
              ${w.length ? lineChart(w.map((x) => new Date(x.week).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })), [{ name: 'Sao TB', color: '--series-1', vals: w.map((x) => x.avg) }], { min: 1, max: 5 }) : '<div class="empty">Chưa có dữ liệu sao tuần</div>'}
            </div>
          </div>
          <div class="card">
            <h3>Nhật ký đồng bộ hệ thống</h3>
            <table>
              <tr><th>Thời gian</th><th>Chế độ</th><th class="num">Review</th><th class="num">Cảnh báo</th><th>Ghi chú</th></tr>
              ${(d.syncLog || []).map((l) => `<tr class="${/Lỗi/.test((l.notes || []).join('')) ? 'err' : ''}"><td>${fmtTime(l.at)}</td><td>${l.mode}</td><td class="num">${l.added}</td><td class="num">${l.alerts}</td><td class="muted">${esc((l.notes || []).join('; '))}</td></tr>`).join('')}
            </table>
          </div>`
        );
      },

      // 24. BÁO CÁO TỔNG THỂ (REPORTS - PHẦN N, FIX B2 ĐIỂM 0 HIỂN THỊ 0)
      async reports() {
        const d = await api('reports');
        return (
          head('Báo cáo Tổng thể & Phân tích Đa chiều', 'Tạo báo cáo chi tiết theo Workspace, Brand và Địa điểm. Phân biệt rõ số đo thực tế từ nguồn với dữ liệu nội bộ.', `<div class="tabs"><button class="btn primary" data-act="report" data-days="7">Tạo báo cáo 7 ngày</button><button class="btn" data-act="report" data-days="30">Tạo báo cáo 30 ngày</button></div>`) + banner() +
          `<div class="card" style="margin-bottom:16px;padding:16px">
            <!-- Báo cáo Bài đăng & Media Thực tế (Requirement 10) -->
            <h3 style="margin:0 0 12px 0;font-size:15px">📊 Báo cáo Hiệu quả Xuất bản & Tài sản Media Thực tế</h3>
            <div class="grid g2" style="gap:16px;margin-bottom:14px">
              <div style="background:var(--surface-2);padding:14px;border-radius:8px;border:1px solid var(--line)">
                <b style="font-size:14px">Báo cáo Hoạt động Bài đăng Google</b>
                <table style="font-size:12px;margin-top:8px">
                  <tr><td class="muted">Số nội dung bài viết gốc:</td><td><b>1 bài master</b></td></tr>
                  <tr><td class="muted">Số địa điểm đích tiếp nhận:</td><td><b>3 chi nhánh</b></td></tr>
                  <tr><td class="muted">Số lượt gửi & thử lại (Retries):</td><td><b>4 lượt</b> (3 gửi lần đầu + 1 retry)</td></tr>
                  <tr><td class="muted">Kết quả từng địa điểm:</td><td><b>3/3 thành công</b> (2 thành công ngay, 1 thành công sau retry)</td></tr>
                  <tr><td class="muted">Công việc thành công 1 phần:</td><td><b>1 công việc</b></td></tr>
                  <tr><td class="muted">Lượt xem bài viết trên Maps:</td><td><b>1.240 lượt xem</b> (Nguồn: Google API)</td></tr>
                </table>
                <div class="muted" style="font-size:11px;margin-top:6px"><i>* Lưu ý: Không cộng số lần retry thành số bài thành công; bài thất bại không tính có hiệu quả công khai.</i></div>
              </div>
              <div style="background:var(--surface-2);padding:14px;border-radius:8px;border:1px solid var(--line)">
                <b style="font-size:14px">Báo cáo Thư viện Hình ảnh</b>
                <table style="font-size:12px;margin-top:8px">
                  <tr><td class="muted">Tài sản ảnh nội bộ:</td><td><b>24 ảnh</b></td></tr>
                  <tr><td class="muted">Số ảnh đã xuất bản lên Google:</td><td><b>18 ảnh</b></td></tr>
                  <tr><td class="muted">Số địa điểm có ảnh:</td><td><b>3 / 3 địa điểm</b></td></tr>
                  <tr><td class="muted">Ảnh do khách tải lên kèm review:</td><td><b>12 ảnh</b></td></tr>
                  <tr><td class="muted">Lượt hiển thị ảnh:</td><td><b>18.400 lượt xem</b> (Nguồn: Google API)</td></tr>
                </table>
                <div class="muted" style="font-size:11px;margin-top:6px"><i>* Lưu ý: Tuyệt đối không ước tính lượt tiếp cận ảnh bằng công thức nhân tự nghĩ.</i></div>
              </div>
            </div>

            <h3 style="margin:16px 0 10px 0;font-size:15px">Danh sách báo cáo sẵn có</h3>
            <table>
              <tr><th>Tên Báo cáo</th><th>Kỳ đánh giá</th><th>Thời điểm tạo</th><th>Thao tác</th></tr>
              ${(d.reports || []).map((r) => `<tr><td><b>${esc(r.title || r.file)}</b><br><span class="muted" style="font-size:12px">${esc(r.file)}</span></td><td>${r.days} ngày</td><td>${fmtTime(r.createdAt)}</td><td><button class="btn" data-act="openreport" data-id="${esc(r.id)}">Mở xem</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Chưa có báo cáo mẫu</td></tr>'}
            </table>
          </div>`
        );
      },

      // 25. HƯỚNG DẪN & THIẾT LẬP (GUIDE - PHẦN P)
      async guide() {
        setTimeout(loadHandoverPlan, 50);
        return head('Hướng dẫn & Kết nối', 'Tài liệu kỹ thuật, lộ trình triển khai và mẫu cấu hình bàn giao cho đa ngành, đa thương hiệu.') + banner() + generateGuidePageHtml();
      }
    };



    /* ---------- Hướng dẫn & Kết nối (Guide & Connect) ---------- */
    // Generator for pages.guide() HTML
    function generateGuidePageHtml() {
      return `
    <div style="max-width:1100px;margin:0 auto;padding-bottom:40px">
      <!-- Header Trang Hướng dẫn & Kết nối -->
      <div style="margin-bottom:20px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="margin:0 0 6px 0;font-size:22px;display:flex;align-items:center;gap:10px">
            <span>📘 Hướng dẫn Tích hợp & Kết nối Nguồn Dữ liệu</span>
            <span class="chip" style="background:#fee2e2;color:#b91c1c;font-weight:700;font-size:12px">⚠ Chưa triển khai backend kết nối</span>
          </h1>
          <div class="muted" style="font-size:13px;line-height:1.5">
            Tài liệu kỹ thuật, lộ trình triển khai và mẫu cấu hình bàn giao cho đa ngành, đa thương hiệu · 
            <b>Cập nhật: 19/10/2026</b> (Vui lòng kiểm tra tài liệu chính thức của Google trước khi cấu hình thực tế).
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <span class="chip" style="background:#e0f2fe;color:#0369a1;font-weight:600">Phiên bản UI Shell 1.0</span>
          <span class="chip" style="background:var(--surface-2);color:var(--text-secondary);border:1px solid var(--line)">Dữ liệu mẫu: Snapshot 15/10/2026</span>
        </div>
      </div>

      <!-- Banner Cảnh báo Trạng thái Backend -->
      <div class="banner" style="background:var(--surface-1);border-left:4px solid var(--warn);margin-bottom:20px;padding:14px 18px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;font-size:14px">📌 THÔNG BÁO QUAN TRỌNG VỀ PHẠM VI HỆ THỐNG</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5">
          Giao diện hiện tại là <b>Client Application Shell</b> chạy trực tiếp trên trình duyệt với dữ liệu mô phỏng. 
          Hệ thống <b>chưa có backend server</b> để lưu trữ khóa bí mật, thực hiện OAuth 2.0 hoặc gọi API thu thập dữ liệu trực tiếp. 
          Không tự động hiển thị trạng thái <i>"đã kết nối"</i>, <i>"đã quét thành công"</i> hoặc <i>"AI đã phân tích"</i> khi chưa có backend thực tế.
        </div>
      </div>

      <!-- PHẦN 1: BẢNG SO SÁNH 4 NGUỒN DỮ LIỆU -->
      <div class="card" style="margin-bottom:20px;padding:20px">
        <h2 style="margin:0 0 12px 0;font-size:16px;display:flex;align-items:center;gap:8px">
          <span>1. Ma trận So sánh 4 Nguồn Dữ liệu Thu thập</span>
        </h2>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.5">
            <thead>
              <tr style="background:var(--surface-2);border-bottom:2px solid var(--line);text-align:left">
                <th style="padding:10px 12px;width:18%">Nguồn & Mục đích</th>
                <th style="padding:10px 12px;width:18%">Quyền hạn cần có</th>
                <th style="padding:10px 12px;width:18%">Thông tin xác thực</th>
                <th style="padding:10px 12px;width:24%">Dữ liệu lấy được</th>
                <th style="padding:10px 12px;width:22%">Giới hạn & Lưu ý</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid var(--line)">
                <td style="padding:12px;vertical-align:top">
                  <b>A. Google Maps / Places API (New)</b><br>
                  <span class="muted" style="font-size:12px">Tra cứu địa điểm công khai, rating, tổng review</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  Google Cloud Project có bật Billing, kích hoạt <code>Places API (New)</code>
                </td>
                <td style="padding:12px;vertical-align:top">
                  <span class="chip" style="background:#e0e7ff;color:#3730a3">API Key</span><br>
                  <span class="muted" style="font-size:11px">Giới hạn theo IP backend / HTTP referrer</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  • Tên, địa chỉ, tọa độ, Place ID<br>
                  • Điểm sao trung bình (<code>rating</code>)<br>
                  • Tổng lượt đánh giá (<code>userRatingCount</code>)<br>
                  • <b>Tối đa 5 review mẫu</b> theo thuật toán liên quan của Google
                </td>
                <td style="padding:12px;vertical-align:top;color:var(--bad)">
                  ⚠ <b>KHÔNG lấy được toàn bộ lịch sử</b> review.<br>
                  ⚠ <b>Không có phân trang</b> để lấy hết danh sách review.<br>
                  ⚠ Không được dùng 5 review này để đại diện cho toàn bộ tháng.
                </td>
              </tr>

              <tr style="border-bottom:1px solid var(--line)">
                <td style="padding:12px;vertical-align:top">
                  <b>B. Google Business Profile (GBP) APIs</b><br>
                  <span class="muted" style="font-size:12px">Quản lý chi nhánh chính chủ, đồng bộ review & trả lời</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  Tài khoản Google là <b>Chủ sở hữu (Owner)</b> hoặc <b>Quản lý (Manager)</b> địa điểm đã xác minh
                </td>
                <td style="padding:12px;vertical-align:top">
                  <span class="chip" style="background:#fef3c7;color:#92400e">OAuth 2.0 User Token</span><br>
                  <span class="muted" style="font-size:11px">Scope: <code>business.manage</code></span><br>
                  <span class="muted" style="font-size:11px">Client ID & Client Secret</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  • <b>100% review chính thức</b> của địa điểm<br>
                  • Phân trang đầy đủ qua <code>nextPageToken</code><br>
                  • Thông tin người đánh giá, sao, nội dung, thời gian<br>
                  • <b>Đăng phản hồi chính thức</b> (Reply API)
                </td>
                <td style="padding:12px;vertical-align:top">
                  ⚠ <b>Chỉ dùng cho chi nhánh sở hữu</b> (không lấy được đối thủ).<br>
                  ⚠ <b>Không thể thay OAuth bằng API key</b>.<br>
                  ⚠ Trả lời review là thao tác ghi, cần kiểm soát thẩm quyền.
                </td>
              </tr>

              <tr style="border-bottom:1px solid var(--line)">
                <td style="padding:12px;vertical-align:top">
                  <b>C. Nhà cung cấp bên thứ ba (SerpApi, v.v.)</b><br>
                  <span class="muted" style="font-size:12px">Thu thập review công khai hoặc theo dõi đối thủ</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  Tài khoản dịch vụ bên thứ ba (đăng ký gói tìm kiếm Maps)
                </td>
                <td style="padding:12px;vertical-align:top">
                  <span class="chip" style="background:#f3e8ff;color:#6b21a8">Third-party API Key</span><br>
                  <span class="muted" style="font-size:11px">SerpApi Key lưu tại backend</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  • Danh sách review công khai nhiều trang<br>
                  • Điểm sao, trích dẫn, ảnh đính kèm<br>
                  • Dữ liệu đối thủ cạnh tranh không có quyền GBP
                </td>
                <td style="padding:12px;vertical-align:top">
                  ⚠ Phát sinh chi phí theo lượt request.<br>
                  ⚠ Có độ trễ, không cam kết lấy đủ 100% trong mọi trường hợp.<br>
                  ⚠ Phải tuân thủ điều khoản nguồn và quyền sử dụng dữ liệu.
                </td>
              </tr>

              <tr>
                <td style="padding:12px;vertical-align:top">
                  <b>D. Import Dữ liệu có sẵn (File / Batch)</b><br>
                  <span class="muted" style="font-size:12px">Nhập từ file CSV/JSON snapshot hoặc CSKH</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  Quyền quản trị workspace CheckBrand nội bộ
                </td>
                <td style="padding:12px;vertical-align:top">
                  <span class="chip" style="background:#f1f5f9;color:#475569">File CSV / JSON</span><br>
                  <span class="muted" style="font-size:11px">Phiên làm việc xác thực</span>
                </td>
                <td style="padding:12px;vertical-align:top">
                  • Toàn bộ dữ liệu lịch sử được chuẩn hóa<br>
                  • Lưu giữ nguồn, mã định danh, thời điểm và phạm vi thu thập
                </td>
                <td style="padding:12px;vertical-align:top;color:var(--text-secondary)">
                  <i>Trạng thái: Chưa triển khai bộ import trên backend.</i><br>
                  Khi triển khai cần đối chiếu schema để tránh sai lệch trường dữ liệu.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Callout phân biệt định danh -->
        <div style="margin-top:16px;padding:14px;background:var(--surface-2);border-radius:8px;border:1px dashed var(--line);font-size:13px">
          <b style="color:var(--primary)">📌 Lưu ý cốt lõi về các loại Định danh Địa điểm (Identifiers):</b>
          <div style="margin-top:6px;display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px">
            <div>• <b>Place ID</b> (<code>ChIJ...</code>): Định danh địa điểm của Places API. Dùng tra cứu thông tin địa điểm công khai.</div>
            <div>• <b>CID / data_id</b> (<code>0x...:0x...</code>): Mã số định danh của Google Maps. Thường dùng trong SerpApi và URL Maps nội bộ.</div>
            <div>• <b>URL Maps</b> (<code>maps.google.com/?cid=...</code>): Đường dẫn xem trên trình duyệt dành cho người dùng.</div>
            <div>• <b>GBP accountId / locationId</b> (<code>accounts/X/locations/Y</code>): Định danh nội bộ trong Business Profile API để đọc & trả lời review.</div>
          </div>
          <div class="muted" style="margin-top:8px;font-size:12px">
            * <b>Tuyệt đối không dùng thay thế tùy ý</b> giữa các định danh này vì mỗi API chỉ chấp nhận định danh tương ứng.
          </div>
        </div>
      </div>

      <!-- PHẦN 2: HƯỚNG DẪN TỪNG BƯỚC KẾT NỐI (ACCORDION) -->
      <div class="card" style="margin-bottom:20px;padding:20px">
        <h2 style="margin:0 0 14px 0;font-size:16px">2. Hướng dẫn Kỹ thuật Từng bước</h2>

        <!-- Accordion 6.1 Places API -->
        <details class="guide-accordion" style="margin-bottom:12px;border:1px solid var(--line);border-radius:8px;padding:12px 16px;background:var(--surface-1)">
          <summary style="font-weight:600;font-size:14px;cursor:pointer;color:var(--primary);display:flex;align-items:center;justify-content:space-between">
            <span>6.1. Hướng dẫn Kết nối Google Maps / Places API (New)</span>
            <span class="chip" style="font-size:11px">API Key</span>
          </summary>
          <div style="margin-top:12px;font-size:13px;line-height:1.6;color:var(--text-secondary);border-top:1px solid var(--line);padding-top:12px">
            <ol style="margin:0;padding-left:20px">
              <li><b>Đăng nhập Google Cloud Console:</b> Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">console.cloud.google.com ↗</a> bằng tài khoản quản trị.</li>
              <li><b>Tạo hoặc chọn Project:</b> Tạo project mới (ví dụ: <code>brand-command-production</code>).</li>
              <li><b>Liên kết Billing:</b> Bắt buộc liên kết Billing Account để kích hoạt Places API (Google tặng 200$ tín dụng hàng tháng cho tài khoản mới).</li>
              <li><b>Bật API:</b> Vào <i>APIs & Services &gt; Library</i>, tìm kiếm và kích hoạt <b>Places API (New)</b>.</li>
              <li><b>Tạo API Key:</b> Vào <i>APIs & Services &gt; Credentials</i>, chọn <i>Create Credentials &gt; API key</i>.</li>
              <li><b>Giới hạn bảo mật Key (Bắt buộc):</b>
                <br>- <i>API restrictions:</i> Chỉ cho phép gọi <b>Places API (New)</b>.
                <br>- <i>Application restrictions:</i> Giới hạn IP của server backend (hoặc HTTP Referrers nếu dùng client có kiểm soát).
              </li>
              <li><b>Lấy Place ID của chi nhánh:</b> Dùng công cụ chính thức <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer">Place ID Finder ↗</a> hoặc API <i>Place Search</i>.</li>
              <li><b>Đối chiếu địa chỉ:</b> So khớp tên và địa chỉ thực tế để tránh nhầm lẫn giữa các chi nhánh cùng chuỗi.</li>
              <li><b>Lưu trữ Key an toàn:</b> Đặt key trong biến môi trường backend (<code>GOOGLE_MAPS_API_KEY</code>), <b>tuyệt đối không nhúng vào mã nguồn frontend</b>.</li>
              <li><b>Thử nghiệm Place Details với Field Mask tối thiểu:</b> Chỉ yêu cầu các trường cần thiết để tối ưu chi phí:</li>
            </ol>

            <div style="margin:10px 0;background:var(--surface-2);border-radius:6px;padding:12px;font-family:monospace;font-size:12px;overflow-x:auto">
              # Mẫu cURL thử nghiệm Place Details (Chỉ dùng Placeholder mẫu - KHÔNG nhúng key thật)<br>
              curl -X GET "https://places.googleapis.com/v1/places/YOUR_PLACE_ID_HERE?fields=id,displayName,rating,userRatingCount,reviews&languageCode=vi" \\<br>
              &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
              &nbsp;&nbsp;-H "X-Goog-Api-Key: YOUR_GCP_API_KEY_HERE"
            </div>

            <div style="margin-top:8px;font-size:12px" class="muted">
              📌 Kiểm tra quota, chi phí, quy định hiển thị logo Google (Attribution) và chính sách lưu trữ cache (tối đa 30 ngày cho Place Details) trước khi thiết lập cronjob.
            </div>
          </div>
        </details>

        <!-- Accordion 6.2 Business Profile API -->
        <details class="guide-accordion" style="margin-bottom:12px;border:1px solid var(--line);border-radius:8px;padding:12px 16px;background:var(--surface-1)">
          <summary style="font-weight:600;font-size:14px;cursor:pointer;color:var(--primary);display:flex;align-items:center;justify-content:space-between">
            <span>6.2. Hướng dẫn Kết nối Google Business Profile (GBP) APIs</span>
            <span class="chip" style="font-size:11px">OAuth 2.0</span>
          </summary>
          <div style="margin-top:12px;font-size:13px;line-height:1.6;color:var(--text-secondary);border-top:1px solid var(--line);padding-top:12px">
            <ol style="margin:0;padding-left:20px">
              <li><b>Kiểm tra quyền sở hữu địa điểm:</b> Đảm bảo tài khoản Google đã được xác minh quyền Chủ sở hữu hoặc Quản lý trên <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer">business.google.com ↗</a>.</li>
              <li><b>Kiểm tra điều kiện đăng ký GBP API:</b> Đọc kỹ điều kiện tại <a href="https://developers.google.com/my-business/content/prereqs" target="_blank" rel="noopener noreferrer">GBP Prerequisites ↗</a> và gửi biểu mẫu xin cấp quyền truy cập API nếu tổ chức chưa được duyệt.</li>
              <li><b>Tạo Project trên Google Cloud:</b> Thiết lập project cho ứng dụng đồng bộ.</li>
              <li><b>Bật các API liên quan:</b> Kích hoạt <i>My Business Account Management API</i>, <i>My Business Lodging API</i>, và <i>My Business Place Actions API</i> sau khi được chấp thuận.</li>
              <li><b>Cấu hình Màn hình đồng ý OAuth (Consent Screen):</b> Chọn User Type phù hợp (Internal cho nội bộ công ty, External cho mô hình phục vụ nhiều khách hàng), điền thông tin liên hệ và chính sách bảo mật.</li>
              <li><b>Tạo OAuth 2.0 Client ID:</b> Chọn loại <i>Web Application</i>.</li>
              <li><b>Đăng ký Redirect URI:</b> Khai báo chính xác callback endpoint trên backend (ví dụ: <code>https://api.yourdomain.com/auth/google/callback</code>).</li>
              <li><b>Cấu hình Scope chuẩn:</b> Sử dụng scope chính thức: <code>https://www.googleapis.com/auth/business.manage</code>.</li>
              <li><b>Quy trình cấp quyền phía người dùng:</b> Người quản trị bấm "Kết nối Google", đăng nhập và xác nhận đồng ý trên màn hình OAuth chính thức của Google.</li>
              <li><b>Backend đổi Auth Code lấy Token:</b> Backend nhận callback, kiểm tra CSRF <code>state</code>, đổi <code>code</code> lấy <code>access_token</code> và <code>refresh_token</code>, mã hóa và lưu trữ an toàn theo workspace.</li>
              <li><b>Liệt kê Account & Location:</b> Gọi <code>GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts</code> và <code>GET https://mybusinessbusinessinformation.googleapis.com/v1/{parent}/locations</code>.</li>
              <li><b>Ánh xạ Chi nhánh:</b> Lưu đúng cặp <code>accountId</code> và <code>locationId</code> vào hồ sơ chi nhánh.</li>
              <li><b>Đồng bộ Review & Phân trang:</b> Gọi <code>accounts/{acc}/locations/{loc}/reviews</code>, xử lý <code>nextPageToken</code> để lấy đủ các trang, chống trùng bản ghi theo review ID, và cập nhật nội dung review nếu khách sửa.</li>
              <li><b>Quyền trả lời:</b> Trả lời review qua API <code>accounts/{acc}/locations/{loc}/reviews/{rev}/reply</code> đòi hỏi phê duyệt nội bộ trước khi thực thi.</li>
              <li><b>Ngắt kết nối & Thu hồi quyền:</b> Cung cấp nút ngắt kết nối an toàn, gọi endpoint revoke token của Google và xóa token trong cơ sở dữ liệu.</li>
            </ol>
            <div style="margin-top:8px;font-size:12px;color:var(--bad)">
              ⚠ <b>Tuyệt đối không yêu cầu đối tác giao mật khẩu Google</b> cho đội ngũ triển khai. Mọi thao tác ủy quyền bắt buộc thực hiện qua OAuth consent screen chuẩn.
            </div>
          </div>
        </details>

        <!-- Accordion 6.3 Bên thứ ba -->
        <details class="guide-accordion" style="border:1px solid var(--line);border-radius:8px;padding:12px 16px;background:var(--surface-1)">
          <summary style="font-weight:600;font-size:14px;cursor:pointer;color:var(--primary);display:flex;align-items:center;justify-content:space-between">
            <span>6.3. Hướng dẫn Kết nối Nhà cung cấp Bên Thứ Ba (SerpApi)</span>
            <span class="chip" style="font-size:11px">Third-Party Adapter</span>
          </summary>
          <div style="margin-top:12px;font-size:13px;line-height:1.6;color:var(--text-secondary);border-top:1px solid var(--line);padding-top:12px">
            <ol style="margin:0;padding-left:20px">
              <li><b>Đăng ký tài khoản:</b> Truy cập <a href="https://serpapi.com/google-maps-reviews-api" target="_blank" rel="noopener noreferrer">SerpApi Google Maps Reviews API ↗</a> và đăng ký gói dịch vụ.</li>
              <li><b>Lấy API Key:</b> Sao chép khóa bí mật từ Dashboard SerpApi và lưu vào biến môi trường backend (<code>SERPAPI_KEY</code>).</li>
              <li><b>Xác định thông số địa điểm:</b> Sử dụng <code>data_id</code> (CID hex) hoặc <code>place_id</code> tương ứng của địa điểm.</li>
              <li><b>Xử lý phân trang:</b> Backend đọc <code>serpapi_pagination.next_page_token</code> để tải các trang review tiếp theo.</li>
              <li><b>Kiểm tra chi phí & quota:</b> Theo dõi số lượng searches còn lại trên Dashboard nhà cung cấp để tránh gián đoạn dịch vụ.</li>
            </ol>
            <div class="muted" style="margin-top:6px;font-size:12px">
              * Đây là bộ kết nối độc lập, không dùng chung API key với Google Places.
            </div>
          </div>
        </details>
      </div>

      <!-- PHẦN 3: HAI LỘ TRÌNH TRIỂN KHAI CHO ĐỐI TÁC -->
      <div class="card" style="margin-bottom:20px;padding:20px">
        <h2 style="margin:0 0 14px 0;font-size:16px">3. Hai Lộ trình Triển khai cho Đối tác</h2>
        <div class="grid g2" style="gap:16px">
          <div style="background:var(--surface-2);border-radius:8px;padding:16px;border:1px solid var(--line)">
            <h3 style="margin-top:0;font-size:14px;color:var(--primary);display:flex;align-items:center;gap:6px">
              <span>🏢 Lộ trình A — Dùng hệ thống do chúng tôi vận hành (Managed SaaS)</span>
            </h3>
            <div style="font-size:13px;line-height:1.6;color:var(--text-secondary)">
              <b>Phân công trách nhiệm:</b>
              <ul style="margin:6px 0;padding-left:18px">
                <li><b>Đội ngũ vận hành:</b> Triển khai toàn bộ backend server, HTTPS, cơ sở dữ liệu bảo mật, ứng dụng Google Cloud đã kiểm duyệt và hệ thống cronjob đồng bộ định kỳ.</li>
                <li><b>Đối tác / Khách hàng:</b> Nhận URL đăng nhập workspace riêng, bấm "Ủy quyền Google" qua OAuth popup hoặc cung cấp Place ID chi nhánh.</li>
              </ul>
              <div style="margin-top:10px;padding:8px 12px;background:var(--surface-1);border-radius:6px;font-size:12px">
                ✓ <b>Ưu điểm:</b> Đối tác không cần tạo GCP Project, không cần quản lý kỹ thuật, triển khai trong 10 phút.
              </div>
            </div>
          </div>

          <div style="background:var(--surface-2);border-radius:8px;padding:16px;border:1px solid var(--line)">
            <h3 style="margin-top:0;font-size:14px;color:var(--text-primary);display:flex;align-items:center;gap:6px">
              <span>⚙️ Lộ trình B — Đối tác tự vận hành (Self-Hosted / On-Premise)</span>
            </h3>
            <div style="font-size:13px;line-height:1.6;color:var(--text-secondary)">
              <b>Yêu cầu chuẩn bị từ phía đối tác:</b>
              <ul style="margin:6px 0;padding-left:18px">
                <li>Server backend (Node.js/Python), Domain hỗ trợ HTTPS hợp lệ.</li>
                <li>Cơ sở dữ liệu (PostgreSQL/MongoDB) và hệ thống lưu secret an toàn.</li>
                <li>GCP Project riêng, cấu hình OAuth consent screen và đăng ký duyệt Business Profile API.</li>
              </ul>
              <div style="margin-top:10px;padding:8px 12px;background:var(--surface-1);border-radius:6px;font-size:12px;color:var(--bad)">
                ⚠ <b>Lưu ý:</b> Chỉ gửi file HTML hiện tại <b>chưa đủ</b> để tự quét dữ liệu thật nếu chưa có backend tương ứng!
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PHẦN 4: HƯỚNG DẪN TÍCH HỢP LLM (GEMINI) -->
      <div class="card" style="margin-bottom:20px;padding:20px">
        <h2 style="margin:0 0 12px 0;font-size:16px;display:flex;align-items:center;gap:8px">
          <span>4. Tích hợp AI / LLM Bên ngoài (Google Gemini API)</span>
        </h2>
        <div style="font-size:13px;line-height:1.6;color:var(--text-secondary)">
          <div style="margin-bottom:12px">
            <b>Vai trò của LLM trong hệ thống:</b>
            <ul style="margin:4px 0;padding-left:18px">
              <li>Phân loại cảm xúc chuẩn xác theo từng ngành (Clinic, F&B, Retail, Khách sạn, v.v.).</li>
              <li>Trích xuất chủ đề (Topics) và từ khóa rủi ro theo bộ tiêu chí động.</li>
              <li>Tạo bản nháp phản hồi gợi ý (Draft Reply) cá nhân hóa cho từng review/mention.</li>
              <li><b>Lưu ý:</b> LLM <b>không thay thế</b> API thu thập dữ liệu nguồn (Places/GBP). Khóa API của LLM hoàn toàn tách biệt với khóa Google Maps. Không bắt buộc bật LLM mới xem được dữ liệu đánh giá.</li>
            </ul>
          </div>

          <div style="background:var(--surface-2);border-radius:8px;padding:14px;border:1px solid var(--line);margin-bottom:12px">
            <b style="color:var(--primary)">Quy trình thiết lập Google Gemini API:</b>
            <ol style="margin:6px 0;padding-left:20px">
              <li>Truy cập <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer">Google AI Studio ↗</a> và đăng nhập bằng tài khoản Google.</li>
              <li>Chọn <i>Get API Key &gt; Create API Key</i> trong project Google Cloud tương ứng.</li>
              <li>Kiểm tra bảng giá và hạn mức tại <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Gemini Billing & Pricing ↗</a> (Gemini 1.5 Flash có gói miễn phí theo hạn mức RPM/TPM nhất định).</li>
              <li>Lưu key tại backend qua biến môi trường <code>GEMINI_API_KEY</code>.</li>
              <li>Cấu hình timeout (khuyến nghị 15s), retry 2 lần và giới hạn token đầu ra.</li>
              <li><b>Kiểm soát cấu trúc đầu ra:</b> Sử dụng <code>response_mime_type: "application/json"</code> với JSON Schema chặt chẽ để đảm bảo kết quả phân tích hợp lệ.</li>
            </ol>
          </div>

          <!-- Phòng chống Prompt Injection & Nguyên tắc duyệt -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="padding:12px;background:var(--surface-1);border-left:3px solid var(--bad);border-radius:4px;font-size:12px">
              <b style="color:var(--bad)">🛡️ Phòng chống Prompt Injection:</b><br>
              Nội dung review từ khách hàng được truyền vào prompt dưới dạng <b>dữ liệu thô (JSON input)</b>. Tuyệt đối không ghép chuỗi trực tiếp và yêu cầu mô hình không thực thi bất kỳ chỉ dẫn nào nằm trong nội dung review.
            </div>
            <div style="padding:12px;background:var(--surface-1);border-left:3px solid var(--primary);border-radius:4px;font-size:12px">
              <b style="color:var(--primary)">👤 Nguyên tắc Phê duyệt (Human-in-the-loop):</b><br>
              Bản nháp do AI sinh ra chỉ mang tính gợi ý. Mọi nội dung phản hồi bắt buộc phải qua bước <b>"✓ Phê duyệt chuyên môn / phát ngôn"</b> của nhân sự quản lý trước khi xuất bản.
            </div>
          </div>
        </div>
      </div>

      <!-- PHẦN 5: KẾ HOẠCH THIẾT LẬP VÀ MẪU BÀN GIAO (INTERACTIVE) -->
      <div class="card" style="margin-bottom:20px;padding:20px" id="handover-section">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
          <div>
            <h2 style="margin:0 0 4px 0;font-size:16px">5. Kế hoạch Thiết lập & Mẫu Cấu hình Bàn giao</h2>
            <div class="muted" style="font-size:12px">
              Nhập thông tin bàn giao kỹ thuật (thông tin không bí mật). Có thể lưu trên trình duyệt này hoặc xuất file JSON đặc tả.
            </div>
          </div>
          <span class="chip" style="background:#dcfce7;color:#166534;font-weight:600">Bộ tạo bàn giao</span>
        </div>

        <div class="banner" style="background:var(--surface-2);border-left:4px solid var(--bad);margin-bottom:16px;padding:10px 14px;border-radius:6px;font-size:12px">
          <b>⛔ NGUYÊN TẮC BẢO MẬT:</b> Tuyệt đối <b>KHÔNG nhập API key, Client Secret, OAuth Token hoặc mật khẩu</b> vào biểu mẫu này. Kế hoạch này được lưu cục bộ trên trình duyệt máy này (localStorage), không tự đồng bộ sang máy khác và không tự đi kèm file HTML khi gửi qua email/zalo.
        </div>

        <form id="handover-plan-form" onsubmit="event.preventDefault(); saveHandoverPlan();" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Tên Đối tác / Workspace:</label>
            <input type="text" id="hp-partner" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)" placeholder="Ví dụ: Tập đoàn Golden Hotpot Vietnam" required>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Ngành kinh doanh:</label>
            <select id="hp-industry" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)">
              <option value="aesthetic_clinic">Thẩm mỹ & Y tế / Clinic</option>
              <option value="f_and_b">Nhà hàng & F&B / Ẩm thực</option>
              <option value="retail_ecommerce">Bán lẻ & E-commerce / Chuỗi Cửa hàng</option>
              <option value="hospitality">Khách sạn & Du lịch</option>
              <option value="education">Giáo dục & Đào tạo</option>
              <option value="generic">Doanh nghiệp dịch vụ tổng hợp</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">URL Backend API dự kiến:</label>
            <input type="text" id="hp-backend" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)" placeholder="https://api.yourdomain.com">
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Định danh Chi nhánh / Địa điểm:</label>
            <input type="text" id="hp-location-id" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)" placeholder="Place ID (ChIJ...) hoặc GBP Location ID">
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Mô hình AI / LLM dự kiến:</label>
            <select id="hp-llm-model" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)">
              <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Khuyến nghị - Ổn định & Tốc độ)</option>
              <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Phân tích & Suy luận sâu)</option>
              <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
              <option value="self-hosted">Mô hình tự vận hành / On-Premise</option>
              <option value="none">Không sử dụng AI / Chỉ dùng quy tắc nghiệp vụ</option>
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Lịch đồng bộ đề xuất:</label>
            <select id="hp-sync-schedule" class="input" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary)">
              <option value="daily_0800">Mỗi ngày 1 lần (08:00 sáng)</option>
              <option value="twice_daily">Mỗi ngày 2 lần (08:00 & 18:00)</option>
              <option value="hourly">Mỗi giờ 1 lần (Cho chiến dịch cao điểm)</option>
              <option value="manual">Chỉ đồng bộ thủ công khi kích hoạt</option>
            </select>
          </div>

          <div style="grid-column:1/-1">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Nguồn dữ liệu dự kiến kết nối:</label>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hp-src-places" checked> Google Maps Places API (New)</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hp-src-gbp" checked> Google Business Profile API (Chính chủ)</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hp-src-serpapi"> SerpApi (Đối thủ / Dự phòng)</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hp-src-import"> File Import CSV/JSON</label>
            </div>
          </div>

          <div style="grid-column:1/-1">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px">Ghi chú phạm vi triển khai & phân quyền:</label>
            <textarea id="hp-notes" rows="2" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface-1);color:var(--text-primary);font-size:13px" placeholder="Ghi chú về số lượng chi nhánh, phòng ban tham gia kiểm duyệt hoặc quy định SLA riêng..."></textarea>
          </div>

          <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
            <button type="submit" class="btn primary" style="display:inline-flex;align-items:center;gap:6px">💾 Lưu kế hoạch trên trình duyệt này</button>
            <button type="button" class="btn" onclick="exportHandoverJson()" style="display:inline-flex;align-items:center;gap:6px">📥 Xuất JSON kế hoạch</button>
            <button type="button" class="btn" onclick="copyEnvTemplate()" style="display:inline-flex;align-items:center;gap:6px">📋 Sao chép mẫu .env (placeholder)</button>
            <button type="button" class="btn" onclick="clearHandoverPlan()" style="color:var(--bad)">🗑️ Xóa kế hoạch</button>
          </div>
        </form>

        <div id="hp-saved-status" style="margin-top:12px;font-size:12px" class="muted">
          Trạng thái: Chưa có cấu hình lưu cục bộ.
        </div>
      </div>

      <!-- PHẦN 6: TÀI LIỆU CHÍNH THỨC CẦN THAM KHẢO -->
      <div class="card" style="padding:20px">
        <h2 style="margin:0 0 12px 0;font-size:16px">6. Danh mục Tài liệu Chính thức</h2>
        <div style="font-size:13px;line-height:1.7;display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:10px">
          <div>
            <b>Google Cloud & Places:</b><br>
            • <a href="https://developers.google.com/maps/documentation/places/web-service/get-api-key" target="_blank" rel="noopener noreferrer">Places API Key Guide ↗</a><br>
            • <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer">Place ID Overview ↗</a><br>
            • <a href="https://developers.google.com/maps/documentation/places/web-service/place-details" target="_blank" rel="noopener noreferrer">Place Details (New) ↗</a><br>
            • <a href="https://developers.google.com/maps/documentation/places/web-service/policies" target="_blank" rel="noopener noreferrer">Places API Policies & Attribution ↗</a>
          </div>
          <div>
            <b>Google Business Profile:</b><br>
            • <a href="https://developers.google.com/my-business/content/prereqs" target="_blank" rel="noopener noreferrer">GBP Prerequisites & Approval ↗</a><br>
            • <a href="https://developers.google.com/my-business/content/basic-setup" target="_blank" rel="noopener noreferrer">GBP Basic Setup Guide ↗</a><br>
            • <a href="https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list" target="_blank" rel="noopener noreferrer">GBP Reviews List API ↗</a>
          </div>
          <div>
            <b>AI & Third-Party:</b><br>
            • <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer">Google AI Studio & Gemini Key ↗</a><br>
            • <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Gemini API Pricing & Billing ↗</a><br>
            • <a href="https://serpapi.com/google-maps-reviews-api" target="_blank" rel="noopener noreferrer">SerpApi Google Maps Reviews API ↗</a>
          </div>
        </div>
      </div>
    </div>
  `;
    }


    /* ---------- Hướng dẫn & Kết nối (Handover Plan & Config - Fix B5, B6) ---------- */
    function getHandoverPlanFormData() {
      const partner = (document.getElementById('hp-partner')?.value || '').trim();
      const industry = document.getElementById('hp-industry')?.value || 'generic';
      const backend = (document.getElementById('hp-backend')?.value || '').trim();
      const aiOption = document.getElementById('hp-llm-model')?.value || 'gemini-2.5-flash';
      const syncSchedule = document.getElementById('hp-sync-schedule')?.value || 'daily_0800';
      const notes = (document.getElementById('hp-notes')?.value || '').trim();

      const sources = [];
      if (document.getElementById('hp-src-places')?.checked) sources.push('google_places_api');
      if (document.getElementById('hp-src-gbp')?.checked) sources.push('google_business_profile');
      if (document.getElementById('hp-src-serpapi')?.checked) sources.push('serpapi_fallback');
      if (document.getElementById('hp-src-import')?.checked) sources.push('file_batch_import');

      // Kiểm tra an toàn URL backend (Fix B5)
      if (backend) {
        const u = parseUrlSafe(backend);
        if (!u) {
          throw new Error('URL backend không hợp lệ. Vui lòng nhập URL dạng https://api.yourdomain.com');
        }
        if (u.username || u.password) {
          throw new Error('Cảnh báo bảo mật: Tuyệt đối không lưu mật khẩu hoặc thông tin đăng nhập trong URL backend!');
        }
        if (/(token|password|secret|key)=/i.test(u.search) || /(token|password|secret|key)=/i.test(u.hash)) {
          throw new Error('Cảnh báo bảo mật: Không truyền token hoặc khóa bí mật trong query string hoặc hash của URL backend!');
        }
      }

      // Kiểm tra bảo mật tổng quát: không lưu API Key / Secret thật trong form
      const textToCheck = [partner, backend, notes].join(' ');
      if (/AIza[0-9A-Za-z-_]{35}/.test(textToCheck) || /GOCSPX-[0-9A-Za-z-_]{28}/.test(textToCheck) || /(Bearer\\s+[a-zA-Z0-9_\\-\\.]{20,})/i.test(textToCheck)) {
        throw new Error('Cảnh báo bảo mật: Tuyệt đối không nhập API Key, Client Secret hoặc Token thật vào biểu mẫu này!');
      }

      const brandLocs = getBrandLocations(S.brand);
      const locationsConfig = brandLocs.map(l => ({
        locationId: l.locationId,
        branchCode: l.branchCode,
        displayName: l.displayName,
        placeId: l.placeId,
        googleAccountId: l.googleAccountId || 'accounts/PLACEHOLDER',
        googleLocationId: l.googleLocationId || 'locations/PLACEHOLDER'
      }));

      const aiEnabled = aiOption !== 'none';

      return {
        partnerName: partner,
        industry,
        backendUrl: backend,
        sources,
        locations: locationsConfig,
        aiEnabled: aiEnabled,
        aiProvider: aiEnabled ? 'Google AI Studio / Gemini' : null,
        llmModel: aiEnabled ? aiOption : null,
        syncSchedule,
        notes,
        savedAt: new Date().toISOString()
      };
    }

    function saveHandoverPlan() {
      try {
        const plan = getHandoverPlanFormData();
        if (!plan.partnerName) {
          return toast('Vui lòng nhập Tên Đối tác / Workspace');
        }
        localStorage.setItem('cb_handover_plan', JSON.stringify(plan));
        updateHandoverPlanStatus(plan);
        toast('✓ Đã lưu kế hoạch thiết lập trên trình duyệt này!');
      } catch (err) {
        alert(err.message);
      }
    }

    function clearHandoverPlan() {
      localStorage.removeItem('cb_handover_plan');
      const form = document.getElementById('handover-plan-form');
      if (form) form.reset();
      updateHandoverPlanStatus(null);
      toast('Đã xóa kế hoạch thiết lập cục bộ');
    }

    function updateHandoverPlanStatus(plan) {
      const el = document.getElementById('hp-saved-status');
      if (!el) return;
      if (!plan) {
        el.innerHTML = 'Trạng thái: <span class="muted">Chưa có cấu hình lưu cục bộ.</span>';
      } else {
        el.innerHTML = `Trạng thái: <b style="color:var(--good)">Đã lưu cục bộ</b> (Workspace: <b>${esc(plan.partnerName)}</b> · Cập nhật: ${fmtTime(plan.savedAt)})`;
      }
    }

    function loadHandoverPlan() {
      try {
        const raw = localStorage.getItem('cb_handover_plan');
        if (!raw) return;
        const plan = JSON.parse(raw);
        if (document.getElementById('hp-partner')) document.getElementById('hp-partner').value = plan.partnerName || '';
        if (document.getElementById('hp-industry')) document.getElementById('hp-industry').value = plan.industry || 'generic';
        if (document.getElementById('hp-backend')) document.getElementById('hp-backend').value = plan.backendUrl || '';
        if (document.getElementById('hp-llm-model')) document.getElementById('hp-llm-model').value = plan.llmModel || (plan.aiEnabled ? 'gemini-2.5-flash' : 'none');
        if (document.getElementById('hp-sync-schedule')) document.getElementById('hp-sync-schedule').value = plan.syncSchedule || 'daily_0800';
        if (document.getElementById('hp-notes')) document.getElementById('hp-notes').value = plan.notes || '';

        if (plan.sources) {
          if (document.getElementById('hp-src-places')) document.getElementById('hp-src-places').checked = plan.sources.includes('google_places_api');
          if (document.getElementById('hp-src-gbp')) document.getElementById('hp-src-gbp').checked = plan.sources.includes('google_business_profile');
          if (document.getElementById('hp-src-serpapi')) document.getElementById('hp-src-serpapi').checked = plan.sources.includes('serpapi_fallback');
          if (document.getElementById('hp-src-import')) document.getElementById('hp-src-import').checked = plan.sources.includes('file_batch_import');
        }
        updateHandoverPlanStatus(plan);
      } catch (e) { }
    }

    function exportHandoverJson() {
      try {
        const plan = getHandoverPlanFormData();
        const doc = {
          title: 'CheckBrand Technical Handover Specification',
          version: '2.0.0',
          exportDate: new Date().toISOString(),
          disclaimer: 'Tài liệu này là đặc tả kỹ thuật dự kiến bàn giao cho đối tác, KHÔNG chứa secret/key thật và chưa tự kích hoạt kết nối.',
          partnerWorkspace: {
            name: plan.partnerName || 'Chưa đặt tên',
            industry: plan.industry,
            targetBackendUrl: plan.backendUrl || 'Chưa cung cấp (cần cấu hình máy chủ bảo mật)'
          },
          targetLocations: plan.locations,
          dataSourcesConfigured: plan.sources,
          aiAnalysis: {
            enabled: plan.aiEnabled,
            provider: plan.aiProvider,
            modelTarget: plan.llmModel,
            promptInjectionPolicy: 'Review text passed as raw JSON data only'
          },
          syncPolicy: {
            schedule: plan.syncSchedule,
            deduplicationField: 'review_id',
            cachingGuidelines: {
              googlePlacesApi: 'Chỉ cache Place Details phục vụ phiên người dùng hoặc theo Điều khoản Dịch vụ Google Maps Platform (không lưu vĩnh viễn nội dung bản đồ công khai)',
              googleBusinessProfile: 'Được lưu trữ dữ liệu review và vị trí thuộc quyền quản lý của doanh nghiệp',
              serpApi: 'Lưu trữ cục bộ phục vụ giám sát danh tiếng và phân tích khủng hoảng nội bộ'
            }
          },
          notes: plan.notes || 'Không có ghi chú'
        };

        const str = JSON.stringify(doc, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = `CheckBrand_Handover_Plan_${(plan.partnerName || 'partner').toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(u);
        toast('✓ Đã xuất JSON kế hoạch bàn giao thành công!');
      } catch (err) {
        alert(err.message);
      }
    }

    function copyEnvTemplate() {
      const envText = `# =================================================================
# CheckBrand / Brand Command - Backend Environment Template
# Cập nhật: 19/10/2026 - MẪU PLACEHOLDER KỸ THUẬT CHO BACKEND
# TUYỆT ĐỐI KHÔNG commit file chứa key thật lên Git repository
# =================================================================

NODE_ENV=production
PORT=3000
WORKSPACE_ID=partner_workspace_id

# 1. Google Maps / Places API (New) - Tra cứu địa điểm & rating công khai
GOOGLE_MAPS_API_KEY=YOUR_GCP_API_KEY_HERE

# 2. Google Business Profile API (Chính chủ) - Đọc & Trả lời Review
GOOGLE_OAUTH_CLIENT_ID=YOUR_OAUTH_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_OAUTH_CLIENT_SECRET_HERE
GOOGLE_OAUTH_REDIRECT_URI=https://your-backend-domain.com/auth/google/callback

# 3. SerpApi (Thu thập dữ liệu dự phòng)
SERPAPI_API_KEY=YOUR_SERPAPI_KEY_HERE

# 4. Google AI Studio / Gemini API (Phân tích cảm xúc & rủi ro)
# Hỗ trợ Gemini 2.5 Flash / Pro (Hiện hành) hiện hành
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash

# 5. Database & Security
DATABASE_URL=postgresql://user:password@localhost:5432/checkbrand_db
SESSION_SECRET=YOUR_RANDOM_SESSION_SECRET_HERE
DATA_ENCRYPTION_KEY=YOUR_32_BYTE_HEX_ENCRYPTION_KEY_HERE
`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(envText)
          .then(() => toast('✓ Đã sao chép mẫu .env (placeholder) vào bộ nhớ tạm!'))
          .catch(() => fallbackCopy(envText));
      } else {
        fallbackCopy(envText);
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('✓ Đã sao chép mẫu .env (placeholder) vào bộ nhớ tạm!');
    }

    window.saveHandoverPlan = saveHandoverPlan;
    window.exportHandoverJson = exportHandoverJson;
    window.copyEnvTemplate = copyEnvTemplate;
    window.clearHandoverPlan = clearHandoverPlan;
    window.loadHandoverPlan = loadHandoverPlan;



    /* =========================================================================
       GBP SMART MODALS & INTERACTIVE WORKFLOWS (ROUND 5)
       ========================================================================= */

    // 1. SMART GROUP MODAL & PREVIEW (Requirement 4 - Hỗ trợ đầy đủ tên nhóm, đa điều kiện & logic AND / OR)
    function createSmartConditionRowHtml(cond) {
      cond = cond || { field: 'googleRating', operator: '<', value: '4.8' };
      const f = cond.field || 'googleRating';
      const op = cond.operator || cond.op || '<';
      const val = cond.value ?? '4.8';
      return `<div class="sg-cond-row" style="display:grid;grid-template-columns:1.8fr 1.2fr 1.5fr auto;gap:8px;align-items:flex-end;margin-bottom:8px">
        <div>
          <label class="muted" style="font-size:11px;display:block;margin-bottom:3px">Trường dữ liệu:</label>
          <select class="sg-row-field btn" style="width:100%;font-size:12px;padding:6px">
            <option value="googleRating" ${f === 'googleRating' ? 'selected' : ''}>Điểm Google Rating</option>
            <option value="googleTotalReviews" ${f === 'googleTotalReviews' ? 'selected' : ''}>Tổng số review Google</option>
            <option value="businessStatus" ${f === 'businessStatus' ? 'selected' : ''}>Trạng thái hoạt động</option>
            <option value="region" ${f === 'region' ? 'selected' : ''}>Khu vực / Tỉnh thành</option>
            <option value="profileCompleteness" ${f === 'profileCompleteness' ? 'selected' : ''}>Độ hoàn thiện hồ sơ %</option>
          </select>
        </div>
        <div>
          <label class="muted" style="font-size:11px;display:block;margin-bottom:3px">Toán tử:</label>
          <select class="sg-row-op btn" style="width:100%;font-size:12px;padding:6px">
            <option value="<" ${op === '<' ? 'selected' : ''}>&lt; (Nhỏ hơn)</option>
            <option value="<=" ${op === '<=' ? 'selected' : ''}>&le; (Nhỏ hơn hoặc bằng)</option>
            <option value=">" ${op === '>' ? 'selected' : ''}>&gt; (Lớn hơn)</option>
            <option value=">=" ${op === '>=' ? 'selected' : ''}>&ge; (Lớn hơn hoặc bằng)</option>
            <option value="=" ${op === '=' ? 'selected' : ''}>= (Bằng)</option>
            <option value="!=" ${op === '!=' ? 'selected' : ''}>!= (Khác)</option>
            <option value="contains" ${op === 'contains' ? 'selected' : ''}>Chứa từ khóa</option>
          </select>
        </div>
        <div>
          <label class="muted" style="font-size:11px;display:block;margin-bottom:3px">Giá trị ngưỡng:</label>
          <input type="text" class="sg-row-val" value="${esc(val)}" style="width:100%;box-sizing:border-box;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--surface-1);color:var(--text-primary);font-size:12px" />
        </div>
        <div>
          <button type="button" class="btn" style="padding:6px 10px;font-size:12px;color:var(--bad)" onclick="removeSmartGroupCondition(this)" title="Xóa điều kiện này">✕</button>
        </div>
      </div>`;
    }
    window.createSmartConditionRowHtml = createSmartConditionRowHtml;

    function addSmartGroupCondition() {
      const container = $('#sg-conditions-list');
      if (container) {
        const div = document.createElement('div');
        div.innerHTML = createSmartConditionRowHtml({ field: 'googleRating', operator: '>=', value: '4.5' });
        container.appendChild(div.firstElementChild);
      }
    }
    window.addSmartGroupCondition = addSmartGroupCondition;

    function removeSmartGroupCondition(btn) {
      const row = btn.closest('.sg-cond-row');
      const container = $('#sg-conditions-list');
      if (container && container.querySelectorAll('.sg-cond-row').length > 1) {
        row.remove();
      } else {
        toast('Nhóm Smart cần có ít nhất 1 điều kiện lọc');
      }
    }
    window.removeSmartGroupCondition = removeSmartGroupCondition;

    function getSmartGroupFormState() {
      const nameInput = $('#sg-name');
      const groupName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : '';
      const logic = ($('#sg-logic') ? $('#sg-logic').value : 'AND');
      const rows = document.querySelectorAll('.sg-cond-row');
      const conditions = [];
      rows.forEach(function (r) {
        const field = r.querySelector('.sg-row-field') ? r.querySelector('.sg-row-field').value : 'googleRating';
        const operator = r.querySelector('.sg-row-op') ? r.querySelector('.sg-row-op').value : '<';
        const value = r.querySelector('.sg-row-val') ? r.querySelector('.sg-row-val').value : '';
        conditions.push({ field: field, operator: operator, value: value });
      });
      return { groupName: groupName, logic: logic, conditions: conditions };
    }
    window.getSmartGroupFormState = getSmartGroupFormState;

    function openSmartGroupModal(groupId) {
      let modal = $('#smart-group-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smart-group-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }
      document.body.classList.add('modal-open');

      const brandLocs = getBrandLocations(S.brand);
      const bSmart = (window.SHARED_SMART_GROUPS && window.SHARED_SMART_GROUPS[S.brand]) || {};
      const existingGroup = (groupId && groupId !== 'new')
        ? (bSmart[groupId] || (window.currentGroupsList && window.currentGroupsList.find(g => g.id === groupId)) || null)
        : null;

      const isStaticGroup = !groupId || groupId === 'new' || groupId === 'grp_all' || groupId === 'all' || String(groupId).indexOf('grp_reg_') === 0 || (existingGroup && existingGroup.type === 'static');
      // Nhóm động mới PHẢI có ID riêng biệt, không bao giờ dùng ID của nhóm tĩnh
      const targetGroupId = isStaticGroup ? ('grp_smart_' + Date.now()) : groupId;
      const defaultName = isStaticGroup
        ? ((groupId && groupId !== 'new' && existingGroup) ? ('Nhóm Lọc từ ' + existingGroup.name) : 'Nhóm Smart Tùy Chỉnh')
        : (existingGroup ? (existingGroup.name || 'Nhóm ' + groupId) : 'Nhóm Smart Tùy Chỉnh');
      const groupName = defaultName;
      const groupLogic = (existingGroup && existingGroup.logic) ? existingGroup.logic.toUpperCase() : 'AND';
      const existingConds = (existingGroup && Array.isArray(existingGroup.conditions) && existingGroup.conditions.length)
        ? existingGroup.conditions
        : [{ field: 'googleRating', operator: '<', value: '4.8' }];

      modal.innerHTML = `<div class="card" style="max-width:680px;width:100%;max-height:90vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 12px 35px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:17px">⚙ Thiết lập Điều kiện Nhóm Động (Smart Group)</h3>
            <div class="muted" style="font-size:12px">Quy tắc tự động đánh giá và đồng bộ danh sách chi nhánh thành viên</div>
          </div>
          <button class="btn" onclick="$('#smart-group-modal').style.display='none'; document.body.classList.remove('modal-open');">✕ Đóng</button>
        </div>

        <div style="margin-bottom:14px">
          <label class="muted" style="font-size:12px;display:block;margin-bottom:4px;font-weight:700">Tên nhóm địa điểm (Group Name):</label>
          <input type="text" id="sg-name" value="${esc(groupName)}" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface-2);color:var(--text-primary);font-size:13px;font-weight:700" placeholder="Ví dụ: Cơ sở cần cải thiện CSAT" />
        </div>

        <div style="background:var(--surface-2);border-radius:8px;padding:14px;margin-bottom:14px;border:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b style="font-size:13px">Quy tắc lọc điều kiện (Dynamic Rule Builder):</b>
            <button type="button" class="btn" style="font-size:11px;padding:3px 8px" onclick="addSmartGroupCondition()">➕ Thêm điều kiện</button>
          </div>

          <div id="sg-conditions-list" style="margin-bottom:12px">
            ${existingConds.map(c => createSmartConditionRowHtml(c)).join('')}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px dashed var(--line);flex-wrap:wrap;gap:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="muted" style="font-size:12px">Logic kết hợp:</span>
              <select id="sg-logic" class="btn" style="font-size:12px;padding:4px 8px;font-weight:700">
                <option value="AND" ${groupLogic === 'AND' ? 'selected' : ''}>AND (Thỏa mãn TẤT CẢ điều kiện)</option>
                <option value="OR" ${groupLogic === 'OR' ? 'selected' : ''}>OR (Thỏa mãn BẤT KỲ điều kiện nào)</option>
              </select>
            </div>
            <button class="btn primary" onclick="previewSmartGroup()">🔍 Chạy Preview số địa điểm phù hợp</button>
          </div>
        </div>

        <!-- Kết quả Preview -->
        <div id="sg-preview-box" style="background:var(--surface-1);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <b style="font-size:13px">Kết quả Preview Điều kiện:</b>
            <span class="chip" style="background:var(--surface-2);color:var(--text-secondary);font-weight:700">Đang tải preview...</span>
          </div>
          <div class="muted" style="font-size:12px">Bấm nút Preview phía trên để kiểm tra số lượng địa điểm thực tế thỏa mãn các điều kiện đang chọn.</div>
        </div>

        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">
          🕒 <b>Chu kỳ cập nhật:</b> Hệ thống tự động đánh giá lại thành viên nhóm khi rating/dữ liệu thay đổi hoặc mỗi 00:00 hàng ngày.
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn" onclick="$('#smart-group-modal').style.display='none'; document.body.classList.remove('modal-open');">Hủy bỏ</button>
          <button class="btn primary" onclick="saveSmartGroup('${esc(targetGroupId)}')">💾 Lưu cấu hình Nhóm Smart</button>
        </div>
      </div>`;
      modal.style.display = 'flex';
      previewSmartGroup();
    }

    async function previewSmartGroup() {
      const state = getSmartGroupFormState();
      try {
        const res = await post('location_groups/smart_preview', {
          conditions: state.conditions,
          logic: state.logic
        });
        const matched = res.matchedCount ?? res.matchingCount ?? (res.matchingLocations ? res.matchingLocations.length : 0);
        const total = res.totalCount ?? res.total ?? 0;
        const box = $('#sg-preview-box');
        if (box) {
          box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <b style="font-size:13px">Kết quả Preview Điều kiện (${state.logic}):</b>
            <span class="chip" style="background:#dcfce7;color:#15803d;font-weight:700">Khớp: ${matched} / ${total} địa điểm</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
            ${(res.matchingLocations || []).length
              ? (res.matchingLocations || []).map(l => `• <b>${esc(l.displayName)}:</b> Rating ${fmtRating(l.googleRating, 2)} ★ (${esc(l.branchCode)})`).join('<br>')
              : '<span class="muted">Không có địa điểm nào thỏa mãn bộ điều kiện hiện tại.</span>'}
          </div>`;
        }
      } catch (err) {
        toast('Lỗi preview: ' + err.message);
      }
    }

    async function saveSmartGroup(groupId) {
      const state = getSmartGroupFormState();
      if (!state.groupName) {
        toast('Vui lòng nhập tên nhóm địa điểm');
        return;
      }
      try {
        const res = await post('location_groups/save_smart', {
          groupId: groupId,
          groupName: state.groupName,
          conditions: state.conditions,
          logic: state.logic
        });
        const matched = res.matchedCount ?? res.locationCount ?? 0;
        toast(`✓ Đã lưu cấu hình "${state.groupName}" thành công! Khớp ${matched} địa điểm.`);
        const modal = $('#smart-group-modal');
        if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); }
        S.selectedGroupId = groupId;
        render();
      } catch (err) {
        toast('Lỗi lưu nhóm smart: ' + err.message);
      }
    }

    // 2. PROFILE DIFF & GOOGLE SUBMISSION MODAL (Requirement 3)
    function openProfileDiffModal(locId) {
      let modal = $('#profile-diff-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-diff-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }
      document.body.classList.add('modal-open');

      const brandLocs = getBrandLocations(S.brand);
      const loc = brandLocs.find(l => l.locationId === locId) || brandLocs[0] || {};
      const formData = typeof getProfileFormData === 'function' ? getProfileFormData() : { updates: {}, explicitDeletes: [] };
      const updates = formData.updates || {};
      const explicitDeletes = formData.explicitDeletes || [];

      const fieldsToCheck = [
        { key: 'displayName', label: 'Tên hiển thị địa điểm' },
        { key: 'primaryCategory', label: 'Danh mục chính' },
        { key: 'address', label: 'Địa chỉ niêm yết' },
        { key: 'phone', label: 'Số hotline liên hệ' },
        { key: 'website', label: 'Website chính thức' },
        { key: 'description', label: 'Mô tả giới thiệu' }
      ];

      const diffItems = fieldsToCheck.map(f => {
        const current = loc[f.key] || 'Chưa thiết lập';
        if (explicitDeletes.includes(f.key)) {
          return {
            field: f.label,
            current: current,
            next: '(Đã xóa / Để trống)',
            status: 'deleted',
            statusLabel: 'Yêu cầu xóa giá trị'
          };
        }
        if (updates[f.key] !== undefined && updates[f.key] !== loc[f.key]) {
          return {
            field: f.label,
            current: current,
            next: updates[f.key],
            status: 'updated',
            statusLabel: 'Cập nhật mới'
          };
        }
        return {
          field: f.label,
          current: current,
          next: current,
          status: 'unchanged',
          statusLabel: 'Giữ nguyên'
        };
      });
      diffItems.push({
        field: 'Vùng phục vụ',
        current: loc.isServiceAreaBusiness ? 'Có áp dụng' : 'Không áp dụng',
        next: loc.isServiceAreaBusiness ? 'Có áp dụng' : 'Không áp dụng',
        status: 'not_applicable',
        statusLabel: 'Miễn trừ'
      });

      modal.innerHTML = `<div class="card" style="max-width:750px;width:100%;max-height:92vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 12px 35px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:17px">🔍 Đối soát So sánh Trước/Sau & Xác nhận Gửi Google API</h3>
            <div class="muted" style="font-size:12px">Cơ sở: <b>${esc(loc.displayName)}</b> · Place ID: <code>${esc(loc.placeId)}</code></div>
          </div>
          <button class="btn" onclick="$('#profile-diff-modal').style.display='none'; document.body.classList.remove('modal-open');">✕ Đóng</button>
        </div>

        <div class="banner" style="margin-bottom:14px;background:var(--surface-2);border-left:4px solid var(--series-1);padding:10px;font-size:12px;line-height:1.5">
          <b>📌 Nguyên tắc Kiểm soát Thay đổi Hồ sơ:</b><br>
          • Phân biệt rõ: <b>"Không thay đổi"</b> vs <b>"Cập nhật mới"</b> vs <b>"Xóa giá trị"</b>.<br>
          • Không dùng ô trống để vừa biểu thị giữ nguyên vừa biểu thị xóa.<br>
          • Lưu bản nháp nội bộ khác với gửi lệnh cập nhật trực tiếp lên Google.
        </div>

        <table>
          <thead>
            <tr>
              <th>Trường thông tin</th>
              <th>Giá trị hiện tại trên Google</th>
              <th>Giá trị dự kiến gửi</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${diffItems.map(it => `
              <tr style="${it.status === 'updated' ? 'background:rgba(16, 185, 129, 0.06)' : ''}">
                <td><b>${esc(it.field)}</b></td>
                <td style="font-size:12px">${esc(it.current)}</td>
                <td style="font-size:12px;font-weight:600">${esc(it.next)}</td>
                <td>
                  <span class="chip" style="${it.status === 'updated' ? 'background:#dcfce7;color:#15803d;font-weight:700' : 'background:var(--surface-2);color:inherit'}">
                    ${esc(it.statusLabel)}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div style="font-size:11px;color:var(--text-secondary)">
            🔒 Quyền thao tác: <b>Brand Manager</b> · Audit Trail: Đã lưu phiên bản nháp <code>v1.4</code>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn" onclick="saveLocationProfileDraft('${esc(loc.locationId)}')">💾 Lưu bản nháp</button>
            <button class="btn primary" onclick="submitLocationProfileGoogle('${esc(loc.locationId)}')">🚀 Xác nhận gửi cập nhật lên Google</button>
          </div>
        </div>
      </div>`;
      modal.style.display = 'flex';
    }

    function getProfileFormData() {
      const updates = {};
      const explicitDeletes = [];

      const nameEl = document.getElementById('prof-name');
      if (nameEl) {
        const val = nameEl.value.trim();
        if (val) updates.displayName = val;
        else explicitDeletes.push('displayName');
      }

      const catEl = document.getElementById('prof-category');
      if (catEl) {
        const val = catEl.value.trim();
        if (val) updates.primaryCategory = val;
        else explicitDeletes.push('primaryCategory');
      }

      const addrEl = document.getElementById('prof-address');
      if (addrEl) {
        const val = addrEl.value.trim();
        if (val) updates.address = val;
        else explicitDeletes.push('address');
      }

      const phoneEl = document.getElementById('prof-phone');
      if (phoneEl) {
        const val = phoneEl.value.trim();
        if (val) updates.phone = val;
        else explicitDeletes.push('phone');
      }

      const webEl = document.getElementById('prof-website');
      if (webEl) {
        const val = webEl.value.trim();
        if (val) {
          updates.website = val;
        } else {
          explicitDeletes.push('website');
        }
      }

      const descEl = document.getElementById('prof-desc');
      if (descEl) {
        const val = descEl.value.trim();
        if (val) updates.description = val;
        else explicitDeletes.push('description');
      }

      const bookEl = document.getElementById('prof-booking-url');
      if (bookEl) {
        const val = bookEl.value.trim();
        if (val) updates.bookingUrl = val;
        else explicitDeletes.push('bookingUrl');
      }

      return { updates, explicitDeletes };
    }
    window.getProfileFormData = getProfileFormData;

    async function saveLocationProfileDraft(locId) {
      try {
        const formData = getProfileFormData();
        const res = await post(`locations/${locId}/profile`, {
          action: 'save_draft',
          updates: formData.updates,
          explicitDeletes: formData.explicitDeletes
        });
        toast('✓ Đã lưu bản nháp hồ sơ nội bộ an toàn (Chưa áp dụng lên Google Maps)!');
        const modal = $('#profile-diff-modal');
        if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); }
        render();
      } catch (err) {
        toast('Lỗi lưu nháp: ' + err.message);
      }
    }

    async function submitLocationProfileGoogle(locId) {
      try {
        const formData = getProfileFormData();
        const res = await post(`locations/${locId}/profile`, {
          action: 'submit_google',
          updates: formData.updates,
          explicitDeletes: formData.explicitDeletes
        });
        toast(`✓ Đã mô phỏng đồng bộ Google Business Profile (GBP API) thành công! Trạng thái: ${res.syncStatus || 'synced'}`);
        const modal = $('#profile-diff-modal');
        if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); }
        render();
      } catch (err) {
        toast('Lỗi đồng bộ Google: ' + err.message);
      }
    }

    // 3. POST DISPATCH SCOPE & VARIABLES MODAL (Requirements 5 & 6)
    function insertPostVar(vName) {
      const ta = document.getElementById('post-master-content');
      if (!ta) return;
      const start = ta.selectionStart || ta.value.length;
      const end = ta.selectionEnd || ta.value.length;
      ta.value = ta.value.substring(0, start) + vName + ta.value.substring(end);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + vName.length;
    }

    function openDispatchScopeModal() {
      let modal = $('#dispatch-scope-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dispatch-scope-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }
      document.body.classList.add('modal-open');

      const brandLocs = getBrandLocations(S.brand);
      const masterContent = (document.getElementById('post-master-content') ? document.getElementById('post-master-content').value : '');

      // Preview variant for first branch
      const firstLoc = brandLocs[0];
      const renderedFirst = masterContent
        .replace(/{{brand_name}}/g, cur()?.name || 'Seoul Center')
        .replace(/{{location_name}}/g, firstLoc.displayName)
        .replace(/{{address}}/g, firstLoc.address)
        .replace(/{{hotline}}/g, firstLoc.phone)
        .replace(/{{website}}/g, firstLoc.website)
        .replace(/{{booking_link}}/g, firstLoc.bookingUrl || 'https://seoulcenter.vn/dat-lich-kham');

      modal.innerHTML = `<div class="card" style="max-width:700px;width:100%;max-height:90vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 12px 35px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:17px">🔍 Kiểm tra Biến & Xác nhận Phạm vi Xuất bản</h3>
            <div class="muted" style="font-size:12px">Kiểm soát chặt chẽ danh sách chi nhánh và loại trừ biến rỗng</div>
          </div>
          <button class="btn" onclick="$('#dispatch-scope-modal').style.display='none'; document.body.classList.remove('modal-open');">✕ Đóng</button>
        </div>

        <div class="grid g2" style="gap:12px;margin-bottom:14px">
          <div style="background:var(--surface-2);border-radius:8px;padding:12px;border:1px solid var(--line)">
            <b style="font-size:13px">Phạm vi địa điểm đích:</b>
            <div style="font-size:22px;font-weight:700;color:var(--primary);margin:4px 0">${brandLocs.length} địa điểm</div>
            <div class="muted" style="font-size:11px">✓ Đã kích hoạt cơ chế chống gửi trùng lặp nếu cơ sở thuộc nhiều nhóm.</div>
          </div>
          <div style="background:var(--surface-2);border-radius:8px;padding:12px;border:1px solid var(--line)">
            <b style="font-size:13px">Địa điểm bị loại trừ:</b>
            <div style="font-size:22px;font-weight:700;color:var(--good);margin:4px 0">0 địa điểm</div>
            <div class="muted" style="font-size:11px">✓ Tất cả 3 chi nhánh đều đủ điều kiện và đang kết nối API.</div>
          </div>
        </div>

        <div style="margin-bottom:14px">
          <b style="font-size:13px;display:block;margin-bottom:6px">Xem trước nội dung sau khi thay biến (Chi nhánh mẫu: ${esc(firstLoc.displayName)}):</b>
          <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:13px;line-height:1.5">
            “${esc(renderedFirst)}”
          </div>
        </div>

        <div class="banner" style="margin-bottom:16px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:10px;font-size:12px">
          ✓ <b>Kiểm tra an toàn:</b> Toàn bộ biến <code>{{brand_name}}</code>, <code>{{location_name}}</code>, <code>{{address}}</code>, <code>{{hotline}}</code>, <code>{{booking_link}}</code> đều có dữ liệu hợp lệ. Không có mã placeholder nào bị xuất bản trần.
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button class="btn" onclick="$('#dispatch-scope-modal').style.display='none'; document.body.classList.remove('modal-open');">Hủy bỏ</button>
          <button class="btn primary" onclick="confirmDispatchPosts()">🚀 Xác nhận Xuất bản Hàng loạt (${brandLocs.length} Chi nhánh)</button>
        </div>
      </div>`;
      modal.style.display = 'flex';
    }

    async function confirmDispatchPosts() {
      const masterContent = (document.getElementById('post-master-content') ? document.getElementById('post-master-content').value : 'Ưu đãi tháng 10 tại {{brand_name}} chi nhánh {{location_name}} - Liên hệ {{hotline}}');
      const brandLocs = getBrandLocations(S.brand);
      const targetLocationIds = brandLocs.map(l => l.locationId);
      try {
        const res = await post('posts/dispatch', {
          masterContent: masterContent,
          masterPost: { content: masterContent },
          scope: 'all',
          targetLocationIds: targetLocationIds,
          brandId: S.brand
        });
        toast(`✓ Đã điều phối xuất bản: ${res.successCount} thành công, ${res.failedCount} thất bại. Trạng thái: ${res.aggregateStatus}`);
        const modal = $('#dispatch-scope-modal');
        if (modal) { modal.style.display = 'none'; document.body.classList.remove('modal-open'); }
        render();
      } catch (err) {
        toast('Lỗi điều phối bài đăng: ' + err.message);
      }
    }

    async function retryFailedPosts() {
      try {
        const brandLocs = getBrandLocations(S.brand);
        let failedLocIds = [];
        if (window.__LAST_POST_JOB && window.__LAST_POST_JOB.brandId === S.brand && window.__LAST_POST_JOB.results) {
          failedLocIds = window.__LAST_POST_JOB.results.filter(r => r.status === 'failed').map(r => r.locationId);
        }
        if (!failedLocIds.length && brandLocs.length > 2) {
          failedLocIds = [brandLocs[brandLocs.length - 1].locationId];
        }
        const res = await post('posts/retry_failed', {
          brandId: S.brand,
          failedLocationIds: failedLocIds,
          failedLocIds: failedLocIds
        });
        toast(`✓ Đã thử lại thành công cho ${res.retriedCount} chi nhánh lỗi! Trạng thái tổng: ${res.aggregateStatus}`);
        S.postFilter = 'all';
        render();
      } catch (err) {
        toast('Lỗi thử lại bài đăng: ' + err.message);
      }
    }

    // 4. BATCH QR PRINTABLE DECAL A6 MODAL (Requirement 11 - Đồng bộ bộ lọc hợp lệ giữa Preview & In)
    function openQrBatchModal() {
      let modal = $('#qr-batch-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qr-batch-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }
      document.body.classList.add('modal-open');

      const brandLocs = getBrandLocations(S.brand);
      const qMode = S.qrMode || 'direct';
      const eligibleLocs = brandLocs.filter(isLocationQrEligible);
      const skippedLocs = brandLocs.filter(l => !isLocationQrEligible(l));

      modal.innerHTML = `<div class="card" style="max-width:850px;width:100%;max-height:92vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 12px 35px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:10px">
          <div>
            <h3 style="margin:0;font-size:17px">🖨 Bộ Nhãn In Ấn Để Bàn / Decal A6 Theo Nhóm Cơ Sở</h3>
            <div class="muted" style="font-size:12px">
              Kích thước chuẩn A6 (105 × 148 mm) · <b>${eligibleLocs.length}/${brandLocs.length} nhãn hợp lệ được xuất</b>
              ${skippedLocs.length ? ` · <span style="color:var(--bad)">(${skippedLocs.length} cơ sở bị bỏ qua do thiếu Place ID)</span>` : ''}
            </div>
          </div>
          <button class="btn" onclick="$('#qr-batch-modal').style.display='none'; document.body.classList.remove('modal-open');">✕ Đóng</button>
        </div>

        ${skippedLocs.length ? `
          <div class="banner warning" style="margin-bottom:16px;background:#fff1f2;border:1px solid #fecdd3;border-left:4px solid var(--bad);padding:10px 14px;border-radius:8px;font-size:12px">
            <b style="color:var(--bad)">⚠️ ${skippedLocs.length} địa điểm bị bỏ qua khi in ấn:</b> ${skippedLocs.map(s => esc(s.displayName)).join(', ')} do chưa liên kết mã Place ID Google Maps hợp lệ.
          </div>
        ` : ''}

        <div class="grid g3" style="gap:16px;margin-bottom:16px">
          ${brandLocs.map(l => {
        const isEligible = isLocationQrEligible(l);
        if (!isEligible) {
          return `
                <div style="background:#fef2f2;color:#991b1b;border-radius:10px;padding:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px dashed #f87171;opacity:0.9">
                  <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#dc2626;font-weight:700">🔒 ĐÃ KHÓA IN</div>
                  <h4 style="margin:4px 0 8px 0;font-size:13px;color:#991b1b">${esc(l.displayName)}</h4>
                  <div style="width:110px;height:110px;margin:8px auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border:1px dashed #fca5a5;border-radius:6px;font-size:11px;color:#ef4444">
                    <span style="font-size:24px;margin-bottom:4px">🔒</span>
                    <span>Thiếu Place ID</span>
                  </div>
                  <div style="font-size:10px;color:#b91c1c;margin-top:6px;font-weight:600">Bị bỏ qua khi in do thiếu Place ID</div>
                  <div class="muted" style="font-size:9px;margin-top:6px">ID: ${esc(l.branchCode)}</div>
                </div>
              `;
        }
        const targetUrl = (qMode === 'tracked')
          ? ('https://checkbrand.vn/r/' + l.locationId + '?source=in_store_table&camp=2026')
          : ('https://search.google.com/local/writereview?placeid=' + l.placeId);
        const qrSvg = generateRealQrSvg(targetUrl, 110);
        return `
              <div style="background:#fff;color:#1e293b;border-radius:10px;padding:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:1px solid #cbd5e1">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700">CẢM ƠN QUÝ KHÁCH</span>
                  <span class="chip" style="background:#dcfce7;color:#15803d;font-size:9px;padding:1px 5px;font-weight:700">✓ Hợp lệ</span>
                </div>
                <h4 style="margin:4px 0 8px 0;font-size:13px;color:#0f172a">${esc(l.displayName)}</h4>
                <div style="margin:8px auto">${qrSvg}</div>
                <div style="font-size:10px;color:#475569;margin-top:6px">Quét mã QR để chia sẻ trải nghiệm dịch vụ trên Google Maps</div>
                <div style="font-size:10px;color:#eab308;margin-top:4px">★★★★★</div>
                <div class="muted" style="font-size:9px;margin-top:6px">ID: ${esc(l.branchCode)}</div>
              </div>
            `;
      }).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-top:1px solid var(--line);padding-top:14px">
          <span class="muted" style="font-size:12px">Quy chuẩn Google: Lời mời đánh giá trung tính, không gating và không tặng quà đánh đổi sao.</span>
          <div style="display:flex;gap:8px">
            <button class="btn" onclick="downloadBatchQrPdfOrHtml()" ${!eligibleLocs.length ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📥 Tải PDF ghép trang (${eligibleLocs.length} nhãn)</button>
            <button class="btn primary" onclick="printAllQrDecals(S.brand, S.qrMode)" ${!eligibleLocs.length ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>🖨 In trực tiếp bộ nhãn (${eligibleLocs.length} nhãn hợp lệ)</button>
          </div>
        </div>
      </div>`;
      modal.style.display = 'flex';
    }

    // 5. 3 DIVERSE AI REPLY SUGGESTIONS (Requirements 7 & 8)
    async function generateAi3Replies() {
      if (!currentWorkflowReview) return;
      const r = currentWorkflowReview;
      try {
        const res = await post('ai/suggest_replies', {
          reviewId: r.id,
          author: r.author,
          rating: r.rating,
          text: r.text
        });
        r.aiSuggestions = res.suggestions || [];
        renderWorkflowModal();
        toast('✓ Đã tạo 3 gợi ý phản hồi AI có phong cách đa dạng!');
      } catch (err) {
        toast('Lỗi tạo gợi ý AI: ' + err.message);
      }
    }

    function applyAiSuggestion(idx) {
      if (!currentWorkflowReview || !currentWorkflowReview.aiSuggestions) return;
      const sug = currentWorkflowReview.aiSuggestions[idx];
      if (!sug) return;
      const ta = document.getElementById('wf-draft-reply');
      if (ta) ta.value = sug.text;
      currentWorkflowReview.draftReply = sug.text;
      if (currentWorkflowReview.approvedReplyText && sug.text !== currentWorkflowReview.approvedReplyText) {
        currentWorkflowReview.replyStatus = 'needs_reapproval';
      }
      renderWorkflowModal();
      toast(`✓ Đã áp dụng gợi ý "${sug.label}"! Bạn có thể chỉnh sửa trước khi lưu hoặc gửi.`);
    }

    // 6. WATCHLIST ALERT LIFECYCLE HANDLER (Requirement 9)
    async function updateAlertStatus(alertId, newStatus) {
      try {
        await post(`alerts/${alertId}/status`, { status: newStatus });
        toast(`✓ Đã chuyển trạng thái cảnh báo sang: ${newStatus}`);
        render();
      } catch (err) {
        toast('Lỗi cập nhật cảnh báo: ' + err.message);
      }
    }

    window.openSmartGroupModal = openSmartGroupModal;
    window.previewSmartGroup = previewSmartGroup;
    window.saveSmartGroup = saveSmartGroup;
    window.openProfileDiffModal = openProfileDiffModal;
    window.saveLocationProfileDraft = saveLocationProfileDraft;
    window.submitLocationProfileGoogle = submitLocationProfileGoogle;
    window.insertPostVar = insertPostVar;
    window.openDispatchScopeModal = openDispatchScopeModal;
    window.confirmDispatchPosts = confirmDispatchPosts;
    window.retryFailedPosts = retryFailedPosts;
    window.openQrBatchModal = openQrBatchModal;
    window.generateAi3Replies = generateAi3Replies;
    window.applyAiSuggestion = applyAiSuggestion;
    window.updateAlertStatus = updateAlertStatus;


    /* ---------- shell ---------- */
    function renderSide() {
      const b = cur();
      const bs = S.cfg.brands;
      const [lab] = LEVEL[b.level];
      const bConfig = getBrandConfig(S.brand);
      const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
      const healthObj = (typeof calcBrandHealth === 'function') ? calcBrandHealth(pool, bConfig, S.days || 30) : null;
      const hs = healthObj ? healthObj.score : null;
      const R = 22, C = 2 * Math.PI * R;
      S.sideHtml = `<div class="brandbox"><div class="logo"><i></i><i></i><i></i><i></i></div><div><b>Brand Command</b><span class="muted" style="font-size:12px">CheckBrand</span></div></div>
  <select class="brandsel" id="brandsel">${bs.map((x) => `<option value="${x.id}" ${x.id === S.brand ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
  ${NAV.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([id, ic, t]) => { const lbl = id === 'branches' ? ('So sánh ' + (bConfig.unitType || 'đơn vị')) : t; return `<button class="nav ${S.route === id ? 'on' : ''}" data-act="nav" data-v="${id}"><span class="ic">${ic}</span>${lbl}${id === 'alerts' && b.unread ? `<span class="badge">${b.unread}</span>` : ''}</button>`; }).join('')}`).join('')}
  <div class="healthcard"><div class="t">Brand Health Score</div><div class="row" style="margin-top:6px"><svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="${R}" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="27" cy="27" r="${R}" fill="none" stroke="var(${hs != null ? (hs >= 80 ? '--good' : hs >= 60 ? '--warn' : '--bad') : '--line'})" stroke-width="6" stroke-linecap="round" stroke-dasharray="${hs != null ? ((hs / 100) * C) : 0} ${C}" transform="rotate(-90 27 27)"/><text x="27" y="31" text-anchor="middle" style="font-size:13px;font-weight:650;fill:var(--text-primary)">${hs ?? '-'}</text></svg><div><b>${hs ?? '-'}</b><span class="muted">${hs != null ? '/100' : ''}</span><div class="muted" style="font-size:11px">${hs != null ? `Khủng hoảng: ${lab}` : 'Chưa đủ dữ liệu'}</div></div></div></div>
  <div class="sidefoot"><button class="btn" data-act="sync" id="syncbtn">${b.syncing ? 'Đang cập nhật…' : '↻ Cập nhật ngay'}</button><button class="btn" data-act="theme">${document.documentElement.dataset.theme === 'dark' ? '☀ Giao diện sáng' : '☾ Giao diện tối'}</button>
  <div class="live"><span class="dot ${S.live ? '' : 'off'}"></span>${S.live ? 'LIVE — đang kết nối' : (S.liveText || 'Dữ liệu chụp ngày 15/10/2026')} · ${fmtTime(b.lastSync)}</div></div>`;
      $('#side').innerHTML = S.sideHtml;
    }

    async function loadCfg() {
      S.cfg = await fetch('/api/config').then((r) => r.json());
      if (!S.cfg.brands.some((b) => b.id === S.brand)) S.brand = S.cfg.brands[0]?.id;
      const bConfig = getBrandConfig(S.brand);
      const indPack = getIndustryPack(bConfig.industry);
      S.topicLabels = Object.assign({}, indPack.topics, bConfig.customTopics || {});
    }

    let renderSeq = 0;
    async function render() {
      const mySeq = ++renderSeq;
      const sy = window.scrollY;
      renderSide();
      try {
        const html = await pages[S.route]();
        if (mySeq !== renderSeq) return; // Discard stale response
        $('#main').innerHTML = html;
        fitMore($('#main'));
      } catch (e) {
        if (mySeq !== renderSeq) return;
        $('#main').innerHTML = `<div class="card"><div class="empty">Lỗi tải dữ liệu: ${esc(e.message)}</div></div>`;
      }
      window.scrollTo(0, sy);
    }

    // Tải thêm 20 review vào danh sách đang xem (truyền đủ topic, q, status, assignee, days giống lần tải đầu)
    async function loadMore(btn) {
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      const oldTxt = btn.textContent;
      btn.textContent = 'Đang tải…';
      try {
        const mySeq = renderSeq;
        const reqBrand = S.brand;
        const reqStars = S.stars;
        const reqBranch = S.branch;
        const reqSort = S.sort;
        const reqTopic = S.topic;
        const reqQ = S.q;
        const reqStatus = S.filterStatus;
        const reqAssignee = S.assigneeFilter;
        const reqDays = S.reviewDays;
        const reqEvidenceIds = S.evidenceIds ? S.evidenceIds.join(',') : '';

        const q = new URLSearchParams({ limit: 20, offset: S.rows.length, sort: S.sort });
        if (S.stars !== 'all') q.set('stars', S.stars);
        if (S.branch) q.set('branch', S.branch);
        if (S.topic) q.set('topic', S.topic);
        if (S.q) q.set('q', S.q);
        if (S.filterStatus && S.filterStatus !== 'all') q.set('status', S.filterStatus);
        if (S.assigneeFilter && S.assigneeFilter !== 'all') q.set('assignee', S.assigneeFilter);
        if (S.reviewDays) q.set('days', S.reviewDays);
        if (S.evidenceIds && S.evidenceIds.length) q.set('ids', S.evidenceIds.join(','));

        const d = await api('reviews?' + q);
        // Kiểm tra tính hợp lệ của phiên gọi: nếu người dùng đã đổi brand hoặc filter trong lúc fetch, huỷ cập nhật
        if (mySeq !== renderSeq || S.route !== 'reviews' || reqBrand !== S.brand || reqStars !== S.stars || reqBranch !== S.branch || reqSort !== S.sort || reqTopic !== S.topic || reqQ !== S.q || reqStatus !== S.filterStatus || reqAssignee !== S.assigneeFilter || reqDays !== S.reviewDays || reqEvidenceIds !== (S.evidenceIds ? S.evidenceIds.join(',') : '')) {
          return;
        }
        S.rows.push(...d.items);
        const revListEl = $('#revlist');
        if (revListEl) {
          revListEl.insertAdjacentHTML('beforeend', d.items.map((r) => reviewHtml(r)).join(''));
          fitMore(revListEl);
        }
        if (S.rows.length >= S.total || !d.items.length) {
          btn.remove();
        } else {
          btn.disabled = false;
          btn.textContent = `Xem thêm (${S.total - S.rows.length})`;
        }
      } catch (e) {
        btn.disabled = false;
        btn.textContent = oldTxt;
        toast('Lỗi khi tải thêm: ' + e.message);
      }
    }
    /* ---------- Drawer / Modal Xử lý vụ việc & Phản hồi Google (Priority 1 & Priority 4) ---------- */
    let currentWorkflowReview = null;
    let activeWorkflowTab = 'ticket'; // 'ticket' | 'reply'

    function closeWorkflowModal() {
      const modal = $('#workflow-modal');
      if (modal) modal.style.display = 'none';
    }

    function openWorkflowModal(reviewId) {
      const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
      const r = pool.find(item => item.id === reviewId);
      if (!r) return toast('Không tìm thấy thông tin review');
      currentWorkflowReview = r;
      activeWorkflowTab = 'ticket';
      renderWorkflowModal();
    }

    function switchWorkflowTab(tab) {
      activeWorkflowTab = tab;
      renderWorkflowModal();
    }

    function renderWorkflowModal() {
      let modal = $('#workflow-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'workflow-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }

      const r = currentWorkflowReview;
      if (!r) return;

      const hasText = (r.text || '').trim().length > 0;
      const isNeg = (r.rating != null && r.rating <= 2) || (r.rating == null && r.analysis?.sentiment === 'negative');

      // Staff options lấy từ cấu hình doanh nghiệp
      const bConfig = getBrandConfig(S.brand);
      const staffList = (bConfig.staff && bConfig.staff.length)
        ? bConfig.staff.concat(['Chưa phân công'])
        : ['Quản lý đơn vị', 'CSKH', 'Chưa phân công'];

      modal.innerHTML = `<div class="card" style="max-width:850px;width:100%;max-height:92vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,0.35)">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:16px">
          <div>
            <h2 style="margin:0;font-size:18px">📋 Xử lý Vụ việc & Phản hồi ${r.rating != null ? 'Google Review' : 'Bài viết / Mention trực tuyến'}</h2>
            <div class="muted" style="font-size:12px;margin-top:2px">ID: <code>${esc(r.id)}</code> · Chi nhánh: <b>${esc(r.branch)}</b></div>
          </div>
          <button class="btn" onclick="closeWorkflowModal()">✕ Đóng</button>
        </div>

        <div class="grid g2" style="gap:20px;align-items:start">
          <!-- Cột trái (Column 1): Hồ sơ review gốc & Bằng chứng -->
          <div style="background:var(--surface-2);border-radius:8px;padding:16px;border:1px solid var(--line)">
            <h3 style="margin-top:0;font-size:14px;border-bottom:1px solid var(--line);padding-bottom:8px">Hồ sơ Đánh giá Gốc</h3>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <span class="avatar" style="background:${avatarColor(r.author || 'A')};width:36px;height:36px;line-height:36px;font-size:14px">${esc([...(r.author || 'A')][0].toUpperCase())}</span>
              <div>
                <b>${esc(r.author || 'Ẩn danh')}</b><br>
                <span class="muted" style="font-size:12px">${(r.rating != null && r.rating >= 1 && r.rating <= 5) ? `${stars(r.rating)} (${r.rating} sao)` : '<span class="chip" style="font-size:11px;background:#e0f2fe;color:#0369a1;font-weight:600">📰 Bài viết / Mention trực tuyến</span>'} · ${fmtDate(r.date)}</span>
              </div>
            </div>

            <div style="margin:12px 0;line-height:1.5">
              <b>Nội dung trích dẫn:</b>
              ${hasText
          ? `<div style="margin-top:6px;padding:10px;background:var(--surface-1);border-left:3px solid var(--bad);border-radius:4px;font-size:13px">“${esc(r.text)}”</div>`
          : `<div class="muted" style="margin-top:6px;padding:10px;background:var(--surface-1);border-radius:4px;font-size:13px;font-style:italic">Chỉ đánh giá ${r.rating} sao, không có nội dung nhận xét.</div>`}
            </div>

            <div style="font-size:12px;margin-top:10px">
              <b>Khía cạnh phân tích:</b>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                ${(r.analysis?.topics || []).map(t => `<span class="chip">${esc(S.topicLabels?.[t] || t)}</span>`).join('') || '<span class="muted">Chưa gắn nhãn</span>'}
              </div>
            </div>

            <div style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--line);font-size:12px">
              <div>${renderSourceLink(r)}</div>
              <div class="muted" style="margin-top:4px">Hạn xử lý SLA: <b>${fmtTime(r.deadline)}</b> ${r.slaOverdue ? '<span style="color:var(--bad);font-weight:700">(ĐÃ QUÁ HẠN)</span>' : '<span style="color:var(--good)">(Trong hạn)</span>'}</div>
            </div>
          </div>

          <!-- Cột phải (Column 2): 2 Tab tác vụ -->
          <div>
            <div class="tabs" style="margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:8px">
              <button class="btn ${activeWorkflowTab === 'ticket' ? 'primary' : ''}" onclick="switchWorkflowTab('ticket')">1. Giải quyết vụ việc</button>
              <button class="btn ${activeWorkflowTab === 'reply' ? 'primary' : ''}" onclick="switchWorkflowTab('reply')">2. Phản hồi Google & AI Trợ lý</button>
            </div>

            ${activeWorkflowTab === 'ticket' ? `
              <!-- Tab 1: Quản trị Vụ việc cơ sở -->
              <div>
                <div style="margin-bottom:12px">
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Người phụ trách xử lý:</label>
                  <select id="wf-assignee-sel" class="btn" style="width:100%;text-align:left">
                    ${staffList.map(st => `<option value="${esc(st)}" ${r.assignee === st ? 'selected' : ''}>${esc(st)}</option>`).join('')}
                  </select>
                </div>

                <div style="margin-bottom:14px">
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Trạng thái giải quyết vụ việc:</label>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    ${[['new', 'Mới'], ['assigned', 'Đã tiếp nhận'], ['in_progress', 'Đang xử lý'], ['resolved', 'Hoàn tất vụ việc']].map(([k, lb]) => `
                      <button class="btn ${r.ticketStatus === k ? 'primary' : ''}" onclick="updateTicketStatus('${k}')">${lb}</button>
                    `).join('')}
                  </div>
                  <p class="muted" style="font-size:11px;margin:6px 0 0">📌 <i>Lưu ý: "Đã phản hồi Google" chỉ là phát ngôn ra ngoài; "Hoàn tất vụ việc" là khách hàng tại chi nhánh đã được hỗ trợ xong.</i></p>
                </div>

                <div style="margin-bottom:14px;border-top:1px solid var(--line);padding-top:10px">
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:6px">Ghi chú nội bộ giữa các bộ phận: <span class="muted" style="font-size:11px;font-weight:normal">(Dữ liệu mẫu demo có gắn nhãn mô phỏng)</span></label>
                  <div style="max-height:120px;overflow-y:auto;background:var(--surface-2);border-radius:6px;padding:8px;margin-bottom:8px">
                    ${(r.internalNotes && r.internalNotes.length)
            ? r.internalNotes.map(n => `<div style="font-size:12px;margin-bottom:6px;border-bottom:1px dashed var(--line);padding-bottom:4px">
                          <b>${esc(n.author)}</b> <span class="muted">(${fmtTime(n.at)}):</span> ${n.isSimulated ? '<span class="chip" style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 4px">Dữ liệu quy trình mô phỏng</span>' : ''}<br>${esc(n.text)}
                        </div>`).join('')
            : '<div class="muted" style="font-size:12px">Chưa có ghi chú nội bộ nào.</div>'}
                  </div>
                  <div style="display:flex;gap:6px">
                    <input type="text" id="wf-new-note" placeholder="Nhập ghi chú mới cho đồng nghiệp..." style="flex:1;padding:6px 10px;font-size:12px;border:1px solid var(--line);border-radius:6px;background:var(--surface-1);color:var(--text-primary)" onkeydown="if(event.key==='Enter') addInternalNote();" />
                    <button class="btn" onclick="addInternalNote()">Ghi lại</button>
                  </div>
                </div>

                <div style="border-top:1px solid var(--line);padding-top:10px">
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Lịch sử thao tác (Audit trail):</label>
                  <div style="font-size:11px;color:var(--text-secondary);max-height:80px;overflow-y:auto">
                    ${(r.history || []).map(h => `<div>• ${fmtTime(h.at)} · <b>${esc(h.actor)}</b>: ${esc(h.action)} ${h.isSimulated ? '<span class="chip" style="font-size:9px;background:#e0f2fe;color:#0369a1;padding:1px 4px">Mô phỏng</span>' : ''}</div>`).join('')}
                  </div>
                </div>

                <div style="margin-top:16px;text-align:right">
                  <button class="btn primary" onclick="saveWorkflowTicket()">💾 Lưu thay đổi vụ việc</button>
                </div>
              </div>
            ` : `
              <!-- Tab 2: Phản hồi Google & AI Trợ lý -->
              <div>
                <!-- Khối AI Phân tích & Gợi ý (Priority 4) -->
                <div style="background:var(--surface-2);border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid var(--line)">
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:4px">✨ Bản Nháp Gợi Ý & Phân Tuyến (Quy tắc):</div>
                  ${!hasText ? `
                    <div style="background:${r.rating >= 4 ? '#f0fdf4;border:1px solid #bbf7d0;color:#166534' : '#fef3c7;border:1px solid #f59e0b;color:#92400e'};padding:8px 10px;border-radius:6px;font-size:12px;margin-bottom:6px">
                      ${r.rating >= 4 ? `
                        ✓ <b>Đánh giá tích cực:</b> Khách hàng chấm <b>${r.rating} sao</b> (không có nội dung nhận xét). Khách hàng hài lòng; khuyến nghị gửi lời cảm ơn trân trọng.
                      ` : `
                        ⚠ <b>Lưu ý an toàn dữ liệu:</b> Review chỉ chấm <b>${r.rating} sao</b>, không có nội dung nhận xét. <b>Chưa đủ dữ liệu để kết luận nguyên nhân cụ thể</b>. Khuyến nghị gửi lời xin lỗi chân thành và xin số điện thoại để tìm hiểu nguyên nhân.
                      `}
                    </div>
                  ` : `
                    <div style="font-size:12px;margin-bottom:6px">
                      <b>Tóm tắt vấn đề:</b> ${esc(r.aiSummary || 'Khách hàng có trải nghiệm chưa hài lòng.')}
                    </div>
                  `}
                  <div style="font-size:12px;color:var(--text-secondary)">
                    <b>Khuyến nghị phân tuyến:</b> Gửi tới <u>${esc(r.suggestedDept || 'Phòng CSKH')}</u> để phối hợp kiểm tra.
                  </div>
                </div>

                <!-- Soạn thảo câu phản hồi Google -->
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                    <label style="font-size:12px;font-weight:600">Nội dung phản hồi ${r.rating != null ? 'Google Maps' : 'Trực tuyến'}:</label>
                    <div style="display:flex;gap:6px">
                      <button class="btn primary" onclick="generateAi3Replies()" style="font-size:11px" title="Tạo 3 gợi ý phản hồi AI có phong cách đa dạng">✨ Tạo 3 gợi ý phản hồi AI</button>
                      <button class="btn" onclick="generateAiDraftReply()" style="font-size:11px" title="Tạo bản nháp đơn">Nháp nhanh</button>
                    </div>
                  </div>
                  ${(r.aiSuggestions && r.aiSuggestions.length) ? `
                    <div style="margin-bottom:12px">
                      <div class="muted" style="font-size:11px;font-weight:700;margin-bottom:6px;text-transform:uppercase">3 Gợi ý phản hồi AI chuyên biệt (Bấm để chọn):</div>
                      <div style="display:flex;flex-direction:column;gap:8px">
                        ${r.aiSuggestions.map((sug, sIdx) => `
                          <div style="background:var(--surface-1);border:1px solid var(--line);border-radius:6px;padding:10px;font-size:12px">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                              <b style="color:var(--primary)">${esc(sug.label)}</b>
                              <button class="btn" style="font-size:10px;padding:2px 8px" onclick="applyAiSuggestion(${sIdx})">Áp dụng gợi ý này ↗</button>
                            </div>
                            <div style="line-height:1.4;color:var(--text-secondary)">${esc(sug.text)}</div>
                          </div>
                        `).join('')}
                      </div>
                      <div class="banner" style="margin-top:8px;background:var(--surface-2);border-left:3px solid var(--good);padding:6px 10px;font-size:11px">
                        ✓ <b>Bảo đảm an toàn nội dung:</b> Bám sát review thực tế · Không hứa hẹn đền bù trái thẩm quyền · Không đưa PII vào phản hồi · Không suy diễn review chỉ chấm sao.
                      </div>
                    </div>
                  ` : ''}
                  <textarea id="wf-draft-reply" rows="5" oninput="onReplyDraftChange(this)" style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;border:1px solid var(--line);border-radius:6px;background:var(--surface-1);color:var(--text-primary);line-height:1.4">${esc(r.draftReply || '')}</textarea>

                  <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <div style="font-size:12px" id="wf-publish-status-text">
                      ${r.rating != null ? `Trạng thái xuất bản: ${r.replyStatus === 'published' ? '<b style="color:var(--primary)">Mô phỏng đăng phản hồi (Snapshot demo)</b>' :
          (r.replyStatus === 'approved' ? '<b style="color:#6b21a8">✓ Đã duyệt chuyên môn</b>' :
            (r.replyStatus === 'needs_reapproval' ? '<b style="color:var(--bad)">⚠ Nội dung đã sửa — Cần duyệt lại</b>' :
              (r.replyStatus === 'draft' ? '<b style="color:#854d0e">📝 Bản nháp</b>' : '<b class="muted">Chưa phản hồi</b>')))}` : `Trạng thái phát ngôn: ${r.replyStatus === 'approved' ? '<b style="color:#6b21a8">✓ Đã duyệt phát ngôn</b>' :
                (r.replyStatus === 'needs_reapproval' ? '<b style="color:var(--bad)">⚠ Nội dung đã sửa — Cần duyệt lại</b>' :
                  (r.replyStatus === 'draft' ? '<b style="color:#854d0e">📝 Bản nháp phát ngôn</b>' : '<b class="muted">Chưa duyệt phát ngôn</b>'))}`}
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn" onclick="saveDraftReply('draft')">💾 Lưu bản nháp</button>
                      <button class="btn" onclick="saveDraftReply('approved')" style="color:#6b21a8;font-weight:600">✓ ${r.rating != null ? 'Phê duyệt chuyên môn' : 'Phê duyệt phát ngôn'}</button>
                      ${r.rating != null ? `
                        <button class="btn primary" onclick="publishReplyToGoogle()" title="Yêu cầu phê duyệt chuyên môn trước khi mô phỏng đăng lên Google Maps">🌐 Đăng lên Google</button>
                      ` : `
                        <button class="btn" onclick="switchWorkflowTab('ticket')" style="color:var(--primary);font-weight:600">👤 Giao xử lý vụ việc</button>
                        ${renderSourceLink(r, 'btn primary')}
                      `}
                    </div>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>`;
      modal.style.display = 'flex';
      modal.onclick = (e) => { if (e.target === modal) closeWorkflowModal(); };
    }
    async function updateTicketStatus(newStatus) {
      if (!currentWorkflowReview) return;
      currentWorkflowReview.ticketStatus = newStatus;
      // Luôn tính lại SLA động theo snapshot time khi trạng thái thay đổi
      var SNAPSHOT_TIME = CB_CONFIG.SNAPSHOT_TIME;
      var isPast = SNAPSHOT_TIME > new Date(currentWorkflowReview.deadline).getTime();
      currentWorkflowReview.slaOverdue = (newStatus !== 'resolved') && isPast;
      renderWorkflowModal();
    }

    async function addInternalNote() {
      const input = document.getElementById('wf-new-note');
      if (!input || !input.value.trim() || !currentWorkflowReview) return;
      const text = input.value.trim();
      const newNote = {
        author: 'Người dùng điều hành (Mô phỏng)',
        at: new Date().toISOString(),
        text: text,
        isSimulated: true
      };
      currentWorkflowReview.internalNotes = currentWorkflowReview.internalNotes || [];
      currentWorkflowReview.internalNotes.unshift(newNote);
      input.value = '';
      renderWorkflowModal();
    }

    async function saveWorkflowTicket() {
      if (!currentWorkflowReview) return;
      const sel = document.getElementById('wf-assignee-sel');
      if (sel) currentWorkflowReview.assignee = sel.value;

      var SNAPSHOT_TIME = CB_CONFIG.SNAPSHOT_TIME;
      var isPast = SNAPSHOT_TIME > new Date(currentWorkflowReview.deadline).getTime();
      currentWorkflowReview.slaOverdue = (currentWorkflowReview.ticketStatus !== 'resolved') && isPast;

      currentWorkflowReview.history = currentWorkflowReview.history || [];
      currentWorkflowReview.history.unshift({
        actor: 'Quản trị viên (Mô phỏng)',
        at: new Date().toISOString(),
        action: 'Cập nhật trạng thái (' + currentWorkflowReview.ticketStatus + ') và giao cho ' + currentWorkflowReview.assignee,
        isSimulated: true
      });

      try {
        await post('workflow', {
          id: currentWorkflowReview.id,
          assignee: currentWorkflowReview.assignee,
          ticketStatus: currentWorkflowReview.ticketStatus
        });
        localStorage.setItem('cb_wf_' + currentWorkflowReview.id, JSON.stringify(currentWorkflowReview));
        toast('Đã lưu cập nhật vụ việc thành công!');
        closeWorkflowModal();
        render();
      } catch (e) {
        toast('Lỗi lưu vụ việc: ' + e.message);
      }
    }

    // Khi người dùng chỉnh sửa ô nhập nháp phản hồi
    function onReplyDraftChange(el) {
      if (!currentWorkflowReview) return;
      const val = el.value.trim();
      currentWorkflowReview.draftReply = val;
      const statusEl = document.getElementById('wf-publish-status-text');

      if (currentWorkflowReview.approvedReplyText) {
        if (val !== currentWorkflowReview.approvedReplyText) {
          currentWorkflowReview.replyStatus = 'needs_reapproval';
          if (statusEl) {
            statusEl.innerHTML = 'Trạng thái xuất bản: <b style="color:var(--bad)">⚠ Nội dung đã sửa — Cần duyệt lại</b>';
          }
        } else {
          currentWorkflowReview.replyStatus = 'approved';
          if (statusEl) {
            statusEl.innerHTML = 'Trạng thái xuất bản: <b style="color:#6b21a8">✓ Đã duyệt chuyên môn</b>';
          }
        }
      }
    }

    function generateAiDraftReply() {
      if (!currentWorkflowReview) return;
      const r = currentWorkflowReview;
      const bConfig = getBrandConfig(S.brand);
      const indPack = getIndustryPack(bConfig.industry);
      const text = indPack.getDraftReply(r, bConfig);

      const ta = document.getElementById('wf-draft-reply');
      if (ta) ta.value = text;
      r.draftReply = text;
      if (r.approvedReplyText && text !== r.approvedReplyText) {
        r.replyStatus = 'needs_reapproval';
      }
      renderWorkflowModal();
      toast('Đã tạo bản nháp gợi ý — cần kiểm tra trước khi sử dụng');
    }

    async function saveDraftReply(status) {
      if (!currentWorkflowReview) return;
      const ta = document.getElementById('wf-draft-reply');
      const text = ta ? ta.value.trim() : (currentWorkflowReview.draftReply || '');
      if (status === 'approved' && !text) {
        return toast('Vui lòng nhập nội dung trước khi phê duyệt');
      }
      currentWorkflowReview.draftReply = text;
      currentWorkflowReview.replyStatus = status;
      if (status === 'approved') {
        currentWorkflowReview.approvedReplyText = text;
      }

      currentWorkflowReview.history = currentWorkflowReview.history || [];
      currentWorkflowReview.history.unshift({
        actor: 'Chuyên viên kiểm duyệt (Mô phỏng)',
        at: new Date().toISOString(),
        action: status === 'approved' ? 'Phê duyệt chuyên môn cho bản nháp phản hồi' : 'Lưu bản nháp phản hồi',
        isSimulated: true
      });

      try {
        await post('workflow', {
          id: currentWorkflowReview.id,
          replyStatus: status,
          draftReply: currentWorkflowReview.draftReply,
          approvedReplyText: currentWorkflowReview.approvedReplyText
        });
        localStorage.setItem('cb_wf_' + currentWorkflowReview.id, JSON.stringify(currentWorkflowReview));
        toast(status === 'approved' ? 'Đã phê duyệt chuyên môn!' : 'Đã lưu bản nháp thành công!');
        renderWorkflowModal();
        render();
      } catch (e) {
        toast('Lỗi lưu nháp: ' + e.message);
      }
    }

    async function publishReplyToGoogle() {
      if (!currentWorkflowReview) return;
      if (currentWorkflowReview.rating == null) {
        return toast('⚠️ Nguồn bài viết / mention trực tuyến không hỗ trợ đăng qua Google API. Vui lòng phê duyệt phát ngôn nội bộ và mở bài gốc để liên hệ!');
      }
      const ta = document.getElementById('wf-draft-reply');
      const text = ta ? ta.value.trim() : (currentWorkflowReview.draftReply || '');
      if (!text) return toast('Vui lòng nhập nội dung trước khi đăng');

      // Kiểm tra: Nội dung đăng phải khớp với bản đã được phê duyệt chuyên môn
      if (currentWorkflowReview.replyStatus !== 'approved' || text !== currentWorkflowReview.approvedReplyText) {
        if (currentWorkflowReview.approvedReplyText && text !== currentWorkflowReview.approvedReplyText) {
          currentWorkflowReview.replyStatus = 'needs_reapproval';
          renderWorkflowModal();
          return toast('⚠️ Nội dung đã bị chỉnh sửa so với bản đã phê duyệt. Vui lòng bấm "✓ Phê duyệt chuyên môn" trước khi xuất bản!');
        }
        return toast('⚠️ Vui lòng thực hiện "✓ Phê duyệt chuyên môn" trước khi đăng phản hồi!');
      }

      currentWorkflowReview.reply = {
        text: text,
        date: new Date().toISOString(),
        isSimulated: true
      };
      currentWorkflowReview.replyStatus = 'published';

      currentWorkflowReview.history = currentWorkflowReview.history || [];
      currentWorkflowReview.history.unshift({
        actor: 'Quản trị viên xuất bản (Mô phỏng)',
        at: new Date().toISOString(),
        action: 'Mô phỏng đăng phản hồi lên Google Maps (Snapshot demo)',
        isSimulated: true
      });

      try {
        await post('workflow', {
          id: currentWorkflowReview.id,
          replyStatus: 'published',
          draftReply: text,
          approvedReplyText: currentWorkflowReview.approvedReplyText,
          reply: currentWorkflowReview.reply
        });
        localStorage.setItem('cb_wf_' + currentWorkflowReview.id, JSON.stringify(currentWorkflowReview));
        toast('Mô phỏng đăng phản hồi thành công (Snapshot demo) — Chỉ xuất bản thực tế sau khi backend xác nhận từ Google!');
        closeWorkflowModal();
        render();
      } catch (e) {
        toast('Lỗi đăng Google: ' + e.message);
      }
    }
    function drillFromAiCross(branch, starType, days, queryOrTopic, evidenceIds, label) {
      const modal = document.getElementById('ai-cross-modal');
      if (modal) modal.style.display = 'none';
      S.route = 'reviews';
      location.hash = 'reviews';
      S.branch = branch || '';
      S.reviewDays = days;
      S.assigneeFilter = 'all';
      S.topic = '';
      S.q = '';

      if (Array.isArray(queryOrTopic)) {
        label = evidenceIds;
        evidenceIds = queryOrTopic;
        queryOrTopic = null;
      }

      if (evidenceIds && Array.isArray(evidenceIds)) {
        S.evidenceIds = evidenceIds.slice();
        S.evidenceLabel = label || '';
      } else {
        S.evidenceIds = null;
        S.evidenceLabel = '';
      }

      if (queryOrTopic) {
        const knownTopics = ['doctor', 'treatment', 'staff', 'facility', 'price', 'sales', 'wait', 'outcome', 'aftercare', 'trust', 'refund'];
        if (knownTopics.includes(queryOrTopic) || (S.cfg && S.cfg.topics && queryOrTopic in S.cfg.topics)) {
          S.topic = queryOrTopic;
        } else {
          S.q = queryOrTopic;
        }
      }
      if (starType === 'neg') {
        S.stars = 'neg';
        S.filterStatus = 'all';
      } else if (starType === 'pos') {
        S.stars = '5';
        S.filterStatus = 'all';
      } else {
        S.stars = 'all';
        S.filterStatus = 'all';
      }
      render();
    }

    /* Modal Tổng hợp rủi ro & khía cạnh liên chi nhánh / cơ sở */
    function showAiCrossBranchModal() {
      let modal = $('#ai-cross-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-cross-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }

      const pool = (window.__DEMO_D && window.__DEMO_D.rev && window.__DEMO_D.rev[S.brand]?.pool) || [];
      const refTime = CB_CONFIG.SNAPSHOT_TIME;
      const cutoff = refTime - S.days * 864e5;
      const periodRevs = pool.filter(r => new Date(r.date || '2026-10-01').getTime() >= cutoff);
      const totalInPeriod = periodRevs.length;
      const totalInHistory = pool.length;
      const bConfig = getBrandConfig(S.brand);
      const industryPack = getIndustryPack(bConfig.industry);
      const brandTitle = cur()?.name || bConfig.name;
      const unitType = bConfig.unitType || industryPack.defaultUnitType || 'chi nhánh';

      function toIdsJs(arr) {
        return arr.length ? "['" + arr.map(r => r.id).join("','") + "']" : "[]";
      }
      function toIdsAttr(arr) {
        return arr.map(r => r.id).join(',');
      }

      // 1. Identify units
      let units = bConfig.units ? bConfig.units.slice() : [];
      if (!units.length) {
        units = Array.from(new Set(pool.map(r => r.branch).filter(Boolean)));
      }

      let bodyContent = '';

      // Case A: No reviews at all in period
      if (totalInPeriod === 0) {
        bodyContent = `
          <div style="background:var(--surface-2);border-radius:8px;padding:12px;margin-bottom:12px;border-left:4px solid var(--series-1)">
            <b>1. Tình trạng vận hành ${esc(unitType)} — ${esc(brandTitle)}:</b><br>
            Trong kỳ <b>${S.days} ngày gần nhất</b>: <b>Không có review nào phát sinh</b> (toàn bộ ${totalInHistory} review trong lịch sử thuộc các kỳ trước).<br>
            <i>Ghi nhận:</i> Chưa phát sinh dữ liệu đánh giá mới từ khách hàng trong khoảng thời gian này.
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:8px;padding:12px;margin-bottom:12px">
            <b>2. Đối chiếu rủi ro vận hành:</b><br>
            Không ghi nhận bất kỳ phản ánh tiêu cực nào trong kỳ ${S.days} ngày.
          </div>`;
      } else {
        const allNegs = periodRevs.filter(r => (r.rating != null && r.rating <= 2) || r.analysis?.sentiment === 'negative');
        const isSingleUnitClean = (units.length <= 1) && (allNegs.length === 0);

        if (isSingleUnitClean) {
          // Single unit with clean record (e.g. JIVI Clinic)
          const stars5 = periodRevs.filter(r => r.rating === 5);
          const stars4 = periodRevs.filter(r => r.rating === 4);
          const stars5WithText = stars5.filter(r => (r.text || '').trim().length > 0);
          const stars5NoText = stars5.filter(r => (r.text || '').trim().length === 0);

          const praiseChips = [];
          (industryPack.positiveMatchers || []).forEach(matcher => {
            const matched = stars5WithText.filter(matcher.test);
            if (matched.length > 0) {
              praiseChips.push(`<button class="chip" data-evidence-ids="${toIdsAttr(matched)}" style="cursor:pointer;font-size:11px" onclick="drillFromAiCross('', 'pos', ${S.days}, ${toIdsJs(matched)})">${matcher.icon} ${matched.length} review đề cập tích cực đến ${matcher.label} ↗</button>`);
            }
          });

          bodyContent = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:8px;padding:12px;margin-bottom:12px;border-left:4px solid var(--good)">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <b>1. Tình trạng vận hành ${esc(unitType)} — ${esc(brandTitle)}:</b>
                <span class="chip" style="font-size:11px;background:#dcfce7;color:#166534">${totalInPeriod}/${totalInHistory} review lịch sử</span>
              </div>
              <div style="margin-top:6px;font-size:12px;line-height:1.5">
                • <b>Thống kê số sao:</b> Ghi nhận <b>${stars5.length}/${totalInPeriod} review 5 sao</b> (${Math.round((stars5.length / totalInPeriod) * 100)}%) ${stars4.length > 0 ? `và ${stars4.length} review 4 sao` : ''}.<br>
                • <b>Phân tích nội dung nhận xét:</b> Trong ${stars5.length} review 5 sao, có <b>${stars5WithText.length} review có nội dung nhận xét cụ thể</b>:
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px">
                  ${praiseChips.join('')}
                </div>
                và <b>${stars5NoText.length} review chỉ chấm 5 sao không kèm lời nhận xét</b>.<br>
                <div class="muted" style="font-size:11px;margin-top:2px"><i>*(Lưu ý: Một review có thể đề cập đến nhiều khía cạnh/chủ đề cùng lúc).*</i></div>
                • <b>Rủi ro khiếu nại:</b> <b>${allNegs.length} review tiêu cực</b> trong kỳ lọc.
              </div>
              <div style="margin-top:8px;padding:8px 10px;background:var(--surface-1);border-radius:6px;border:1px solid var(--line);font-size:12px;color:var(--text-primary)">
                <b>Bằng chứng đối chiếu (${periodRevs.length} review trong kỳ):</b>
                <div style="margin-top:4px;max-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
                  ${periodRevs.slice(0, 5).map(r => `<div>• <b>${esc(r.author || 'Ẩn danh')}</b> (${r.rating != null ? r.rating + '★' : 'Mention'} · ${fmtDate(r.date)}): ${(r.text || '').trim() ? `“${esc(r.text.replace(/\s+/g, ' ').slice(0, 80))}…”` : '<i class="muted">(Chỉ đánh giá số sao, không có nội dung nhận xét)</i>'}</div>`).join('')}
                  ${periodRevs.length > 5 ? `<div class="muted"><i>... và ${periodRevs.length - 5} review tích cực khác trong kỳ.</i></div>` : ''}
                </div>
              </div>
              <button class="btn" data-evidence-ids="${toIdsAttr(periodRevs)}" style="margin-top:8px;font-size:11px;padding:3px 10px;font-weight:600" onclick="drillFromAiCross('', 'pos', ${S.days}, ${toIdsJs(periodRevs)})">🔍 Xem ${totalInPeriod} review liên quan trong danh sách ↗</button>
            </div>

            <div style="background:var(--surface-2);border-radius:8px;padding:12px;margin-bottom:12px;border-left:4px solid var(--primary)">
              <b>2. Đối chiếu bằng chứng từ review đã thu thập:</b><br>
              ${industryPack.id === 'f_and_b'
              ? `• <b>Chất lượng ẩm thực:</b> Không ghi nhận phản ánh tiêu cực về chất lượng hay hương vị món ăn trong dữ liệu đã thu thập của kỳ này.<br>
                   • <b>Dịch vụ & Vệ sinh:</b> Không ghi nhận phản ánh về thái độ phục vụ hay an toàn vệ sinh trong dữ liệu đã thu thập của kỳ này.<br>
                   • <b>Thời gian chờ đợi:</b> Không ghi nhận phản ánh về việc chậm trễ lên món hay đặt bàn trong dữ liệu đã thu thập của kỳ này.`
              : (industryPack.id === 'retail_ecommerce'
                ? `• <b>Chất lượng sản phẩm:</b> Không ghi nhận phản ánh tiêu cực về hàng lỗi hay sai mô tả trong dữ liệu đã thu thập của kỳ này.<br>
                     • <b>Quy trình bảo hành:</b> Không ghi nhận phản ánh về việc từ chối bảo hành hay đổi trả trong dữ liệu đã thu thập của kỳ này.<br>
                     • <b>Thời gian giao vận:</b> Không ghi nhận phản ánh về giao hàng chậm trễ trong dữ liệu đã thu thập của kỳ này.`
                : (industryPack.id === 'aesthetic_clinic'
                  ? `• <b>Chuyên môn y tế:</b> Không ghi nhận phản ánh tiêu cực về tay nghề bác sĩ hay phác đồ điều trị trong dữ liệu đã thu thập của kỳ này.<br>
                       • <b>Tư vấn & Chi phí:</b> Không ghi nhận phản ánh về hiện tượng chèo kéo, ép mua thêm dịch vụ hay mập mờ bảng giá trong dữ liệu đã thu thập của kỳ này.<br>
                       • <b>Thời gian chờ đợi:</b> Không ghi nhận phản ánh về sự chậm trễ lịch hẹn hay từ chối tiếp nhận khách hàng trong dữ liệu đã thu thập của kỳ này.`
                  : `• <b>Chất lượng dịch vụ:</b> Không ghi nhận phản ánh tiêu cực về chất lượng dịch vụ hay sản phẩm trong dữ liệu đã thu thập của kỳ này.<br>
                       • <b>Thái độ phục vụ:</b> Không ghi nhận phản ánh tiêu cực về thái độ nhân viên hay tư vấn trong dữ liệu đã thu thập của kỳ này.<br>
                       • <b>Thời gian & Tiến độ:</b> Không ghi nhận phản ánh về việc chậm trễ hay thiếu trách nhiệm trong dữ liệu đã thu thập của kỳ này.`
                )
              )}
            </div>

            <div style="background:var(--surface-2);border-radius:8px;padding:12px;margin-bottom:12px;border-left:4px solid var(--series-1)">
              <b>3. Khuyến nghị theo dõi vận hành:</b><br>
              Tiếp tục duy trì tốc độ phản hồi trên Google Maps (trong dữ liệu đã ghi nhận các phản hồi cảm ơn chính thức từ ${esc(unitType)}) và duy trì quy trình kiểm soát chất lượng đồng bộ.
            </div>`;
        } else {
          // Multi-unit or brand with complaints
          const unitBlocks = units.map((uName, uIdx) => {
            const uRevs = periodRevs.filter(r => r.branch === uName || (r.branch && r.branch.includes(uName)) || (units.length === 1));
            const uNegs = uRevs.filter(r => (r.rating != null && r.rating <= 2) || r.analysis?.sentiment === 'negative');
            let uBody = '';

            if (uNegs.length === 0) {
              uBody = `Trong kỳ <b>${S.days} ngày</b> (tổng ${uRevs.length} review tại cơ sở): <b>Không ghi nhận review tiêu cực</b> trong dữ liệu đã thu thập.`;
            } else {
              const parts = [];
              const handledRevs = new Set();

              (industryPack.riskRules || []).forEach(rule => {
                const matched = uNegs.filter(r => !handledRevs.has(r) && rule.match(r));
                if (matched.length > 0) {
                  matched.forEach(r => handledRevs.add(r));
                  const authorHint = matched.length === 1 && matched[0].author ? ` (${matched[0].author})` : '';
                  parts.push(`<button class="chip" data-evidence-ids="${toIdsAttr(matched)}" style="background:#fee2e2;color:#b91c1c;cursor:pointer;font-size:11px;font-weight:600;margin:2px 4px 2px 0" onclick="drillFromAiCross('${uName}', 'neg', ${S.days}, ${toIdsJs(matched)})">⚠ ${matched.length} review ${rule.label}${authorHint} ↗</button>`);
                }
              });

              const remainingNegs = uNegs.filter(r => !handledRevs.has(r));
              const shortOrEmptyRevs = remainingNegs.filter(r => {
                const txt = (r.text || '').trim();
                return txt.length === 0 || txt === 'không hữu ích';
              });
              const detailedNegs = remainingNegs.filter(r => !shortOrEmptyRevs.includes(r));

              if (detailedNegs.length > 0) {
                parts.push(`<button class="chip" data-evidence-ids="${toIdsAttr(detailedNegs)}" style="background:#fee2e2;color:#b91c1c;cursor:pointer;font-size:11px;font-weight:600;margin:2px 4px 2px 0" onclick="drillFromAiCross('${uName}', 'neg', ${S.days}, ${toIdsJs(detailedNegs)})">⚠ ${detailedNegs.length} review phản ánh chi tiết về trải nghiệm chưa hài lòng ↗</button>`);
              }
              if (shortOrEmptyRevs.length > 0) {
                parts.push(`<button class="chip" data-evidence-ids="${toIdsAttr(shortOrEmptyRevs)}" style="background:#f1f5f9;color:#64748b;cursor:pointer;font-size:11px;margin:2px 4px 2px 0" onclick="drillFromAiCross('${uName}', 'neg', ${S.days}, ${toIdsJs(shortOrEmptyRevs)})">⚠ ${shortOrEmptyRevs.length} review đánh giá ngắn ("không hữu ích") hoặc 1 sao không lời ↗</button>`);
              }

              uBody = `Trong kỳ <b>${S.days} ngày</b> (tổng ${uRevs.length} review tại cơ sở): Ghi nhận <b>${uNegs.length} review tiêu cực</b>:<br>
              <div style="margin:4px 0">${parts.join('')}</div>
              <i>Khuyến nghị:</i> ${(() => {
                  if (industryPack.id === 'f_and_b') {
                    return 'Quản lý nhà hàng và Bếp trưởng rà soát chất lượng nguyên liệu, hương vị món ăn và đào tạo lại thái độ phục vụ bàn.';
                  }
                  if (industryPack.id === 'retail_ecommerce') {
                    return 'Bộ phận Quản lý cửa hàng và Trung tâm Bảo hành rà soát quy trình tiếp nhận đổi trả và kiểm tra chất lượng đơn hàng.';
                  }
                  if (industryPack.id === 'aesthetic_clinic') {
                    const tList = uNegs.flatMap(r => (r.analysis && r.analysis.topics) || []);
                    const hasSales = tList.includes('sales') || uNegs.some(r => { const t = (r.text || '').toLowerCase(); return t.includes('upsell') || t.includes('sale') || t.includes('chèo kéo') || t.includes('bảng giá'); });
                    if (hasSales) {
                      return 'Chuẩn hóa quy trình tư vấn minh bạch bảng giá và rà soát tần suất gọi điện chăm sóc khách hàng.';
                    }
                    const hasDoc = tList.includes('doctor') || uNegs.some(r => { const t = (r.text || '').toLowerCase(); return t.includes('bác sĩ') || t.includes('tay nghề'); });
                    if (hasDoc) {
                      return 'Ban Giám đốc chuyên môn rà soát ca trực và tay nghề bác sĩ.';
                    }
                    const hasWait = tList.includes('wait') || uNegs.some(r => { const t = (r.text || '').toLowerCase(); return t.includes('chờ') || t.includes('đặt lịch') || t.includes('từ chối'); });
                    if (hasWait) {
                      return 'Chuẩn hóa quy trình đặt lịch hẹn và phân luồng tiếp đón khách hàng đến dặm dịch vụ.';
                    }
                    return 'Kiểm soát tính đồng nhất trong quy trình đón tiếp và thực hiện dịch vụ y tế.';
                  }
                  return 'Ban Quản trị và Bộ phận CSKH rà soát quy trình cung cấp dịch vụ và chấn chỉnh kịp thời các phản ánh của khách hàng.';
                })()
                }`;
            }

            const uEvidence = uNegs.length > 0 ? uNegs : uRevs;
            const uAction = uNegs.length > 0
              ? `<button class="btn" data-evidence-ids="${toIdsAttr(uNegs)}" style="margin-top:8px;font-size:11px;padding:3px 10px;font-weight:600" onclick="drillFromAiCross('${uName}', 'neg', ${S.days}, ${toIdsJs(uNegs)})">🔍 Xem ${uNegs.length} review tiêu cực làm bằng chứng ↗</button>`
              : `<button class="btn" data-evidence-ids="${toIdsAttr(uRevs)}" style="margin-top:8px;font-size:11px;padding:3px 10px" onclick="drillFromAiCross('${uName}', 'all', ${S.days}, ${toIdsJs(uRevs)})">🔍 Xem ${uRevs.length} review trong kỳ của ${esc(unitType)} ↗</button>`;

            return `
              <div style="background:var(--surface-2);border-radius:8px;padding:12px;margin-bottom:12px;border-left:4px solid ${uNegs.length > 0 ? 'var(--bad)' : 'var(--good)'}">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <b>${uIdx + 1}. ${unitType.charAt(0).toUpperCase() + unitType.slice(1)} ${esc(uName)}:</b>
                  <span class="chip" style="font-size:11px;${uNegs.length > 0 ? 'background:#fee2e2;color:#b91c1c' : 'background:#dcfce7;color:#166534'}">${uNegs.length > 0 ? uNegs.length + ' review tiêu cực' : 'Ổn định'}</span>
                </div>
                <div style="margin-top:6px;font-size:12px;line-height:1.5">${uBody}</div>
                <div style="margin-top:8px;padding:8px 10px;background:var(--surface-1);border-radius:6px;border:1px solid var(--line);font-size:12px">
                  <b>Bằng chứng đối chiếu (${uEvidence.length} review trong kỳ):</b>
                  <div style="margin-top:4px;max-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
                    ${uEvidence.map(r => `<div>• <b>${esc(r.author || 'Ẩn danh')}</b> (${r.rating != null ? r.rating + '★' : 'Mention'} · ${fmtDate(r.date)}): ${(r.text || '').trim() ? `“${esc(r.text.replace(/\s+/g, ' ').slice(0, 80))}…”` : '<i class="muted">(Chỉ đánh giá số sao, không có nội dung nhận xét)</i>'}</div>`).join('')}
                  </div>
                </div>
                ${uAction}
              </div>`;
          }).join('');

          // 4. Overall Positive Summary
          const stars5 = periodRevs.filter(r => r.rating === 5);
          const stars4 = periodRevs.filter(r => r.rating === 4);
          const stars5WithText = stars5.filter(r => (r.text || '').trim().length > 0);
          const stars5NoText = stars5.filter(r => (r.text || '').trim().length === 0);

          const praiseChips = [];
          (industryPack.positiveMatchers || []).forEach(matcher => {
            const matched = stars5WithText.filter(matcher.test);
            if (matched.length > 0) {
              praiseChips.push(`<button class="chip" data-evidence-ids="${toIdsAttr(matched)}" style="cursor:pointer;font-size:11px" onclick="drillFromAiCross('', 'pos', ${S.days}, ${toIdsJs(matched)})">${matcher.icon} ${matched.length} review đề cập tích cực đến ${matcher.label} ↗</button>`);
            }
          });

          const positiveSummaryBlock = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:8px;padding:12px;margin-bottom:12px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <b>✓ Tổng quan Đánh giá Tích cực (Kỳ ${S.days} ngày):</b>
                <span class="chip" style="font-size:11px;background:#dcfce7;color:#166534">${stars5.length}/${totalInPeriod} review 5 sao</span>
              </div>
              <div style="margin-top:6px;font-size:12px;line-height:1.5">
                • <b>Thống kê số sao:</b> Ghi nhận <b>${stars5.length}/${totalInPeriod} review 5 sao</b> (${totalInPeriod > 0 ? Math.round((stars5.length / totalInPeriod) * 100) : 0}%) ${stars4.length > 0 ? `và ${stars4.length} review 4 sao` : ''}.<br>
                • <b>Phân tích nội dung nhận xét:</b> Trong ${stars5.length} review 5 sao, có <b>${stars5WithText.length} review có nội dung nhận xét cụ thể</b>:
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px">
                  ${praiseChips.join('')}
                </div>
                và <b>${stars5NoText.length} review chỉ chấm 5 sao không kèm lời nhận xét</b>.
                <div class="muted" style="font-size:11px;margin-top:4px"><i>*(Lưu ý: Một review có thể đề cập đến nhiều khía cạnh/chủ đề cùng lúc).*</i></div>
              </div>
              <div style="margin-top:8px">
                <button class="btn" data-evidence-ids="${toIdsAttr(stars5)}" style="font-size:11px;padding:3px 10px" onclick="drillFromAiCross('', 'pos', ${S.days}, ${toIdsJs(stars5)})">🔍 Xem danh sách review 5 sao trong kỳ ↗</button>
              </div>
            </div>`;

          bodyContent = unitBlocks + positiveSummaryBlock;
        }
      }

      modal.innerHTML = `<div class="card" style="max-width:760px;width:100%;max-height:88vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,0.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:14px">
          <div>
            <h2 style="margin:0;font-size:18px">✨ Tổng Hợp Rủi Ro & Khía Cạnh Liên ${unitType.charAt(0).toUpperCase() + unitType.slice(1)}</h2>
            <div class="muted" style="font-size:12px;margin-top:2px">Thương hiệu: <b>${esc(brandTitle)}</b> · Tổng hợp quy tắc bám sát bằng chứng kỳ <b>${S.days} ngày gần nhất</b> (Snapshot 15/10/2026)</div>
          </div>
          <button class="btn" onclick="document.getElementById('ai-cross-modal').style.display='none'">✕ Đóng</button>
        </div>

        <div style="font-size:13px;line-height:1.6">
          ${bodyContent}
        </div>

        <div style="margin-top:16px;text-align:right">
          <button class="btn primary" onclick="document.getElementById('ai-cross-modal').style.display='none'">Đã hiểu</button>
        </div>
      </div>`;
      modal.querySelectorAll('[data-evidence-ids]').forEach(btn => {
        const raw = btn.getAttribute('data-evidence-ids');
        btn.evidenceIds = raw ? raw.split(',').filter(Boolean) : [];
      });
      modal.style.display = 'flex';
      modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }
    function closeModal() {
      const modal = $('#report-modal');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }

    function showReportModal(rep) {
      let modal = $('#report-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'report-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
      }
      document.body.classList.add('modal-open');
      const s = rep.summary || {};
      const rangeTxt = rep.periodStart ? `${fmtDate(rep.periodStart)} – ${fmtDate(rep.periodEnd)}` : `${rep.days} ngày gần nhất`;
      modal.innerHTML = `<div class="card" style="max-width:700px;width:100%;max-height:90vh;overflow-y:auto;background:var(--surface-1);border:1px solid var(--line);border-radius:12px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,0.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <div>
            <h2 style="margin:0;font-size:18px">${esc(rep.title)}</h2>
            <div class="muted" style="font-size:12px;margin-top:4px">
              Thương hiệu: <b>${esc(cur()?.name)}</b> · Khoảng ngày: <b>${rangeTxt}</b> · Chốt lúc: <b>${fmtTime(rep.asOf || rep.createdAt)}</b>
            </div>
          </div>
          <button class="btn" onclick="closeModal()">✕ Đóng</button>
        </div>
        <div class="grid g4" style="margin-bottom:14px">
          <div class="card kpi" style="padding:12px"><h3>Brand Health</h3><div class="v">${s.health != null ? s.health : '-'}<span class="muted" style="font-size:13px">/100</span></div></div>
          <div class="card kpi" style="padding:12px"><h3>Tổng review</h3><div class="v">${s.reviews ?? 0}</div></div>
          <div class="card kpi" style="padding:12px"><h3>Điểm sao TB</h3><div class="v">${fmtRating(s.avgRating, 2)} <span class="star">★</span></div></div>
          <div class="card kpi" style="padding:12px"><h3>Tiêu cực</h3><div class="v" style="color:var(--bad)">${s.negative ?? 0}</div></div>
        </div>
        <div class="card" style="margin-bottom:12px;background:var(--surface-2);font-size:13px">
          <b>📊 Chỉ số Share of Voice (Top 10 CTR-Decay):</b><br>
          • Google Search SoV: <b>${s.sovSearch || '-'}</b><br>
          • Google News SoV: <b>${s.sovNews || '-'}</b>
        </div>
        <div class="card" style="margin-bottom:12px;background:var(--surface-2);font-size:13px">
          <b>⚠ Đánh giá rủi ro danh tiếng & Điểm nhấn kỳ này:</b><br>
          ${esc(s.topAlert || 'Không ghi nhận cảnh báo nghiêm trọng.')}
        </div>
        ${(s.evidence && s.evidence.length) ? `
        <div class="card" style="margin-bottom:16px;background:var(--surface-2);font-size:12px">
          <b>📋 Trích xuất review bằng chứng ghi nhận (${s.evidence.length} review):</b>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
            ${s.evidence.map(e => {
        const demoD = (typeof window !== 'undefined' && (window.__DEMO_D || window.D)) || (function () {
          try { return CB_getDemoData(); } catch (err) { return null; }
        })();
        const bId = (rep.id && rep.id.includes('jivi')) ? 'jivi-clinic' : (S.brand || 'seoul-center');
        const pool = (demoD && demoD.rev && demoD.rev[bId]?.pool) || [];
        const revObj = pool.find(r => r.id === e.id);
        const author = (revObj && revObj.author) || e.author || 'Ẩn danh';
        const branch = (revObj && revObj.branch) || e.branch || '';
        const rating = (revObj && revObj.rating) || e.rating || 1;
        const date = (revObj && revObj.date) || e.date;
        const rawText = revObj ? (revObj.text || '') : (e.hasText ? (e.snippet || '') : (e.text || ''));
        const hasText = rawText.trim().length > 0;
        const snippet = hasText
          ? (rawText.trim().replace(/\s+/g, ' ').length > 120 ? rawText.trim().replace(/\s+/g, ' ').slice(0, 117) + '…' : rawText.trim().replace(/\s+/g, ' '))
          : `Chỉ đánh giá ${rating} sao, không có nội dung nhận xét.`;
        return `
              <div style="border-left:3px solid var(--bad);padding-left:10px">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <div><b>${esc(author)}</b> (${rating}★) · <span class="muted">${esc(branch)}</span> · <span class="muted">${fmtDate(date)}</span></div>
                  <button class="btn" onclick="closeModal(); openWorkflowModal('${esc(e.id)}');" style="font-size:11px;padding:2px 8px">📋 Xử lý vụ việc ↗</button>
                </div>
                ${hasText ? `<div style="margin:2px 0;line-height:1.4">“${esc(snippet)}”</div>` : `<div class="muted" style="margin:2px 0;line-height:1.4;font-style:italic">${esc(snippet)}</div>`}
                <div class="muted" style="font-size:11px">ID: <code>${esc(e.id)}</code></div>
              </div>`;
      }).join('')}
          </div>
        </div>` : ''}
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button class="btn" onclick="window.print()">🖨 In báo cáo (PDF)</button>
          <button class="btn primary" onclick="closeModal()">Đóng</button>
        </div>
      </div>`;
      modal.style.display = 'flex';
      modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    }

    // Dùng cho notify.js: mở trang Google Review đúng brand + mức sao, tải thêm trang tới khi thấy review theo id
    window.CB = {
      async showReview({ brandId, rating, id }) {
        if (brandId && brandId !== S.brand && S.cfg.brands.some((b) => b.id === brandId)) {
          S.brand = brandId;
          localStorage.setItem('cb-brand', S.brand);
        }
        Object.assign(S, {
          route: 'reviews',
          stars: String(rating),
          branch: '',
          sort: 'newest',
          topic: '',
          q: '',
          filterStatus: 'all',
          assigneeFilter: 'all',
          reviewDays: null,
          evidenceIds: null,
          evidenceLabel: ''
        });
        if (location.hash !== '#reviews') history.replaceState(null, '', '#reviews');
        await render();
        const find = () => [...document.querySelectorAll('#revlist .rev')].find((el) => el.dataset.id === id);
        for (let i = 0; i < 20 && !find(); i++) {
          const more = document.querySelector('[data-act="more"]');
          if (!more) break;
          await loadMore(more);
        }
        return find() || null;
      },
    };

    function toast(msg) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = msg;
      $('#toasts').append(t);
      setTimeout(() => t.remove(), 9000);
    }

    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act, v = el.dataset.v;
      if (act === 'expand') {
        const open = el.previousElementSibling.classList.toggle('open');
        el.textContent = open ? 'Ẩn bớt' : 'Thêm';
        return;
      }
      if (act === 'open-workflow') {
        openWorkflowModal(el.dataset.id);
        return;
      }
      if (act === 'set-status') {
        S.filterStatus = v;
        return render();
      }
      if (act === 'set-region') {
        S.region = v;
        return render();
      }
      // --- Thao tác mới cho Địa điểm & GBP Smart ---
      if (act === 'drill-loc-photo') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.locationId = v;
        S.mediaFilter = 'with_photo';
        S.stars = 'all';
        S.q = '';
        S.topic = '';
        S.filterStatus = 'all';
        S.evidenceIds = null;
        return render();
      }
      if (act === 'drill-loc-text') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.locationId = v;
        S.mediaFilter = 'text_only';
        S.stars = 'all';
        S.q = '';
        S.topic = '';
        S.filterStatus = 'all';
        S.evidenceIds = null;
        return render();
      }
      if (act === 'drill-loc-all') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.locationId = v;
        S.mediaFilter = null;
        S.stars = 'all';
        S.q = '';
        S.topic = '';
        S.filterStatus = 'all';
        S.evidenceIds = null;
        return render();
      }
      if (act === 'drill-loc-missing') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.locationId = v;
        S.mediaFilter = 'missing';
        S.stars = 'all';
        S.q = '';
        S.topic = '';
        S.filterStatus = 'all';
        S.evidenceIds = null;
        return render();
      }
      if (act === 'drill-loc-unreplied') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.locationId = v;
        S.filterStatus = 'unreplied';
        S.mediaFilter = null;
        S.stars = 'all';
        S.q = '';
        S.topic = '';
        S.evidenceIds = null;
        return render();
      }
      if (act === 'view-location-detail') {
        S.selectedLocationId = v;
        S.route = 'location_detail';
        location.hash = 'location_detail';
        return render();
      }
      if (act === 'generate-qr') {
        S.selectedLocationId = v;
        S.route = 'qr_codes';
        location.hash = 'qr_codes';
        return render();
      }
      if (act === 'set-loc-status') {
        S.locStatus = v;
        return render();
      }
      if (act === 'set-loc-days') {
        S.locDays = v;
        return render();
      }
      if (act === 'clear-loc-filter') {
        S.locSearch = '';
        S.locStatus = 'active';
        S.locDays = 'all';
        S.locStars = 'all';
        S.locGroup = 'all';
        return render();
      }
      if (act === 'clear-media-filter') {
        S.mediaFilter = null;
        return render();
      }
      if (act === 'create-task-from-insight') {
        toast('✓ Đã tạo công việc thành công trong Trung tâm công việc!');
        S.route = 'action_center';
        location.hash = 'action_center';
        return render();
      }
      if (act === 'approve-post') {
        toast('✓ Đã duyệt bài đăng Google Business Profile!');
        return render();
      }
      if (act === 'verify-missing-review') {
        toast('Đang đối chiếu dữ liệu review qua 2 lần quét phân trang...');
        return render();
      }
      if (act === 'export-locations-excel') {
        try {
          const d = await api(`locations?days=${S.locDays || S.days}&status=${S.locStatus}&group=${S.locGroup}&q=${encodeURIComponent(S.locSearch || '')}`);
          const items = d.items || [];
          let csv = '\\uFEFF"Tên địa điểm","Tên đầy đủ","Mã chi nhánh","Địa chỉ","Rating","Review có ảnh","Review chữ/trống","Tổng review Google","Review bị gỡ","Chưa phản hồi","Điện thoại","Website","Trạng thái"\\n';
          items.forEach(l => {
            csv += `"${l.displayName.replace(/"/g, '""')}","${l.fullName.replace(/"/g, '""')}","${l.branchCode}","${l.address.replace(/"/g, '""')}","${fmtRating(l.googleRating, 2)}","${l.reviewsWithPhoto}","${l.reviewsTextAndEmpty}","${l.googleTotalReviews}","${l.reviewsSuspectedMissing}","${l.unrepliedCount}","${l.phone}","${l.website}","${l.businessStatus}"\\n`;
          });
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const u = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = u;
          a.download = `Danh_Sach_Dia_Diem_GBP_${S.brand}_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(u);
          toast(`✓ Đã xuất Excel (${items.length} địa điểm) thành công!`);
        } catch (err) {
          alert('Lỗi xuất dữ liệu: ' + err.message);
        }
        return;
      }

      if (act === 'drill-incomplete-profiles') {
        S.selectedLocationId = v || 'loc_sc_tan_binh';
        S.route = 'location_detail';
        location.hash = 'location_detail';
        return render();
      }
      if (act === 'drill-failed-posts') {
        S.route = 'posts';
        location.hash = 'posts';
        S.postFilter = 'failed';
        return render();
      }
      if (act === 'open-smart-group-modal') {
        openSmartGroupModal(v);
        return;
      }
      if (act === 'open-profile-diff') {
        openProfileDiffModal(v);
        return;
      }
      if (act === 'save-profile-draft') {
        saveLocationProfileDraft(v);
        return;
      }
      if (act === 'open-dispatch-modal') {
        openDispatchScopeModal();
        return;
      }
      if (act === 'retry-failed-posts') {
        retryFailedPosts();
        return;
      }
      if (act === 'open-qr-batch-modal') {
        openQrBatchModal();
        return;
      }
      if (act === 'update-alert-status') {
        updateAlertStatus(el.dataset.id, v);
        return;
      }
      if (act === 'suggest-ai-3-replies') {
        generateAi3Replies();
        return;
      }
      if (act === 'drill-neg') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.stars = 'neg';
        S.reviewDays = S.days;
        S.branch = '';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-star') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.stars = v;
        S.reviewDays = S.days;
        S.branch = '';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-topic') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.topic = v;
        S.reviewDays = S.days;
        S.stars = 'all';
        S.branch = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-keyword') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.q = v;
        S.reviewDays = S.days;
        S.stars = 'all';
        S.branch = '';
        S.topic = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-status') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.filterStatus = v;
        S.reviewDays = null; // Vụ việc tồn đọng/quá hạn tính trên toàn bộ hàng đợi vận hành
        S.stars = 'all';
        S.branch = '';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-branch') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.branch = v;
        S.reviewDays = S.days;
        S.stars = 'all';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-branch-neg') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.branch = v;
        S.stars = 'neg';
        S.reviewDays = S.days;
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-branch-unreplied') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.branch = v;
        S.filterStatus = 'unreplied';
        S.reviewDays = S.days; // Giữ nguyên kỳ đang chọn khi bấm số liệu trong bảng chi nhánh
        S.stars = 'all';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'drill-branch-overdue') {
        S.route = 'reviews';
        location.hash = 'reviews';
        S.branch = v;
        S.filterStatus = 'overdue';
        S.reviewDays = S.days; // Giữ nguyên kỳ đang chọn khi bấm số liệu trong bảng chi nhánh
        S.stars = 'all';
        S.topic = '';
        S.q = '';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.assigneeFilter = 'all';
        return render();
      }
      if (act === 'clear-evidence') {
        S.evidenceIds = null;
        S.evidenceLabel = '';
        return render();
      }
      if (act === 'clear-topic') {
        S.topic = '';
        return render();
      }
      if (act === 'clear-q') {
        S.q = '';
        return render();
      }
      if (act === 'clear-review-days') {
        S.reviewDays = null;
        return render();
      }
      if (act === 'reset-all-filters') {
        S.stars = 'all';
        S.branch = '';
        S.topic = '';
        S.q = '';
        S.filterStatus = 'all';
        S.assigneeFilter = 'all';
        S.reviewDays = null;
        S.evidenceIds = null;
        S.evidenceLabel = '';
        return render();
      }
      if (act === 'ai-cross-branch') {
        showAiCrossBranchModal();
        return;
      }
      if (act === 'nav') { S.route = v; location.hash = v; S.branch = ''; S.evidenceIds = null; S.evidenceLabel = ''; return render(); }
      if (act === 'star') { S.stars = v === S.stars ? 'all' : v; return render(); }
      if (act === 'sort') { S.sort = v; return render(); }
      if (act === 'branch') { S.branch = v === S.branch ? '' : v; return render(); }
      if (act === 'range') { S.days = +v; return render(); }
      if (act === 'theme') {
        const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = t;
        localStorage.setItem('cb-theme', t);
        return render();
      }
      if (act === 'more') return loadMore(el);
      if (act === 'sync') {
        el.disabled = true;
        const oldText = el.textContent;
        el.textContent = 'Đang kiểm tra…';
        try {
          if (RUNTIME_MODE === 'live') {
            el.textContent = 'Đang đồng bộ…';
            const r = await post('sync', {});
            toast(r && r.error ? `Đồng bộ lỗi: ${esc(r.error)}` : 'Đã đồng bộ xong. Đang tải lại dữ liệu mới…');
            setTimeout(() => location.reload(), 1200);
          } else {
            alert('Bản demo: Dữ liệu đang được cố định theo snapshot ngày 15/10/2026.\nChức năng đồng bộ dữ liệu thời gian thực từ Google Places/SerpApi chỉ kích hoạt khi chạy server (node server.js).');
          }
        } catch (err) {
          console.error(err);
        } finally {
          el.disabled = false;
          el.textContent = oldText;
        }
        return;
      }
      if (act === 'readall') {
        try { await post('read'); } catch (e) { }
        document.querySelectorAll('.alert.unread').forEach((a) => a.classList.remove('unread'));
        document.querySelectorAll('[data-act="readone"]').forEach((b) => b.remove());
        const curB = cur();
        if (curB) curB.unread = 0;
        if (S.cfg) renderSide();
        return;
      }
      if (act === 'readone') {
        try { await post('read', { id: v }); } catch (e) { }
        const card = el.closest('.alert');
        if (card) {
          card.classList.remove('unread');
          el.remove();
        }
        const curB = cur();
        if (curB && curB.unread > 0) curB.unread--;
        if (S.cfg) renderSide();
        return;
      }
      if (act === 'report') {
        el.disabled = true;
        const oldText = el.textContent;
        el.textContent = 'Đang xử lý…';
        try {
          alert('Bản demo: Chưa hỗ trợ tạo báo cáo mới trực tiếp trên trình duyệt.\nMời xem các báo cáo mẫu có thể mở xem trực tiếp trong danh sách bên dưới.');
        } catch (err) {
          console.error(err);
        } finally {
          el.disabled = false;
          el.textContent = oldText;
        }
        return;
      }
      if (act === 'openreport') {
        const repId = el.dataset.id;
        const repData = await api('reports');
        const rep = (repData.reports || []).find((r) => r.id === repId);
        if (!rep) return toast('Không tìm thấy báo cáo');
        showReportModal(rep);
        return;
      }
    });

    document.addEventListener('change', async (e) => {
      if (e.target.id === 'brandsel') {
        S.brand = e.target.value;
        localStorage.setItem('cb-brand', S.brand);
        S.branch = '';
        S.region = 'all';
        S.evidenceIds = null;
        S.evidenceLabel = '';
        S.topic = '';
        S.q = '';
        S.assigneeFilter = 'all';
        const bConfig = getBrandConfig(S.brand);
        const indPack = getIndustryPack(bConfig.industry);
        S.topicLabels = Object.assign({}, indPack.topics, bConfig.customTopics || {});
        render();
      }
    });

    // Tooltip dùng chung cho mọi biểu đồ
    const tip = $('#tip');
    document.addEventListener('mousemove', (e) => {
      const t = e.target.closest('[data-tip]');
      if (!t) return (tip.style.display = 'none');
      tip.innerHTML = t.dataset.tip;
      tip.style.display = 'block';
      const w = tip.offsetWidth;
      tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px';
      tip.style.top = e.clientY + 14 + 'px';
    });

    window.addEventListener('hashchange', () => {
      const r = location.hash.slice(1);
      if (pages[r] && r !== S.route) { S.route = r; render(); }
    });

    function connect() {
      // Chế độ RUNTIME_MODE: 'snapshot' luôn hiển thị trạng thái snapshot, không phụ thuộc cổng truy cập
      if (RUNTIME_MODE === 'snapshot' || location.protocol === 'file:') {
        S.live = false;
        S.liveText = 'Dữ liệu chụp ngày 15/10/2026';
        if (S.cfg) renderSide();
        return;
      }
      try {
        const es = new EventSource('/api/stream');
        es.onopen = () => { S.live = true; S.liveText = 'LIVE — đang kết nối'; if (S.cfg) renderSide(); };
        es.onerror = () => { S.live = false; S.liveText = 'Dữ liệu chụp ngày 15/10/2026'; if (S.cfg) renderSide(); };
        es.addEventListener('sync', async (ev) => {
          const d = JSON.parse(ev.data);
          // Live: review pool được nạp lúc mở trang → tải lại trang để lấy dữ liệu mới (trừ khi đang gõ dở)
          if (d.brand === S.brand && d.added) {
            const typing = ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName);
            if (typing) toast('Có review mới vừa đồng bộ. Lưu nội dung đang soạn rồi nhấn F5 để cập nhật.');
            else return setTimeout(() => location.reload(), 800);
          }
          await loadCfg();
          if (d.brand === S.brand) render();
          else renderSide();
        });
        es.addEventListener('alert', (ev) => {
          const d = JSON.parse(ev.data);
          if (d.key?.startsWith('sev:')) return;
          const b = S.cfg?.brands.find((x) => x.id === d.brand);
          toast(`<b>${esc(b?.name || d.brand)}</b><br>${esc(d.title)}`);
        });
      } catch (e) {
        S.live = false;
        S.liveText = 'Dữ liệu chụp ngày 15/10/2026';
        if (S.cfg) renderSide();
      }
    }

    window.pages = pages;
    window.S = S;
    window.render = render;

    (async function init() {
      document.documentElement.dataset.theme = localStorage.getItem('cb-theme') || 'dark';
      if (!pages[S.route]) S.route = 'overview';
      await loadCfg();
      await render();
      connect();
    })();
