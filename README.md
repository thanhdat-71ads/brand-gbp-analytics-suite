# CheckBrand – Brand & GBP Analytics Suite

Dashboard giám sát thương hiệu và quản trị danh tiếng Google Business Profile cho chuỗi đa chi nhánh (bản demo snapshot, chạy 100% trên trình duyệt).

🔗 Live: https://thanhdat-71ads.github.io/brand-gbp-analytics-suite/

## Cấu trúc thư mục

```
brand-gbp-analytics-suite/
├── index.html                  ← Khung trang (HTML), nạp các file bên dưới
├── CheckBrand_demo.html        ← Chuyển hướng về index.html (giữ link cũ)
├── assets/
│   ├── css/
│   │   └── app.css             ← Toàn bộ giao diện: màu, font, layout, theme sáng/tối, in PDF
│   └── js/
│       ├── config.js           ← CẤU HÌNH CHUNG: mốc snapshot dữ liệu
│       ├── mock-api.js         ← Giả lập REST API /api/... (thay bằng backend thật sau này)
│       ├── app.js              ← Logic chính: router, các trang, workflow review, QR, Smart Group
│       ├── notify.js           ← Chuông cảnh báo review 1–2★ + toast
│       ├── demo-alert.js       ← Cảnh báo mẫu khi mở demo lần đầu
│       └── vendor/
│           └── qrcode.min.js   ← Thư viện tạo mã QR (không sửa)
├── data/
│   └── demo-data.js            ← Dữ liệu snapshot Google Review (15/10/2026)
├── .gitignore
└── README.md
```

> ⚠️ Thứ tự nạp script trong `index.html` là bắt buộc: `config → data → mock-api → vendor → app → notify → demo-alert`.

## Sửa gì ở đâu

| Muốn thay đổi | Mở file |
|---|---|
| Màu sắc, font, khoảng cách, giao diện in | `assets/css/app.css` |
| Mốc ngày chốt dữ liệu (lọc 7/30/90 ngày, SLA) | `assets/js/config.js` → `SNAPSHOT_ISO` |
| Dữ liệu review / chi nhánh / thương hiệu | `data/demo-data.js` |
| Số liệu API trả về (hồ sơ, bài đăng, cảnh báo, SoV…) | `assets/js/mock-api.js` |
| Nội dung, bố cục từng trang, nút bấm | `assets/js/app.js` |
| Quy tắc chuông cảnh báo | `assets/js/notify.js` |

## Chạy trên máy

- Cách nhanh: mở `index.html` bằng trình duyệt (nhấp đúp).
- Khi phát triển: VS Code → chuột phải `index.html` → **Open with Live Server**.

## Lưu trữ trên trình duyệt (localStorage)

Thao tác người dùng (xử lý review, nháp, nhóm địa điểm, cảnh báo, theme) được lưu theo trình duyệt với các khoá `cb_wf_*`, `checkbrand_*`, `cb-theme`, `cb-brand`. Muốn về dữ liệu gốc: `F12` → Console → `localStorage.clear()` → `F5`.

## Quy trình cập nhật

```bash
git pull
# sửa file → kiểm tra bằng Live Server
git add .
git commit -m "Mô tả thay đổi"
git push        # GitHub Pages tự cập nhật sau 1–2 phút
```

Không tạo file `.bak` hay `(1)` — Git đã lưu lịch sử mọi phiên bản (tab Source Control / Timeline trong VS Code).

## Lộ trình

- [ ] Tách `app.js` theo từng trang (overview, reviews, locations, posts…)
- [ ] Thay `mock-api.js` bằng backend thật (Google Places API / GBP API / SerpAPI)
- [ ] Đăng nhập & phân quyền theo chi nhánh

---
© 71 ADS
