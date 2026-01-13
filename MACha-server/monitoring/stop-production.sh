#!/bin/bash
# Script helper để stop monitoring cho production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/production"

echo "🛑 Stopping Production Monitoring Stack..."
echo ""

docker-compose down

echo ""
echo "✅ Monitoring stack stopped!"

