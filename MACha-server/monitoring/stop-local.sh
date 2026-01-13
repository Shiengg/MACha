#!/bin/bash
# Script helper để stop monitoring cho local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/local"

echo "🛑 Stopping Local Monitoring Stack..."
echo ""

docker-compose down

echo ""
echo "✅ Monitoring stack stopped!"

