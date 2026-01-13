#!/bin/bash
# Script để cleanup các containers monitoring cũ

set -e

echo "🧹 Cleaning up old monitoring containers..."
echo ""

# Stop và remove các containers cũ
OLD_CONTAINERS=(
    "MACha-prometheus"
    "MACha-grafana"
    "MACha-node-exporter"
    "MACha-prometheus-local"
    "MACha-grafana-local"
    "MACha-node-exporter-local"
    "MACha-prometheus-production"
    "MACha-grafana-production"
)

for container in "${OLD_CONTAINERS[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "  Stopping and removing: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm "$container" 2>/dev/null || true
    fi
done

echo ""
echo "✅ Cleanup completed!"

