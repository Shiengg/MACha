#!/bin/bash
# Script helper để start monitoring cho production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for old containers using ports 9090 or 3001
if docker ps --format '{{.Names}}' | grep -qE "MACha-prometheus$|MACha-grafana$"; then
    echo "⚠️  Found old monitoring containers running!"
    echo "   Stopping old containers..."
    cd "$SCRIPT_DIR"
    ./cleanup-old-containers.sh
    echo ""
fi

cd "$SCRIPT_DIR/production"

echo "🚀 Starting Production Monitoring Stack..."
echo "📊 Backend: https://macha-production-4144.up.railway.app"
echo ""

docker-compose up -d

echo ""
echo "✅ Monitoring stack started!"
echo ""
echo "📊 Prometheus: http://localhost:9090"
echo "📈 Grafana: http://localhost:3001 (admin/admin)"
echo ""
echo "To stop: cd monitoring/production && docker-compose down"

