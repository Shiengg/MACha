import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Prometheus Metrics Registry
 * Central registry để quản lý tất cả metrics
 */
export const register = new Registry();

// Thêm default metrics (CPU, memory, event loop, etc.)
// import { collectDefaultMetrics } from 'prom-client';
// collectDefaultMetrics({ register });

/**
 * HTTP Request Counter
 * Đếm tổng số HTTP requests theo method, route, và status code
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

/**
 * HTTP Request Duration Histogram
 * Đo thời gian xử lý request (latency) theo method và route
 * Buckets: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 seconds
 * Labels: method, route, status_code
 */
export const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
});

/**
 * HTTP Requests In Flight Gauge
 * Đếm số requests đang được xử lý tại một thời điểm
 * Giúp phát hiện overload
 */
export const httpRequestsInFlight = new Gauge({
    name: 'http_requests_in_flight',
    help: 'Number of HTTP requests currently being processed',
    registers: [register]
});

/**
 * WebSocket Connections Gauge
 * Đếm số WebSocket connections đang active
 * Giúp phát hiện connection leak hoặc overload
 */
export const websocketConnections = new Gauge({
    name: 'websocket_connections_total',
    help: 'Total number of active WebSocket connections',
    registers: [register]
});

/**
 * Normalize route path để tránh cardinality explosion
 * Ví dụ: /api/users/123 -> /api/users/:id
 */
function normalizeRoute(path) {
    if (!path || typeof path !== 'string') return 'unknown';
    
    try {
        // Loại bỏ query string
        const pathWithoutQuery = path.split('?')[0];
        
        // Normalize các dynamic segments theo thứ tự ưu tiên
        let normalized = pathWithoutQuery;
        
        // MongoDB ObjectId (24 hex chars)
        normalized = normalized.replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id');
        
        // UUID (36 chars với dashes)
        normalized = normalized.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?=\/|$)/gi, '/:id');
        
        // Numeric IDs (số nguyên)
        normalized = normalized.replace(/\/\d+(?=\/|$)/g, '/:id');
        
        // Last segment nếu không match pattern trên (fallback)
        // Chỉ replace nếu chưa có :id ở cuối
        if (!normalized.endsWith('/:id') && normalized !== '/') {
            normalized = normalized.replace(/\/[^\/]+$/, '/:id');
        }
        
        return normalized || 'root';
    } catch (error) {
        console.error('Error normalizing route:', error);
        return 'unknown';
    }
}

/**
 * Metrics Middleware
 * Tự động thu thập metrics cho mọi HTTP request
 */
export const metricsMiddleware = (req, res, next) => {
    // Bỏ qua metrics endpoint để tránh loop
    const metricsPath = process.env.METRICS_PATH || '/metrics';
    if (req.path === metricsPath) {
        return next();
    }

    try {
        const startTime = Date.now();
        const method = req.method || 'UNKNOWN';
        const route = normalizeRoute(req.route?.path || req.path);

        // Tăng số requests đang xử lý
        httpRequestsInFlight.inc();

        // Override res.end để capture status code khi response hoàn thành
        const originalEnd = res.end;
        res.end = function(...args) {
            try {
                const duration = Math.max(0, (Date.now() - startTime) / 1000); // Convert to seconds, ensure non-negative
                const statusCode = res.statusCode || 200;

                // Record metrics với error handling
                try {
                    httpRequestsTotal.inc({
                        method: String(method),
                        route: String(route),
                        status_code: String(statusCode)
                    });

                    httpRequestDurationSeconds.observe({
                        method: String(method),
                        route: String(route),
                        status_code: String(statusCode)
                    }, duration);
                } catch (metricError) {
                    // Log nhưng không crash request
                    console.error('Error recording metrics:', metricError);
                }

                // Giảm số requests đang xử lý
                httpRequestsInFlight.dec();
            } catch (error) {
                // Ensure in-flight counter is decremented even on error
                httpRequestsInFlight.dec();
                console.error('Error in metrics middleware end handler:', error);
            }

            // Call original end
            originalEnd.apply(this, args);
        };

        next();
    } catch (error) {
        // Nếu có lỗi trong middleware, vẫn cho request đi qua
        console.error('Error in metrics middleware:', error);
        next();
    }
};

/**
 * Update WebSocket connections count
 * Gọi từ server.js khi có connection/disconnection
 */
export function updateWebSocketConnections(count) {
    websocketConnections.set(count);
}

