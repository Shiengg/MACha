# 📊 MACha Monitoring Setup

Thư mục này chứa cấu hình monitoring cho MACha Server với 2 môi trường: **Local** và **Production**.

## 📁 Cấu Trúc Thư Mục

```
monitoring/
├── local/              # Monitoring cho localhost:8887
│   ├── prometheus.yml
│   ├── prometheus-entrypoint.sh
│   └── docker-compose.yml      # Prometheus + Node Exporter + Grafana
├── production/         # Monitoring cho production server
│   ├── prometheus.yml
│   └── docker-compose.yml      # Prometheus + Grafana
├── k6/                 # K6 Load Testing Scripts
│   ├── local.js        # Load test cho local
│   ├── production.js   # Load test cho production
│   ├── run-local.sh    # Script helper để chạy local test
│   ├── run-production.sh # Script helper để chạy production test
│   └── README.md       # Hướng dẫn K6
├── start-local.sh      # Script helper để start local monitoring
├── start-production.sh # Script helper để start production monitoring
└── README.md          # File này
```

---

## 🏠 Local Development Monitoring

### Mục đích
Monitor backend server chạy trên `localhost:8887` trong quá trình development.

### Cách sử dụng

**Cách 1: Sử dụng script helper (Khuyến nghị)**
```bash
cd monitoring
./start-local.sh
```

**Cách 2: Manual**
1. **Đảm bảo backend đang chạy:**
   ```bash
   # Backend phải chạy trên localhost:8887
   # Và có enable metrics: METRICS_ENABLED=true
   ```

2. **Start monitoring stack:**
   ```bash
   cd monitoring/local
   docker-compose up -d
   ```

3. **Verify services:**
   ```bash
   # Check Prometheus
   curl http://localhost:9090/-/healthy
   
   # Check Grafana
   curl http://localhost:3001/api/health
   ```

4. **Truy cập dashboards:**
   - **Prometheus:** http://localhost:9090
   - **Grafana:** http://localhost:3001
     - Username: `admin`
     - Password: `admin` (hoặc từ env var `GRAFANA_PASSWORD`)

5. **Stop monitoring:**
   ```bash
   # Cách 1: Sử dụng script helper
   cd monitoring
   ./stop-local.sh
   
   # Cách 2: Manual
   cd monitoring/local
   docker-compose down
   ```

6. **Cleanup containers cũ (nếu có conflict port):**
   ```bash
   cd monitoring
   ./cleanup-old-containers.sh
   ```

### Environment Variables (Optional)

```bash
export BACKEND_HOST=host.docker.internal  # Default
export BACKEND_PORT=8887                   # Default
export METRICS_PATH=/metrics              # Default
export PROMETHEUS_PORT=9090               # Default
export GRAFANA_PORT=3001                  # Default
export GRAFANA_USER=admin                 # Default
export GRAFANA_PASSWORD=admin             # Default
```

---

## 🚀 Production Monitoring

### Mục đích
Monitor production server tại `https://macha-production-4144.up.railway.app` khi chạy load test.

### Cách sử dụng

**Cách 1: Sử dụng script helper (Khuyến nghị)**
```bash
cd monitoring
./start-production.sh
```

**Cách 2: Manual**
1. **Đảm bảo production server có metrics endpoint:**
   ```bash
   # Test metrics endpoint
   curl https://macha-production-4144.up.railway.app/metrics
   ```

2. **Start monitoring stack:**
   ```bash
   cd monitoring/production
   docker-compose up -d
   ```

3. **Verify Prometheus scraping:**
   ```bash
   # Check Prometheus targets
   curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="macha-backend-production")'
   
   # Hoặc mở Prometheus UI
   open http://localhost:9090/targets
   ```

4. **Truy cập dashboards:**
   - **Prometheus:** http://localhost:9090
   - **Grafana:** http://localhost:3001
     - Username: `admin`
     - Password: `admin` (hoặc từ env var `GRAFANA_PASSWORD`)

5. **Chạy load test với K6:**
   ```bash
   # K6 script đã được config để test production
   export BASE_URL=https://macha-production-4144.up.railway.app
   export TEST_USER_EMAIL=your-email@example.com
   export TEST_USER_PASSWORD=your-password
   
   k6 run ../k6-load-test.js
   ```

6. **Stop monitoring:**
   ```bash
   # Cách 1: Sử dụng script helper
   cd monitoring
   ./stop-production.sh
   
   # Cách 2: Manual
   cd monitoring/production
   docker-compose down
   ```

7. **Cleanup containers cũ (nếu có conflict port):**
   ```bash
   cd monitoring
   ./cleanup-old-containers.sh
   ```

### Environment Variables (Optional)

```bash
export PROMETHEUS_PORT=9090               # Default
export GRAFANA_PORT=3001                  # Default
export GRAFANA_USER=admin                  # Default
export GRAFANA_PASSWORD=admin              # Default
```

---

## 🔍 Troubleshooting

### Prometheus không scrape được backend

**Local:**
```bash
# Check backend có chạy không
curl http://localhost:8887/metrics

# Check Prometheus logs
docker logs MACha-prometheus-local

# Check Prometheus config
docker exec MACha-prometheus-local cat /etc/prometheus/prometheus.yml
```

**Production:**
```bash
# Check metrics endpoint accessible
curl https://macha-production-4144.up.railway.app/metrics

# Check Prometheus logs
docker logs MACha-prometheus-production

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### Grafana không hiển thị data

1. **Check Prometheus datasource:**
   - Mở Grafana → Configuration → Data Sources → Prometheus
   - URL: `http://prometheus:9090` (trong Docker network)
   - Test connection

2. **Check Prometheus có data:**
   ```bash
   # Query trong Prometheus UI
   http_requests_total
   ```

3. **Check dashboard queries:**
   - Verify queries sử dụng đúng labels
   - Check time range

### Port conflicts

Nếu port 9090 hoặc 3001 đã được sử dụng:

**Giải pháp 1: Cleanup containers cũ (Khuyến nghị)**
```bash
cd monitoring
./cleanup-old-containers.sh
./start-local.sh  # hoặc ./start-production.sh
```

**Giải pháp 2: Dùng port khác**
```bash
# Local
export PROMETHEUS_PORT=9091
export GRAFANA_PORT=3002
cd monitoring/local
docker-compose up -d

# Production
export PROMETHEUS_PORT=9092
export GRAFANA_PORT=3003
cd monitoring/production
docker-compose up -d
```

---

## 🧪 Load Testing với K6

### Local Development

```bash
cd monitoring/k6
./run-local.sh
```

Hoặc manual:
```bash
export BASE_URL=http://localhost:8887
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

k6 run monitoring/k6/local.js
```

### Production

⚠️ **CẢNH BÁO: Chỉ chạy trong giờ off-peak!**

```bash
cd monitoring/k6
./run-production.sh
```

Hoặc manual:
```bash
export BASE_URL=https://macha-production-4144.up.railway.app
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

k6 run monitoring/k6/production.js
```

Xem chi tiết: [K6 Load Testing Guide](k6/README.md)

---

## 📈 Metrics Available

Sau khi setup, bạn có thể monitor các metrics sau trong Grafana:

- **Request Rate (RPS):** `rate(http_requests_total[1m])`
- **Latency p50/p95/p99:** `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))`
- **HTTP Status Codes:** `sum(rate(http_requests_total[1m])) by (status_code)`
- **Error Rate:** `sum(rate(http_requests_total{status_code=~"4..|5.."}[1m])) / sum(rate(http_requests_total[1m]))`
- **Requests In Flight:** `http_requests_in_flight`
- **WebSocket Connections:** `websocket_connections_total`

---

## ✅ Checklist

### Local Setup
- [ ] Backend đang chạy trên localhost:8887
- [ ] Metrics enabled (`METRICS_ENABLED=true`)
- [ ] Monitoring stack started (`./start-local.sh` hoặc `cd local && docker-compose up -d`)
- [ ] Prometheus scrape được backend (check http://localhost:9090/targets)
- [ ] Grafana hiển thị dashboard (http://localhost:3001)
- [ ] Node Exporter đang chạy (check http://localhost:9100/metrics)

### Production Setup
- [ ] Production server accessible
- [ ] Metrics endpoint accessible (`/metrics`)
- [ ] Monitoring stack started (`./start-production.sh` hoặc `cd production && docker-compose up -d`)
- [ ] Prometheus scrape được production (check http://localhost:9090/targets)
- [ ] Grafana hiển thị dashboard (http://localhost:3001)

### K6 Load Testing
- [ ] K6 đã được cài đặt (`k6 version`)
- [ ] Test user credentials đúng
- [ ] Environment variables đã set (BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD)
- [ ] Monitoring stack đang chạy (để monitor trong Grafana)
- [ ] Chạy test: `cd k6 && ./run-local.sh` hoặc `./run-production.sh`

---

## 📚 Tài Liệu Tham Khảo

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [K6 Documentation](https://k6.io/docs/)
- [MACha Monitoring Setup Guide](../docs/MONITORING_SETUP.md)

---

**Happy Monitoring! 🚀**

