# ✅ Checklist Trước Khi Deploy

## 🔍 Pre-Deployment Checklist

### 1. Code Changes
- [x] ✅ Monitoring files đã được tổ chức vào `monitoring/`
- [x] ✅ Có 2 bản: local và production
- [x] ✅ K6 scripts đã được tổ chức vào `monitoring/k6/`
- [x] ✅ Scripts helpers đã được tạo và có executable permissions
- [x] ✅ Prometheus entrypoint script đã được sửa để expand env vars đúng

### 2. Production Server Configuration

**⚠️ QUAN TRỌNG: Cần set environment variable trên Railway:**

```bash
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

**Cách set trên Railway:**
1. Vào Railway dashboard
2. Chọn project → Service
3. Vào tab "Variables"
4. Thêm:
   - `METRICS_ENABLED` = `true`
   - `METRICS_PATH` = `/metrics`

### 3. Verify Production Metrics Endpoint

Sau khi deploy, verify metrics endpoint:

```bash
# Test metrics endpoint
curl https://macha-production-4144.up.railway.app/metrics

# Kỳ vọng: Thấy Prometheus metrics format
# Nếu không có: Check METRICS_ENABLED=true trong Railway
```

### 4. Files Cần Commit

Các file sau đã sẵn sàng để commit:

```
monitoring/
├── local/
│   ├── prometheus.yml
│   ├── prometheus-entrypoint.sh
│   └── docker-compose.yml
├── production/
│   ├── prometheus.yml
│   └── docker-compose.yml
├── k6/
│   ├── local.js
│   ├── production.js
│   ├── run-local.sh
│   ├── run-production.sh
│   └── README.md
├── start-local.sh
├── start-production.sh
├── stop-local.sh
├── stop-production.sh
├── cleanup-old-containers.sh
└── README.md
```

### 5. Files Đã Xóa (Không cần commit)

Các file cũ đã được xóa:
- ❌ `prometheus.yml` (root) → ✅ `monitoring/local/prometheus.yml`
- ❌ `prometheus-production.yml` (root) → ✅ `monitoring/production/prometheus.yml`
- ❌ `prometheus-entrypoint.sh` (root) → ✅ `monitoring/local/prometheus-entrypoint.sh`
- ❌ `docker-compose.monitoring.yml` (root) → ✅ `monitoring/local/docker-compose.yml`
- ❌ `docker-compose.production-monitoring.yml` (root) → ✅ `monitoring/production/docker-compose.yml`
- ❌ `k6-load-test.js` (root) → ✅ `monitoring/k6/local.js` và `production.js`

### 6. Git Commands

```bash
# Check status
git status

# Add monitoring files
git add monitoring/

# Commit
git commit -m "feat: organize monitoring setup with local and production configs

- Organize monitoring files into monitoring/ directory
- Separate local and production configurations
- Add K6 load testing scripts with helpers
- Fix Prometheus env var expansion
- Add cleanup and stop scripts"

# Push to main
git push origin main
```

### 7. Sau Khi Deploy

1. **Verify Production Metrics:**
   ```bash
   curl https://macha-production-4144.up.railway.app/metrics
   ```

2. **Test Monitoring Stack (Local):**
   ```bash
   cd monitoring
   ./start-production.sh
   ```

3. **Verify Prometheus Scraping:**
   - Mở http://localhost:9090/targets
   - Check `macha-backend-production` target = UP

4. **Test Load Test:**
   ```bash
   cd monitoring/k6
   ./run-production.sh
   ```

## ⚠️ Lưu Ý Quan Trọng

1. **Metrics Endpoint Security:**
   - Hiện tại `/metrics` endpoint không có authentication
   - Có thể thêm authentication sau nếu cần
   - Hoặc whitelist IPs của Prometheus server

2. **Production Load Test:**
   - ⚠️ Chỉ chạy trong giờ off-peak
   - Monitor metrics trong Grafana
   - Sẵn sàng dừng test nếu có vấn đề

3. **Monitoring Stack:**
   - Monitoring stack (Prometheus/Grafana) chạy LOCAL
   - Chỉ scrape metrics từ production server
   - Không deploy monitoring stack lên Railway

## ✅ Ready to Deploy!

Nếu tất cả checklist trên đã hoàn thành, bạn có thể:

```bash
git add monitoring/
git commit -m "feat: organize monitoring setup"
git push origin main
```

Sau đó set `METRICS_ENABLED=true` trên Railway và verify metrics endpoint.

