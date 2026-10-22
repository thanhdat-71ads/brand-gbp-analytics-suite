/* Demo: bật 1 cảnh báo mẫu lần đầu mở trang trong phiên */
setTimeout(function () { try { if (window.CBNotify && !sessionStorage.getItem('cb-demo-alert')) { sessionStorage.setItem('cb-demo-alert', '1'); CBNotify.test(1); } } catch (e) { } }, 3500);
