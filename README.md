# CheckBrand – Brand & GBP Analytics Suite

Tool giám sát thương hiệu và quản trị danh tiếng Google Business Profile cho chuỗi đa chi nhánh.
**Một bộ giao diện, hai chế độ chạy:**

| Chế độ | Chạy ở đâu | Dữ liệu |
|---|---|---|
| **DEMO** | GitHub Pages, mở `index.html` trực tiếp, VS Code Live Server | Snapshot cố định 15/10/2026 (`data/demo-data.js`) |
| **LIVE** | `npm start` trên máy → http://127.0.0.1:3000 | Review thật qua SerpApi, lưu ở `server/data/db.json` |

🔗 Demo: https://thanhdat-71ads.github.io/brand-gbp-analytics-suite/

## Cấu trúc thư mục

```
brand-gbp-analytics-suite/
├── index.html                  ← Khung trang, dùng chung cho cả DEMO và LIVE
├── CheckBrand_demo.html        ← Chuyển hướng về index.html (giữ link cũ)
├── assets/
│   ├── css/app.css             ← Giao diện: màu, font, layout, theme sáng/tối, in PDF
│   └── js/
│       ├── config.js           ← Cấu hình chung: chế độ, mốc snapshot
│       ├── mock-api.js         ← Lớp API: mô phỏng (DEMO) + nối server thật (LIVE)
│       ├── app.js              ← Logic giao diện: router, các trang, workflow review, QR…
│       ├── notify.js           ← Chuông cảnh báo review 1–2★ + toast
│       ├── demo-alert.js       ← Cảnh báo mẫu (chỉ DEMO) / nhãn LIVE
│       └── vendor/qrcode.min.js
├── data/
│   └── demo-data.js            ← Dữ liệu snapshot cho DEMO
├── server/                     ← Backend Node.js 20+ (không cần cài thư viện)
│   ├── server.js               ← API, lịch đồng bộ, phục vụ giao diện ở trên
│   ├── lib/                    ← SerpApi, phân tích cảm xúc, metrics, cảnh báo, báo cáo
│   ├── config/brands.example.json  ← Mẫu khai báo brand/chi nhánh/đối thủ
│   ├── scripts/find-place.js   ← Tìm dataId Google Maps
│   ├── .env.example            ← Mẫu khai báo API key
│   └── README.md               ← Hướng dẫn chi tiết backend
├── package.json                ← Lệnh tắt: npm start
├── .gitignore
└── README.md
```

Không bao giờ lên GitHub (đã chặn trong `.gitignore`): `server/.env` (API key), `server/config/brands.json`, `server/data/` (review thật + báo cáo).

## Chạy LIVE trên máy

```powershell
npm start
```
Mở http://127.0.0.1:3000. Lần đầu: tạo `server/.env` từ `server/.env.example` và `server/config/brands.json` từ `brands.example.json` (xem `server/README.md`).

### Trang nào đang dùng dữ liệu thật ở chế độ LIVE?

| Dữ liệu thật từ server | Vẫn là mô phỏng (chờ tích hợp Google Business Profile API) |
|---|---|
| Tổng quan, Review & Phản hồi, Cảm xúc & Chủ đề, Share of Voice, Rủi ro & Cảnh báo, Lịch sử danh tiếng, Báo cáo, nút Cập nhật ngay, cảnh báo real-time | Danh sách/Nhóm/Chi tiết địa điểm, Thứ hạng địa phương, Bài đăng Google, Thư viện ảnh, Lịch sử thao tác, phân quyền |

Thao tác xử lý review (phân công, ghi chú, duyệt/đánh dấu đã phản hồi) ở chế độ LIVE được **lưu trên server** (`server/data/db.json`), mở trên trình duyệt hay máy nào cũng thấy. Chế độ DEMO vẫn lưu trên trình duyệt.

Nút "Đăng lên Google" ở chế độ LIVE: lưu trạng thái "đã phản hồi" và sao chép nội dung để dán lên Google Maps (chưa nối Google Business Profile API).

Kiểm tra lại trạng thái phản hồi của review cũ (tốn khoảng 5 lượt SerpApi mỗi chi nhánh):
```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:3000/api/seoul-center/sync" -ContentType "application/json" -Body '{"recheckReplies":true}'
```

## Sửa gì ở đâu

| Muốn thay đổi | Mở file |
|---|---|
| Màu sắc, font, giao diện in | `assets/css/app.css` |
| Mốc ngày snapshot DEMO | `assets/js/config.js` → `SNAPSHOT_ISO` |
| Dữ liệu DEMO | `data/demo-data.js` |
| Trang nào lấy dữ liệu thật ở LIVE | `assets/js/mock-api.js` → phần `LỚP CHUYỂN ĐỔI CHẾ ĐỘ LIVE` |
| Nội dung, bố cục từng trang | `assets/js/app.js` |
| Brand, chi nhánh, đối thủ, nhân sự | `server/config/brands.json` |
| API key, lịch đồng bộ | `server/.env` |
| Công thức Health Score, cảnh báo | `server/lib/metrics.js`, `server/lib/crisis.js` |

## Quy trình cập nhật

```bash
git pull
# sửa file → kiểm tra (DEMO: Live Server · LIVE: npm start)
git add .
git commit -m "Mô tả thay đổi"
git push        # GitHub Pages tự cập nhật bản DEMO sau 1–2 phút
```

## Lộ trình

- [x] Gộp bản DEMO và bản chạy thật vào một code
- [x] Lưu workflow xử lý review vào server thay vì trình duyệt
- [ ] Tích hợp Google Business Profile API (địa điểm, bài đăng, ảnh, trả lời review)
- [ ] Tách `app.js` theo từng trang
- [ ] Đăng nhập & phân quyền theo chi nhánh

---
© 71 ADS
