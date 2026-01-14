# MACha Worker Dockerfile
# Background worker for processing email jobs with RabbitMQ and Resend

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose no ports (worker doesn't expose HTTP)
# EXPOSE nothing

# Health check (optional, can check process status)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Start worker
CMD ["node", "src/index.js"]

