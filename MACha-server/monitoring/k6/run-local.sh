#!/bin/bash
# Script helper để chạy K6 load test cho local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Set default values
BASE_URL="${BASE_URL:-http://localhost:8887}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-trantanyo@gmail.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-Nhon0809}"

echo "🧪 Starting K6 Load Test - Local Development"
echo "📊 Target: $BASE_URL"
echo "👤 User: $TEST_USER_EMAIL"
echo ""

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ K6 is not installed!"
    echo "📦 Install K6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if backend is running
if ! curl -s "$BASE_URL/" > /dev/null 2>&1; then
    echo "❌ ERROR: Cannot connect to $BASE_URL"
    echo ""
    echo "📋 Backend server chưa chạy!"
    echo ""
    echo "💡 Để start backend server:"
    echo "   cd MACha-server"
    echo "   npm run dev    # Development mode"
    echo "   # hoặc"
    echo "   npm start      # Production mode"
    echo ""
    echo "   Đảm bảo server chạy trên port 8887"
    echo "   và có enable metrics: METRICS_ENABLED=true"
    echo ""
    exit 1
fi

echo "✅ Backend server is running"
echo ""

# Run K6 test
export BASE_URL
export TEST_USER_EMAIL
export TEST_USER_PASSWORD

k6 run monitoring/k6/local.js

echo ""
echo "✅ Load test completed!"
echo "📄 Report saved to: summary.html"

