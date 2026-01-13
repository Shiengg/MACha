# 🚀 Hướng Dẫn Load Test Production Server với K6 và Grafana

Hướng dẫn chi tiết để chạy load test trên production server `https://macha-production-4144.up.railway.app` và monitor metrics qua Grafana.

---

## 📋 Yêu Cầu

- Docker & Docker Compose
- K6 installed ([Installation Guide](https://k6.io/docs/getting-started/installation/))
- Production server đã enable metrics endpoint (`/metrics`)

---

## 🔧 Bước 1: Kiểm Tra Production Server

### 1.1 Verify Metrics Endpoint

Kiểm tra xem production server có expose metrics endpoint không:

```bash
# Test metrics endpoint
curl https://macha-production-4144.up.railway.app/metrics

# Nếu cần authentication, thử với token:
curl -H "Authorization: Bearer YOUR_TOKEN" https://macha-production-4144.up.railway.app/metrics
```

**Kỳ vọng:** Thấy các metrics Prometheus format như:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/posts",status_code="200"} 1234
...
```

### 1.2 Verify API Endpoints

Test các endpoints sẽ được load test:

```bash
# Health check
curl https://macha-production-4144.up.railway.app/

# Login (để lấy token)
curl -X POST https://macha-production-4144.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

---

## 🐳 Bước 2: Setup Monitoring Stack (Local)

### 2.1 Start Prometheus và Grafana

Chạy monitoring stack để scrape metrics từ production:

```bash
cd MACha-server

# Start monitoring stack
docker-compose -f docker-compose.production-monitoring.yml up -d

# Verify services đang chạy
docker ps | grep -E "prometheus|grafana"
```

### 2.2 Verify Prometheus Scraping

Kiểm tra Prometheus có scrape được production metrics không:

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="macha-backend-production")'

# Check Prometheus UI
open http://localhost:9090/targets
```

**Kỳ vọng:** Target `macha-backend-production` có status `UP` (màu xanh).

### 2.3 Verify Grafana

Truy cập Grafana dashboard:

```bash
# Open Grafana
open http://localhost:3001

# Login:
# Username: admin
# Password: admin (hoặc từ GRAFANA_PASSWORD env var)
```

**Kỳ vọng:** Dashboard "MACha Monitoring Dashboard" hiển thị metrics từ production.

---

## 🧪 Bước 3: Chạy K6 Load Test

### 3.1 Cấu Hình Environment Variables

```bash
# Set production URL
export BASE_URL=https://macha-production-4144.up.railway.app

# Set test user credentials
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

# Verify
echo "BASE_URL: $BASE_URL"
echo "TEST_USER_EMAIL: $TEST_USER_EMAIL"
```

### 3.2 Chạy Load Test

```bash
# Chạy load test với script production
k6 run k6-load-test-production.js

# Hoặc với custom options
k6 run --vus 50 --duration 2m k6-load-test-production.js
```

### 3.3 Monitor trong Grafana

Trong khi K6 đang chạy:

1. **Mở Grafana:** http://localhost:3001
2. **Chọn Dashboard:** "MACha Monitoring Dashboard"
3. **Quan sát metrics:**
   - Request Rate (RPS) - tăng theo VUs
   - Latency p50/p95/p99 - theo dõi latency
   - HTTP Status Codes - đảm bảo chủ yếu 200 OK
   - Error Rate - đảm bảo < 5%

### 3.4 Xem K6 Report

Sau khi test xong, K6 sẽ tạo file `summary.html`:

```bash
# Open report
open summary.html
```

---

## 📊 Bước 4: Phân Tích Kết Quả

### 4.1 So Sánh K6 vs Grafana

| Metric | K6 Output | Grafana Query |
|--------|-----------|---------------|
| **RPS** | `http_reqs` / duration | `rate(http_requests_total[1m])` |
| **p95 Latency** | `http_req_duration{quantile="0.95"}` | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))` |
| **p99 Latency** | `http_req_duration{quantile="0.99"}` | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[1m]))` |
| **Error Rate** | `http_req_failed` | `sum(rate(http_requests_total{status_code=~"4..|5.."}[1m])) / sum(rate(http_requests_total[1m]))` |

### 4.2 Identify Bottlenecks

**Nếu latency cao:**

1. **Check Request Rate trong Grafana:**
   - Nếu RPS cao nhưng latency cao → Database bottleneck
   - Nếu RPS thấp nhưng latency cao → Application bottleneck

2. **Check Latency Percentiles:**
   - p50 tốt nhưng p95/p99 cao → Một số requests chậm
   - Tất cả percentiles đều cao → System overload

3. **Check Error Rate:**
   - Nếu error rate > 5% → Cần điều tra nguyên nhân

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Production Load Test Risks

- ⚠️ **Có thể ảnh hưởng đến users thật** - Chỉ test trong giờ off-peak
- ⚠️ **Có thể tốn resources** - Monitor CPU/RAM trên Railway
- ⚠️ **Có thể trigger rate limiting** - Kiểm tra rate limits trước

### 2. Metrics Endpoint Security

- ✅ **Nên có authentication** cho `/metrics` endpoint trong production
- ✅ **Hoặc whitelist IPs** của Prometheus server
- ✅ **Hoặc sử dụng VPN/tunnel** để secure connection

### 3. Monitoring Stack Location

- **Local monitoring:** Chạy Prometheus/Grafana local, scrape từ production
- **Remote monitoring:** Deploy Prometheus/Grafana trên cloud (Railway, AWS, etc.)

---

## 🔍 Troubleshooting

### Prometheus không scrape được production

**Vấn đề:** Target status = DOWN

**Giải pháp:**
```bash
# 1. Check metrics endpoint accessible
curl https://macha-production-4144.up.railway.app/metrics

# 2. Check Prometheus config
docker exec MACha-prometheus-production cat /etc/prometheus/prometheus.yml

# 3. Check Prometheus logs
docker logs MACha-prometheus-production

# 4. Nếu cần HTTPS với self-signed cert, thêm vào prometheus.yml:
#   tls_config:
#     insecure_skip_verify: true
```

### Grafana không hiển thị data

**Vấn đề:** Dashboard trống, không có data

**Giải pháp:**
1. Check Prometheus datasource trong Grafana:
   - Configuration → Data Sources → Prometheus
   - URL: `http://prometheus:9090` (trong Docker network)
   - Test connection

2. Check Prometheus có data:
   ```bash
   # Query trong Prometheus UI
   http_requests_total
   ```

3. Check dashboard queries:
   - Verify queries sử dụng đúng labels
   - Check time range

### K6 không connect được production

**Vấn đề:** K6 báo connection refused hoặc timeout

**Giải pháp:**
```bash
# 1. Test connection
curl https://macha-production-4144.up.railway.app/

# 2. Check DNS resolution
nslookup macha-production-4144.up.railway.app

# 3. Check firewall/proxy settings
# Nếu đằng sau proxy, config K6:
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
```

---

## 📈 Best Practices

### 1. Load Test Strategy

- ✅ **Start small:** Bắt đầu với 10-20 VUs
- ✅ **Gradual ramp-up:** Tăng dần VUs (50 → 100 → 200)
- ✅ **Monitor continuously:** Theo dõi metrics trong suốt test
- ✅ **Stop if errors:** Dừng ngay nếu error rate > 5%

### 2. Monitoring Best Practices

- ✅ **Set up alerts:** Alert khi latency > threshold
- ✅ **Save dashboards:** Export dashboard configs
- ✅ **Document results:** Ghi lại kết quả test
- ✅ **Compare runs:** So sánh metrics giữa các lần test

### 3. Production Safety

- ✅ **Test off-peak:** Chỉ test trong giờ ít users
- ✅ **Notify team:** Thông báo team trước khi test
- ✅ **Have rollback plan:** Sẵn sàng rollback nếu cần
- ✅ **Monitor resources:** Theo dõi CPU/RAM/Disk trên Railway

---

## ✅ Checklist

Trước khi chạy load test:

- [ ] Production server đang chạy và accessible
- [ ] Metrics endpoint (`/metrics`) accessible
- [ ] Test user credentials đúng
- [ ] Monitoring stack (Prometheus/Grafana) đang chạy
- [ ] Prometheus scrape được production metrics
- [ ] Grafana dashboard hiển thị data
- [ ] K6 installed và chạy được
- [ ] Environment variables đã set đúng

Trong khi chạy load test:

- [ ] Monitor Grafana dashboard
- [ ] Check error rate < 5%
- [ ] Check latency p95/p99
- [ ] Monitor Railway dashboard (CPU/RAM)
- [ ] Sẵn sàng dừng test nếu cần

Sau khi load test:

- [ ] Xem K6 summary report
- [ ] So sánh K6 vs Grafana metrics
- [ ] Document kết quả
- [ ] Identify bottlenecks
- [ ] Plan optimizations

---

## 🎯 Kết Luận

Sau khi setup xong, bạn có thể:

1. ✅ Chạy load test trên production với K6
2. ✅ Monitor metrics real-time trong Grafana
3. ✅ So sánh K6 output với Grafana metrics
4. ✅ Identify bottlenecks và optimize

**Happy Load Testing! 🚀**

