/* Demo: bật 1 cảnh báo mẫu lần đầu mở trang trong phiên. Chế độ live: ẩn nhãn "Bản demo" và không bắn cảnh báo mẫu. */
if (window.CB_CONFIG && CB_CONFIG.MODE === 'live') {
  var demoTag = document.getElementById('demo-tag');
  if (demoTag) demoTag.textContent = 'LIVE · dữ liệu thật từ server';
} else
setTimeout(function () { try { if (window.CBNotify && !sessionStorage.getItem('cb-demo-alert')) { sessionStorage.setItem('cb-demo-alert', '1'); CBNotify.test(1); } } catch (e) { } }, 3500);
