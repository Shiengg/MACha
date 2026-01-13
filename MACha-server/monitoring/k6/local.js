import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

/**
 * K6 Load Testing Script cho MACha Server - Local Development
 * 
 * Mục tiêu:
 * - Test 4 endpoint chính: GET posts, GET campaigns, GET events, GET recommendations
 * - Test HTTP API với ramp-up users (50 → 200 VUs)
 * - Đo RPS, Latency, Error rate
 * - So sánh với metrics trong Grafana
 * 
 * Cách chạy:
 * 1. Cài đặt K6: https://k6.io/docs/getting-started/installation/
 * 2. Set environment variables:
 *    export BASE_URL=http://localhost:8887
 *    export TEST_USER_EMAIL=trantanyo@gmail.com
 *    export TEST_USER_PASSWORD=Nhon0809
 * 3. Chạy: k6 run monitoring/k6/local.js
 * 
 * Hoặc sử dụng script helper:
 * ./monitoring/k6/run-local.sh
 */

// Custom metrics
const errorRate = new Rate('errors');
const httpReqDuration = new Trend('http_req_duration_custom');

// Configuration
export const options = {
    stages: [
        // Mỗi bậc giữ 2 phút để đọc ổn định trên Grafana:
        //  - Ghi lại: RPS tổng, latency p95/p99, error rate, CPU/RAM/Load
        { duration: '2m', target: 50 },   // Bậc 1: 50 VUs
        { duration: '2m', target: 100 },  // Bậc 2: 100 VUs
        { duration: '2m', target: 200 },  // Bậc 3: 200 VUs
    ],
    thresholds: {
        // Chỉ giữ error rate threshold - quan trọng nhất
        'http_req_failed': ['rate<0.05'],                   // Error rate < 5%
        'errors': ['rate<0.05'],
        
        // Thresholds thực tế dựa trên metrics hiện tại
        // Mục tiêu: p95 < 2s, p99 < 5s
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8887';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'trantanyo@gmail.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'Nhon0809';

// Helper: login một lần và trả về JWT token
function loginAndGetToken() {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const ok = check(loginRes, {
        'setup login status is 200': (r) => r.status === 200,
        'setup login response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!ok) {
        throw new Error(`Login failed in setup. Status: ${loginRes.status}`);
    }

    const cookies = loginRes.cookies;
    if (cookies && cookies.jwt && cookies.jwt.length > 0) {
        return cookies.jwt[0].value;
    }
    const setCookie = loginRes.headers['Set-Cookie'];
    if (setCookie) {
        const jwtMatch = setCookie.match(/jwt=([^;]+)/);
        if (jwtMatch) {
            return jwtMatch[1];
        }
    }
    throw new Error('Could not extract JWT token in setup');
}

// K6 setup: chạy một lần trước khi scenarios, login và chia token cho các VU
export function setup() {
    const token = loginAndGetToken();
    return { token };
}

// Helper để tạo auth headers
function getAuthHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`,
        'Cookie': `jwt=${token}`,
    };
}

// Test HTTP endpoints – chỉ test 4 endpoint chính
export default function (data) {
    const token = data.token;
    const authHeaders = getAuthHeaders(token);

    // 1. GET /api/posts (get all posts)
    const postsRes = http.get(`${BASE_URL}/api/posts`, { headers: authHeaders });
    check(postsRes, {
        'posts status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    httpReqDuration.add(postsRes.timings.duration);
    sleep(0.3);

    // 2. GET /api/campaigns (get all campaigns)
    const campaignsRes = http.get(`${BASE_URL}/api/campaigns`, { headers: authHeaders });
    check(campaignsRes, {
        'campaigns status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    httpReqDuration.add(campaignsRes.timings.duration);
    sleep(0.3);

    // 3. GET /api/events (get all events)
    const eventsRes = http.get(`${BASE_URL}/api/events`, { headers: authHeaders });
    check(eventsRes, {
        'events status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    httpReqDuration.add(eventsRes.timings.duration);
    sleep(0.3);

    // 4. GET /api/recommendations (get campaign recommended)
    const recoRes = http.get(`${BASE_URL}/api/recommendations`, { headers: authHeaders });
    check(recoRes, {
        'recommendations status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
    httpReqDuration.add(recoRes.timings.duration);
    sleep(0.3);
}

// Generate HTML report
export function handleSummary(data) {
    return {
        'summary.html': htmlReport(data),
    };
}

