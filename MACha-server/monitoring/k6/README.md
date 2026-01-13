# 🧪 K6 Load Testing Scripts

Thư mục này chứa các K6 load testing scripts cho MACha Server.

## 📁 Files

- `local.js` - Load test script cho local development (localhost:8887)
- `production.js` - Load test script cho production server
- `run-local.sh` - Script helper để chạy local test
- `run-production.sh` - Script helper để chạy production test

## 🚀 Cách Sử Dụng

### Local Development

**Cách 1: Sử dụng script helper (Khuyến nghị)**
```bash
cd monitoring/k6
./run-local.sh
```

**Cách 2: Manual**
```bash
export BASE_URL=http://localhost:8887
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

k6 run monitoring/k6/local.js
```

### Production

**⚠️ CẢNH BÁO: Chỉ chạy trong giờ off-peak!**

**Cách 1: Sử dụng script helper (Khuyến nghị)**
```bash
cd monitoring/k6
./run-production.sh
```

**Cách 2: Manual**
```bash
export BASE_URL=https://macha-production-4144.up.railway.app
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

k6 run monitoring/k6/production.js
```

## 📊 Test Scenarios

Cả 2 scripts test 4 endpoints chính:
1. `GET /api/posts` - Get all posts
2. `GET /api/campaigns` - Get all campaigns
3. `GET /api/events` - Get all events
4. `GET /api/recommendations` - Get campaign recommendations

### Load Pattern

- **Stage 1:** 50 VUs trong 2 phút
- **Stage 2:** 100 VUs trong 2 phút
- **Stage 3:** 200 VUs trong 2 phút

**Tổng thời gian:** ~6 phút

## 📈 Metrics

K6 sẽ đo:
- **Request Rate (RPS)** - Số requests mỗi giây
- **Latency** - p50, p95, p99 response time
- **Error Rate** - Tỷ lệ lỗi (< 5%)
- **HTTP Status Codes** - Phân bố status codes

## 📄 Reports

Sau khi test xong, K6 sẽ tạo file `summary.html` trong thư mục hiện tại.

Mở report:
```bash
open summary.html
```

## 🔍 So Sánh với Grafana

Sau khi chạy load test, so sánh metrics:

| Metric | K6 Output | Grafana Query |
|--------|-----------|---------------|
| **RPS** | `http_reqs` / duration | `rate(http_requests_total[1m])` |
| **p95 Latency** | `http_req_duration{quantile="0.95"}` | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))` |
| **p99 Latency** | `http_req_duration{quantile="0.99"}` | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[1m]))` |
| **Error Rate** | `http_req_failed` | `sum(rate(http_requests_total{status_code=~"4..\|5.."}[1m])) / sum(rate(http_requests_total[1m]))` |

## ⚙️ Customization

### Thay đổi Load Pattern

Chỉnh sửa `stages` trong file `.js`:

```javascript
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 VUs
        { duration: '2m', target: 50 },   // Stay at 50 VUs
        { duration: '1m', target: 0 },    // Ramp down
    ],
};
```

### Thay đổi Thresholds

Chỉnh sửa `thresholds` trong file `.js`:

```javascript
thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // p95 < 2s, p99 < 5s
    'http_req_failed': ['rate<0.01'],                   // Error rate < 1%
},
```

## 📦 Cài Đặt K6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Xem thêm: https://k6.io/docs/getting-started/installation/

## ✅ Checklist

Trước khi chạy load test:

- [ ] K6 đã được cài đặt
- [ ] Backend server đang chạy và accessible
- [ ] Test user credentials đúng
- [ ] Monitoring stack (Prometheus/Grafana) đang chạy (optional nhưng khuyến nghị)
- [ ] Environment variables đã set đúng

Trong khi chạy load test:

- [ ] Monitor Grafana dashboard (nếu có)
- [ ] Check error rate < 5%
- [ ] Check latency p95/p99
- [ ] Sẵn sàng dừng test nếu cần

Sau khi load test:

- [ ] Xem K6 summary report
- [ ] So sánh với Grafana metrics
- [ ] Document kết quả
- [ ] Identify bottlenecks

---

**Happy Load Testing! 🚀**

