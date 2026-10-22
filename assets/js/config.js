/* =====================================================================
   CheckBrand – Cấu hình chung
   Sửa các giá trị ở đây khi cập nhật bộ dữ liệu snapshot mới.
   ===================================================================== */
window.CB_CONFIG = {
  // 'demo' = chạy dữ liệu snapshot (GitHub Pages, mở file trực tiếp, Live Server)
  // 'live' = chạy qua server/ (node server.js) – server tự chuyển sang 'live' khi nạp data/demo-data.js
  MODE: 'demo',

  // Mốc chốt dữ liệu snapshot: dùng để tính lọc 7/30/90 ngày và SLA quá hạn (chế độ demo)
  SNAPSHOT_ISO: '2026-10-15T09:03:42Z',

  // Ở chế độ live, endpoint nào lấy từ server thật được khai báo trong assets/js/mock-api.js (LIVE_REAL / LIVE_POST)
};
window.CB_CONFIG.SNAPSHOT_TIME = new Date(window.CB_CONFIG.SNAPSHOT_ISO).getTime();

// Trả về bản sao sạch của dữ liệu demo (data/demo-data.js), giống JSON.parse cũ
window.CB_getDemoData = function () {
  return JSON.parse(JSON.stringify(window.CB_DEMO_DATA));
};

