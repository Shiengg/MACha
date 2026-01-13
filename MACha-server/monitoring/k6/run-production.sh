#!/bin/bash
# Script helper để chạy K6 load test cho production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

# Set default values
BASE_URL="${BASE_URL:-https://macha-production-4144.up.railway.app}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-trantanyo@gmail.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-Nhon0809}"

echo "⚠️  ⚠️  ⚠️  PRODUCTION LOAD TEST ⚠️  ⚠️  ⚠️"
echo ""
echo "🧪 Starting K6 Load Test - PRODUCTION"
echo "📊 Target: $BASE_URL"
echo "👤 User: $TEST_USER_EMAIL"
echo ""
echo "⚠️  WARNING: This will test PRODUCTION server!"
echo "   - Only run during off-peak hours"
echo "   - Monitor metrics in Grafana"
echo "   - Be ready to stop if issues occur"
echo ""

# Confirmation prompt
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Load test cancelled"
    exit 0
fi

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ K6 is not installed!"
    echo "📦 Install K6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if production is accessible
if ! curl -s "$BASE_URL/" > /dev/null 2>&1; then
    echo "❌ Cannot connect to $BASE_URL"
    echo "   Check if production server is running"
    exit 1
fi

# Run K6 test
export BASE_URL
export TEST_USER_EMAIL
export TEST_USER_PASSWORD

echo ""
echo "🚀 Starting load test..."
echo ""

k6 run monitoring/k6/production.js

echo ""
echo "✅ Load test completed!"
echo "📄 Report saved to: summary.html"

