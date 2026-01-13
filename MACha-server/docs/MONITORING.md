Role: Bạn là Senior Backend + DevOps Engineer.
Nhiệm vụ: Đọc toàn bộ codebase hiện tại của project và triển khai hệ thống monitoring end-to-end theo yêu cầu dưới đây.
Yêu cầu: Phải đọc code thực tế, không giả định cấu trúc, không hard-code port, tuân thủ .env.

🎯 Mục tiêu Monitoring

Thiết kế và triển khai hệ thống monitoring để trả lời được các câu hỏi:

Hệ thống chịu tải thế nào?

Nghẽn ở đâu (app hay infra)?

Latency p95 bao nhiêu khi tải tăng?

WebSocket có bị quá tải không?

CPU / RAM / Load có phải bottleneck không?

🧱 Phạm vi triển khai
1️⃣ Backend Metrics (Prometheus)

Đọc code backend hiện tại (Node.js / Express / Nest / framework tương ứng).

Implement /metrics endpoint dùng prom-client.

Metrics bắt buộc:

http_requests_total (counter)

http_request_duration_seconds (histogram, có bucket phù hợp)

http_requests_in_flight (gauge – optional nhưng khuyến khích)

Active WebSocket connections (gauge)

Labels chuẩn:

method

route

status_code

Không hard-code:

Port

Metrics path

Lấy config từ .env:

METRICS_ENABLED

METRICS_PORT (nếu backend tách port)

METRICS_PATH (default /metrics)

➡️ Output:

Code middleware metrics

Code expose /metrics

Giải thích ngắn gọn từng metric

2️⃣ Prometheus

Viết prometheus.yml

Scrape:

Backend /metrics

Node Exporter

Interval hợp lý (5s–15s)

Không hard-code IP → dùng service name hoặc env

➡️ Output:

prometheus.yml

Giải thích từng job scrape

3️⃣ Node Exporter (Infra Monitoring)

Setup Node Exporter để theo dõi:

CPU usage

Memory usage

Load average

Tích hợp Prometheus scrape

➡️ Output:

Config Node Exporter

Cách verify metric hoạt động

4️⃣ Grafana Dashboard

Tạo dashboard production-ready, bao gồm:

📊 Biểu đồ bắt buộc

Request per second (RPS)

Latency:

p50

p95

p99 (nếu có)

Error rate (4xx / 5xx)

Active WebSocket connections

CPU usage (%)

Memory usage

Load average

➡️ Output:

JSON dashboard Grafana (import được)

Mô tả từng panel dùng để phân tích gì

5️⃣ K6 Load Testing

Viết script K6:

Ramp-up users (ví dụ: 10 → 50 → 200)

Test cả:

HTTP API

WebSocket (nếu có)

Output metrics để so sánh với Grafana:

RPS

Latency

Error rate

➡️ Output:

k6.js

Hướng dẫn chạy

Cách đối chiếu kết quả với Grafana

6️⃣ Phân tích & Kết luận

Sau khi triển khai xong, phân tích dựa trên số liệu:

Khi tải tăng:

Latency tăng do app hay infra?

CPU/RAM có chạm ngưỡng không?

WebSocket có bị leak connection không?

Kết luận:

Bottleneck nằm ở đâu

Gợi ý scale (horizontal / vertical / optimize code)

⚠️ Nguyên tắc bắt buộc

❌ Không hard-code port, host, path

✅ Tuân thủ .env

✅ Code rõ ràng, comment đầy đủ

✅ Ưu tiên production-grade metrics

✅ Không giả định framework nếu chưa đọc code

📦 Kết quả mong muốn

Agent phải trả về:

Code đã implement metrics trong backend

Prometheus config

Grafana dashboard JSON

K6 script

Hướng dẫn chạy local

Phân tích bottleneck dựa trên metrics