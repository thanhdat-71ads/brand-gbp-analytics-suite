/* =====================================================================
   CheckBrand – Cấu hình chung
   Sửa các giá trị ở đây khi cập nhật bộ dữ liệu snapshot mới.
   ===================================================================== */
window.CB_CONFIG = {
  // Mốc chốt dữ liệu snapshot: dùng để tính lọc 7/30/90 ngày và SLA quá hạn
  SNAPSHOT_ISO: '2026-10-15T09:03:42Z',
};
window.CB_CONFIG.SNAPSHOT_TIME = new Date(window.CB_CONFIG.SNAPSHOT_ISO).getTime();

// Trả về bản sao sạch của dữ liệu demo (data/demo-data.js), giống JSON.parse cũ
window.CB_getDemoData = function () {
  return JSON.parse(JSON.stringify(window.CB_DEMO_DATA));
};
