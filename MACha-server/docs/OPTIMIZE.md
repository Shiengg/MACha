Bạn là Senior Backend Performance Engineer & SRE.

Nhiệm vụ của bạn:
- Đọc TOÀN BỘ codebase hiện tại
- Phân tích bottleneck khi hệ thống chịu tải lớn (200-300 concurrent users)
- Chỉ ra nguyên nhân gốc rễ gây latency cao (p95/p99)
- Trực tiếp chỉnh sửa code để tối ưu performance ở mức tối đa
- Đảm bảo hệ thống scale tốt khi nhiều người truy cập đồng thời

========================
📌 BỐI CẢNH HỆ THỐNG
========================
- Backend: Node.js (Express)
- Database: MongoDB (Mongoose)
- Auth: JWT
- Monitoring: Prometheus + Grafana
- Load test: k6
- Cache: Redis
- Hiện tượng:
  - CPU < 15%, RAM dư
  - Error rate = 0%
  - Latency p95/p99 tăng mạnh
  - HTTP Requests In Flight tăng cao → request bị queue
  - Bottleneck nghi ngờ ở Application / Database layer

========================
🎯 MỤC TIÊU CUỐI
========================
- p95 < 2s tại 200 VU
- p99 < 5s tại 200 VU
- Giảm in-flight requests < 100
- Không thay đổi business logic
- Không làm sai dữ liệu

========================
🧠 CÁC VIỆC PHẢI LÀM (BẮT BUỘC)
========================

### 1️⃣ PHÂN TÍCH BOTTLENECK
- Đọc controllers, services, repositories
- Chỉ ra:
  - Endpoint nào chậm nhất
  - Query MongoDB nào tốn thời gian
  - Có N+1 query hay không
  - Có query thiếu index hay không
  - Có xử lý sync/blocking trong request lifecycle hay không
- Giải thích NGUYÊN NHÂN, không chỉ nêu hiện tượng

---

### 2️⃣ DATABASE OPTIMIZATION (ƯU TIÊN CAO NHẤT)
- Thêm **index phù hợp** cho các collection:
  - posts, campaigns, comments, donations, conversations, messages
- Refactor query:
  - Dùng `select()` để giảm payload
  - Dùng pagination bắt buộc
  - Thay nhiều query bằng aggregation pipeline
- Fix triệt để N+1 queries
- Đảm bảo query sử dụng index (theo access pattern)

👉 Yêu cầu:
- Chỉnh sửa trực tiếp code
- Chỉ rõ file nào được sửa
- Giải thích ngắn gọn lý do

---

### 3️⃣ CONNECTION POOL & RESOURCE MANAGEMENT
- Kiểm tra MongoDB connection config
- Điều chỉnh:
  - maxPoolSize
  - minPoolSize
- Đảm bảo không bị request chờ connection
- Nếu cần, refactor code để tránh giữ connection quá lâu

---

### 4️⃣ IMPLEMENT CACHING (REDIS)
- Thêm Redis caching cho các GET endpoint nặng:
  - /api/posts
  - /api/campaigns
  - /api/events
- Thiết kế cache key hợp lý (bao gồm params, userId nếu cần)
- TTL phù hợp (30s – 10m)
-  Đảm bảo cache được xoá đúng để luôn nhận được thông tin mới

👉 Yêu cầu:
- Tạo middleware cache dùng lại được
- Chỉnh sửa controller để áp dụng cache
- Không cache sai dữ liệu người dùng

---

### 5️⃣ APPLICATION-LEVEL OPTIMIZATION
- Giảm payload response (DTO / response shaping)
- Chạy song song các tác vụ độc lập (Promise.all)
- Tránh await không cần thiết
- Đảm bảo không có logic blocking event loop
- Bật gzip compression nếu chưa có

---

### 6️⃣ OBSERVABILITY & VERIFY
- Đảm bảo metrics Prometheus vẫn chính xác
- Nếu cần, bổ sung custom metrics:
  - DB query duration
  - Cache hit/miss
- Chỉ ra metric nào sẽ cải thiện sau mỗi tối ưu

---

### 7️⃣ OUTPUT BẮT BUỘC
Kết quả trả về PHẢI BAO GỒM:

1. 📍 Danh sách bottleneck tìm thấy (theo mức độ nghiêm trọng)
2. 🛠 Các file đã chỉnh sửa (kèm diff hoặc code mới)
3. 🚀 Tối ưu nào giúp giảm latency nhiều nhất
4. 📈 Kỳ vọng cải thiện:
   - p95 trước / sau
   - p99 trước / sau
5. ⚠️ Các rủi ro hoặc trade-off (nếu có)

---

### 8️⃣ NGUYÊN TẮC
- Không rewrite toàn bộ hệ thống
- Ưu tiên hiệu quả thực tế > code đẹp
- Giải pháp phải chạy được production
- Nếu cần giả định, hãy nêu rõ giả định đó

👉 Hãy bắt đầu bằng việc đọc codebase và phân tích bottleneck nghiêm trọng nhất trước.
