#!/bin/sh
set -e

# Expand environment variables in prometheus.yml template using sed
sed -e "s|\${BACKEND_HOST}|${BACKEND_HOST:-host.docker.internal}|g" \
    -e "s|\${BACKEND_PORT}|${BACKEND_PORT:-5000}|g" \
    -e "s|\${METRICS_PATH}|${METRICS_PATH:-/metrics}|g" \
    -e "s|\${NODE_EXPORTER_HOST}|${NODE_EXPORTER_HOST:-node-exporter}|g" \
    -e "s|\${NODE_EXPORTER_PORT}|${NODE_EXPORTER_PORT:-9100}|g" \
    -e "s|\${ENVIRONMENT}|${ENVIRONMENT:-development}|g" \
    /etc/prometheus/prometheus.yml.template > /etc/prometheus/prometheus.yml

# Start Prometheus with the expanded config
exec /bin/prometheus "$@"

