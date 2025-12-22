# ============================================================================
# Cosmetics API - Cloud Run Dockerfile
# Minimal standalone deployment (no monorepo dependencies)
# ============================================================================

FROM node:22-slim

# Install dependencies for Cloud SQL Proxy and native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Cloud Run environment
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "src/main.js"]
