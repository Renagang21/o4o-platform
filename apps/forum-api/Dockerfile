# =============================================================================
# O4O Forum API - Cloud Run Dockerfile
# =============================================================================
# Domain API server for forum functionality.
# Based on app-api-reference template.
# =============================================================================

# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# =============================================================================
# Production stage
# =============================================================================
FROM node:22-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 appapi

# Copy package.json for production deps
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R appapi:nodejs /app

# Switch to non-root user
USER appapi

# Expose Cloud Run port
EXPOSE 8080

# Health check (Cloud Run uses HTTP probes)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start
CMD ["node", "dist/main.js"]
