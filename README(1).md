# CheckBrand — Nền tảng Giám sát Thương hiệu & Quản trị Danh tiếng Đa Chi nhánh

Hệ thống B2B ORM (Online Reputation Management) & Brand Intelligence chuyên sâu cho chuỗi cơ sở thẩm mỹ, phòng khám và doanh nghiệp dịch vụ đa chi nhánh. 

Kho lưu trữ bao gồm:
1. **`CheckBrand_demo.html`**: Bản demo dashboard độc lập (All-in-one standalone demo), có thể mở trực tiếp trên trình duyệt web không cần cài đặt hay bật server.
2. **`app_check_brand.css`**: Hệ thống Design Tokens & Stylesheet hoàn chỉnh của CheckBrand, sẵn sàng trích xuất và tái sử dụng cho các dự án web/portal.
3. **Mã nguồn Backend (`backend/`) & Frontend (`frontend/`) & Migrations (`migrations/`)**: Kiến trúc Multi-tenancy 4 tầng, PostgreSQL Row-Level-Security (RLS), NestJS REST API và Vite + TypeScript SPA phục vụ triển khai sản xuất.

---

## 1. Hướng dẫn Trải nghiệm Nhanh Bản Demo (`CheckBrand_demo.html`)

Bản demo được đóng gói sẵn toàn bộ dữ liệu snapshot (thời điểm chốt số liệu: `15/10/2026 09:03:42 UTC`) cùng mock REST API nội bộ và giao diện tương tác hai thương hiệu: **Seoul Center** và **JIVI Clinic Premium**.

### Cách mở:
- **Cách 1**: Nhấp đúp chuột vào tệp `CheckBrand_demo.html` trên máy tính để mở bằng bất kỳ trình duyệt hiện đại nào (Chrome, Edge, Firefox, Safari).
- **Cách 2**: Kéo và thả tệp `CheckBrand_demo.html` vào cửa sổ trình duyệt đang mở.
- **Không yêu cầu**: Không cần chạy `npm install`, không cần kết nối internet hay chạy backend server.

### Quy trình nghiệp vụ kiểm thử chính trên Demo:
1. **Quy trình Phê duyệt & Đăng phản hồi (Review Workflow)**:
   - Mở màn hình **Xử lý Review Google** hoặc bấm nút **📋 Xử lý** trên từng review.
   - Nhập hoặc tạo bản nháp phản hồi → Bấm **✓ Phê duyệt chuyên môn** (gắn duyệt với nội dung cụ thể).
   - **Cơ chế chống đăng sai lệch**: Nếu sửa đổi ô nhập sau khi đã duyệt, trạng thái tự động chuyển thành `⚠ Cần duyệt lại`. Nút **🌐 Đăng lên Google** sẽ chặn xuất bản và cảnh báo người dùng phải phê duyệt lại.
2. **Tính toán Hạn xử lý SLA Động**:
   - Vụ việc quá hạn (deadline trước mốc snapshot 15/10/2026) được hệ thống tự động đánh dấu cờ `ĐÃ QUÁ HẠN`.
   - Khi chuyển trạng thái sang **Hoàn tất vụ việc**, cờ quá hạn tắt.
   - Khi mở lại thành **Mới** hoặc **Đang xử lý**, hệ thống **luôn tính toán lại SLA động** theo công thức `(status !== 'resolved') && (snapshotTime > deadline)`, không lấy cờ tĩnh đã lưu cũ.
3. **Đối chiếu Bằng chứng & Giữ kỳ Ngày**:
   - Khi xem bảng thống kê chi nhánh theo kỳ (7 ngày, 30 ngày, 90 ngày), bấm vào số lượng review chưa phản hồi hoặc quá hạn sẽ **giữ nguyên kỳ đang chọn** (`reviewDays = S.days`).
   - Các nút mở hàng đợi toàn bộ lịch sử đều được ghi nhãn rõ ràng: `Mở hàng đợi xử lý toàn bộ lịch sử ↗`.
4. **Tổng hợp Rủi ro & Bằng chứng Khách quan**:
   - Bấm **✨ Tổng hợp rủi ro** tại trang Chi nhánh: số liệu được tổng hợp trực tiếp từ tập review của kỳ đang chọn.
   - Các khẳng định chuyên môn và vận hành được diễn đạt khách quan, bám sát dữ liệu: *"Không ghi nhận phản ánh về ... trong dữ liệu đã thu thập của kỳ này."*

---

## 2. Cơ chế Lưu trữ trên Trình duyệt (`localStorage`) & Giới hạn

Bản demo lưu trữ trạng thái thao tác vận hành của người dùng trên trình duyệt qua Web Storage API:

- **Khóa lưu trữ**: Sử dụng tiền tố `cb_wf_<review_id>` (ví dụ: `cb_wf_sc_rev_001`).
- **Nội dung lưu**: Trạng thái vụ việc (`ticketStatus`), nhân sự phụ trách (`assignee`), trạng thái phản hồi (`replyStatus`), nội dung đã duyệt (`approvedReplyText`), ghi chú nội bộ (`internalNotes`), nhật ký thao tác (`history`).
- **Phạm vi (Scope)**: Dữ liệu gắn liền với domain/origin mở tệp trên trình duyệt (hoặc `file://` local). Chế độ ẩn danh (Incognito) hoặc trình duyệt khác sẽ bắt đầu với trạng thái mẫu ban đầu.
- **Giới hạn dung lượng**: `localStorage` có giới hạn chuẩn khoảng 5MB trên mỗi domain. Bản demo chỉ lưu dữ liệu nghiệp vụ của các review đã thao tác nên chiếm chưa tới 1% dung lượng cho phép.
- **Cách xóa & Khôi phục dữ liệu gốc**:
  - Mở Developer Tools (`F12`) → chuyển qua tab **Console** → gõ `localStorage.clear()` → nhấn Enter và tải lại trang (`F5`).
  - Hoặc trong tab **Application** (Storage) → chọn **Local Storage** → nhấn **Clear All**.

---

## 3. Ma trận Trạng thái Chức năng (Feature Status Matrix)

Bảng dưới đây phân định rõ giữa các tính năng đã hoạt động trong bản **Demo Snapshot** (`CheckBrand_demo.html`) và các dịch vụ thuộc **Hệ thống Backend Sản xuất** (Production):

| Phân hệ / Chức năng | Trạng thái trong `CheckBrand_demo.html` (Demo Snapshot) | Trạng thái trong Hệ thống Backend Thực tế (Production) | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Dữ liệu Google Reviews** | Snapshot tĩnh 15/10/2026 (Seoul Center: 135 review; JIVI Clinic: 45 review) | Thu thập tự động qua Google Places (New) API & SerpAPI định kỳ | Bản demo chạy offline 100% |
| **Lọc thời gian (7 / 30 / 90 ngày)** | Tính toán động theo mốc snapshot chuẩn `15/10/2026T09:03:42Z` | Truy vấn SQL thời gian thực theo khoảng ngày yêu cầu | Đồng bộ bộ lọc trên mọi trang và biểu đồ |
| **Phân công & Quản lý vụ việc** | Hoạt động đầy đủ (lưu `localStorage`, có audit trail) | Lưu trữ cơ sở dữ liệu PostgreSQL kèm phân quyền RLS theo chi nhánh | Định tuyến tự động theo chi nhánh/chủ đề |
| **Ghi chú nội bộ giữa các phòng ban** | Hoạt động đầy đủ (gắn nhãn mô phỏng và lưu trên trình duyệt) | Lưu bảng `ticket_internal_notes` trên DB, thông báo nội bộ qua Webhook/Email | Hỗ trợ trao đổi nghiệp vụ CSKH - Bác sĩ |
| **Quy trình Phê duyệt Chuyên môn** | Hoạt động đầy đủ: khóa duyệt theo nội dung, hạ trạng thái khi sửa nháp | Tích hợp RBAC (chỉ tài khoản vai trò Bác sĩ/QLCM mới có quyền duyệt) | Ngăn ngừa phát ngôn sai lệch ra bên ngoài |
| **Đăng phản hồi Google Maps** | **Mô phỏng đăng phản hồi**: Ghi nhận trạng thái published trên giao diện demo | Gọi Google Business Profile (GBP) API OAuth 2.0 để xuất bản thật lên Google | Cần kết nối tài khoản doanh nghiệp Google đã xác minh |
| **Kiểm soát Hạn SLA (24h/48h)** | Tính toán SLA động trên thời gian snapshot, tự động phát hiện quá hạn | Worker nền (`pgboss` cron) quét định kỳ và gửi cảnh báo quá hạn | Luôn đánh giá lại khi mở lại vụ việc |
| **Trợ lý Gợi ý Nháp (AI Assistant)** | Sinh bản nháp theo quy tắc nghiệp vụ chuyên môn nội bộ | Kết nối mô hình LLM (Gemini 1.5 Pro/Flash) tạo nội dung ngữ cảnh sâu | Yêu cầu nhân sự duyệt trước khi sử dụng |
| **Phân tích Khía cạnh & Sentiment** | Gắn nhãn phân tích theo khía cạnh (Bác sĩ, Giá, Tư vấn, Chờ đợi...) | Pipeline NLP phân tích cảm xúc đa chiều (Aspect-Based Sentiment) | Review không lời được phân loại trung tính/an toàn |
| **Share of Voice & SEO Mentions** | Dữ liệu mẫu đo lường hiển thị Top 10 Google Search và Google News | Crawler tự động quét từ khóa ngành thẩm mỹ và tính tỷ lệ hiển thị định kỳ | Minh họa phương pháp đo lường hiện diện thương hiệu |
| **Báo cáo định kỳ (Tuần / Tháng)** | Trích xuất báo cáo động từ đúng tập review và bằng chứng của kỳ | Xuất file PDF/Excel tự động và gửi email báo cáo đầu tuần | Bằng chứng trích xuất nguyên văn, kèm ID đối chiếu |

---

## 4. Khởi động Hệ thống Full-stack (Dành cho Kỹ sư Triển khai)

Nếu bạn muốn kiểm tra hoặc phát triển tiếp kiến trúc backend và frontend phân tán:

### 1. Cơ sở dữ liệu (PostgreSQL / Supabase)
Thực thi các script SQL theo thứ tự trong thư mục `migrations/`:
- `001_initial_schema_and_rls.sql`: Tạo cấu trúc bảng, RLS policies, hàm mã hóa.
- `002_seed_demo_data.sql`: Dữ liệu khởi tạo cho 2 thương hiệu thử nghiệm.

### 2. Khởi động Backend API (NestJS)
```powershell
cd backend
npm install
npm run dev
```
Backend API lắng nghe tại: `http://localhost:3001/api/v1`

### 3. Khởi động Frontend Dashboard (Vite + TypeScript)
```powershell
cd frontend
npm install
npm run dev
```
Giao diện quản trị lắng nghe tại: `http://localhost:5173`

### 4. Chạy Bộ Kiểm thử Tự động Backend
```powershell
cd backend
npm test
```
Bao gồm các test suite: Crypto AES-256-GCM, E2E API, Onboarding Idempotency, và Tenant Data Isolation.
