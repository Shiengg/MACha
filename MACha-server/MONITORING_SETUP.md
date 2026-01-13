# MACha Monitoring Setup Guide

Hướng dẫn thiết lập hệ thống monitoring end-to-end cho MACha Server.

## 📋 Mục lục

1. [Yêu cầu](#yêu-cầu)
2. [Cài đặt](#cài-đặt)
3. [Cấu hình](#cấu-hình)
4. [Chạy hệ thống](#chạy-hệ-thống)
5. [Truy cập Dashboards](#truy-cập-dashboards)
6. [Load Testing với K6](#load-testing-với-k6)
7. [Phân tích Bottleneck](#phân-tích-bottleneck)

## 🎯 Yêu cầu

- Docker & Docker Compose
- Node.js 18+ (cho backend)
- K6 (cho load testing) - [Installation Guide](https://k6.io/docs/getting-started/installation/)

## 📦 Cài đặt

### 1. Backend Metrics

Metrics middleware đã được tích hợp vào `server.js`. Chỉ cần enable trong `.env`:

```bash
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

### 2. Cài đặt Dependencies

```bash
cd MACha-server
npm install
```

`prom-client` đã được cài đặt sẵn.

### 3. Cấu hình Environment Variables

Tạo hoặc cập nhật file `.env`:

```bash
# Backend
PORT=5000
METRICS_ENABLED=true
METRICS_PATH=/metrics

# Monitoring Stack (optional - có thể override trong docker-compose)
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
NODE_EXPORTER_PORT=9100
BACKEND_HOST=host.docker.internal
BACKEND_PORT=5000
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

## 🚀 Chạy hệ thống

### Bước 1: Start Backend Server

```bash
# Development
npm run dev

# Production
npm start
```

Verify metrics endpoint:
```bash
curl http://localhost:5000/metrics
```

Bạn sẽ thấy các metrics Prometheus format:
- `http_requests_total`
- `http_request_duration_seconds`
- `http_requests_in_flight`
- `websocket_connections_total`

### Bước 2: Start Monitoring Stack

```bash
# Start MongoDB và Redis (nếu chưa chạy)
docker-compose up -d

# Start Monitoring Stack (Prometheus, Node Exporter, Grafana)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Bước 3: Verify Services

```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Node Exporter
curl http://localhost:9100/metrics

# Check Grafana
curl http://localhost:3001/api/health
```

## 📊 Truy cập Dashboards

### Prometheus UI
- URL: http://localhost:9090
- Query examples:
  - `rate(http_requests_total[1m])` - Request rate
  - `histogram_quantile(0.95, http_request_duration_seconds_bucket)` - p95 latency
  - `websocket_connections_total` - Active WebSocket connections

### Grafana Dashboard
- URL: http://localhost:3001
- Username: `admin` (hoặc từ `GRAFANA_USER`)
- Password: `admin` (hoặc từ `GRAFANA_PASSWORD`)

Dashboard "MACha Monitoring Dashboard" sẽ tự động được import từ `grafana/dashboards/macha-monitoring.json`.

### Dashboard Panels

1. **Request Rate (RPS)**: Số requests mỗi giây theo method và route
2. **HTTP Status Codes**: Phân bố status codes (2xx, 4xx, 5xx)
3. **Latency p50/p95/p99**: Latency percentiles để phát hiện slow requests
4. **Error Rate**: Tỷ lệ lỗi (4xx + 5xx)
5. **Active WebSocket Connections**: Số connections đang active - phát hiện connection leak
6. **HTTP Requests In Flight**: Requests đang xử lý - phát hiện overload
7. **CPU Usage**: CPU usage % - phát hiện CPU bottleneck
8. **Memory Usage**: Memory usage - phát hiện memory leak
9. **Load Average**: System load - phát hiện system overload

## 🧪 Load Testing với K6

### Cài đặt K6

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

### Chạy Load Test

```bash
# Set environment variables
export BASE_URL=http://localhost:5000
export TEST_USER_EMAIL=your-test-email@example.com
export TEST_USER_PASSWORD=your-password

# Chạy load test
k6 run k6-load-test.js

# Hoặc với custom options
k6 run --vus 50 --duration 2m k6-load-test.js
```

### K6 Test Scenarios

Script sẽ test:
1. **Health Check** (`/health`) - Public endpoint
2. **Login** (`/api/auth/login`) - Authentication
3. **Get Current User** (`/api/auth/me`) - Authenticated endpoint
4. **Get Posts** (`/api/posts`) - Authenticated endpoint với data

Ramp-up pattern:
- 0 → 10 users (30s)
- 10 users (1m)
- 10 → 50 users (30s)
- 50 users (1m)
- 50 → 200 users (30s)
- 200 users (2m)
- 200 → 0 users (30s)

### WebSocket Testing

Để test WebSocket connections:

```bash
# Tạo script riêng hoặc modify k6-load-test.js
k6 run --iterations 10 k6-load-test.js
```

## 🔍 Phân tích Bottleneck

### Khi tải tăng, kiểm tra:

#### 1. Latency tăng do App hay Infra?

**Kiểm tra trong Grafana:**
- **App bottleneck**: `http_request_duration_seconds` tăng nhưng CPU/Memory ổn định
  - → Optimize code, database queries, cache
- **Infra bottleneck**: CPU/Memory/Load tăng cùng với latency
  - → Scale horizontal (thêm instances) hoặc vertical (tăng resources)

**Metrics để xem:**
```promql
# App latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))

# CPU usage
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100
```

#### 2. CPU/RAM có chạm ngưỡng không?

**Ngưỡng cảnh báo:**
- CPU > 80%: Cần scale
- Memory > 85%: Cần scale hoặc optimize
- Load Average > số CPU cores: System overload

**Giải pháp:**
- **Horizontal Scaling**: Thêm server instances, dùng load balancer
- **Vertical Scaling**: Tăng CPU/RAM cho server
- **Code Optimization**: Optimize database queries, thêm caching

#### 3. WebSocket có bị leak connection không?

**Kiểm tra:**
```promql
websocket_connections_total
```

**Dấu hiệu leak:**
- Connections tăng liên tục không giảm
- Connections > số users thực tế

**Giải pháp:**
- Kiểm tra `socket.on('disconnect')` có được gọi đúng không
- Kiểm tra timeout settings trong Socket.IO config
- Review code cleanup khi user disconnect

#### 4. Error Rate cao?

**Kiểm tra:**
```promql
sum(rate(http_requests_total{status_code=~"4..|5.."}[1m])) by (status_code)
```

**Phân tích:**
- **4xx (Client errors)**: Check request validation, authentication
- **5xx (Server errors)**: Check logs, database connections, memory

### Kết luận Bottleneck

Dựa trên metrics, xác định:

1. **Bottleneck ở đâu?**
   - App layer: Code, database queries
   - Infrastructure: CPU, Memory, Network
   - External services: Database, Redis, Third-party APIs

2. **Gợi ý Scale:**

   **Horizontal Scaling (Recommended):**
   - Thêm nhiều Node.js instances
   - Dùng PM2 cluster mode hoặc Docker Swarm/Kubernetes
   - Load balancer (Nginx, HAProxy)

   **Vertical Scaling:**
   - Tăng CPU cores
   - Tăng RAM
   - SSD storage

   **Code Optimization:**
   - Database indexing
   - Query optimization
   - Caching (Redis)
   - Connection pooling
   - Async/await optimization

## 📈 So sánh K6 với Grafana

Sau khi chạy K6 load test:

1. **RPS**: So sánh `rate(http_requests_total[1m])` trong Grafana với K6 output
2. **Latency**: So sánh p95/p99 trong Grafana với K6 `http_req_duration`
3. **Error Rate**: So sánh error rate trong Grafana với K6 `http_req_failed`

K6 output sẽ hiển thị:
```
http_req_duration.........: avg=123ms min=45ms med=98ms max=1.2s p(95)=456ms p(99)=890ms
http_req_failed...........: 0.50% 
```

So sánh với Grafana để verify metrics đúng.

## 🛠️ Troubleshooting

### Metrics endpoint không hoạt động

```bash
# Check METRICS_ENABLED trong .env
echo $METRICS_ENABLED

# Check server logs
# Should see: "📊 Metrics enabled - Prometheus metrics available at /metrics"
```

### Prometheus không scrape được backend

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check backend có accessible từ Prometheus container không
docker exec MACha-prometheus wget -O- http://host.docker.internal:5000/metrics
```

### Grafana không hiển thị data

1. Check Prometheus datasource trong Grafana: Configuration → Data Sources → Prometheus
2. Check Prometheus có data không: http://localhost:9090/graph
3. Check dashboard queries có đúng không

### Node Exporter không hoạt động

```bash
# Check Node Exporter metrics
curl http://localhost:9100/metrics | grep node_cpu

# Check Prometheus scrape config
docker exec MACha-prometheus cat /etc/prometheus/prometheus.yml
```

## 📚 Tài liệu tham khảo

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [K6 Documentation](https://k6.io/docs/)
- [Node Exporter](https://github.com/prometheus/node_exporter)

## ✅ Checklist

- [ ] Backend metrics enabled (`METRICS_ENABLED=true`)
- [ ] `/metrics` endpoint accessible
- [ ] Prometheus running và scrape được backend
- [ ] Node Exporter running và scrape được
- [ ] Grafana running và có dashboard
- [ ] K6 installed và chạy được load test
- [ ] Metrics hiển thị đúng trong Grafana
- [ ] So sánh K6 output với Grafana metrics

