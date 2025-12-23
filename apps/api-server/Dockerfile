# =============================================================================
# O4O API Server - Cloud Run Dockerfile
# =============================================================================
# Multi-stage build optimized for Cloud Run deployment
#
# Strategy:
# - Stage 1: Install only external runtime dependencies (no devDependencies)
# - Stage 2: Copy bundled app (dist/main.js) + production node_modules
#
# Prerequisites:
# - dist/main.js must be built locally via `pnpm run build:api`
# - This Dockerfile does NOT build the bundle (build happens in CI or locally)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies Installation
# -----------------------------------------------------------------------------
FROM node:22-slim AS deps

WORKDIR /app

# Copy the production package.json (external dependencies only)
# Using minimal version for Cloud Run deployment validation
COPY package.production-minimal.json ./package.json

# Install production dependencies only
# Using npm for simplicity in Docker (no pnpm workspace complexity)
RUN npm install --omit=dev --ignore-scripts \
    && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 o4oapi

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the bundled application (minimal version for Cloud Run validation)
COPY dist/main-minimal.js ./dist/main.js
COPY dist/main-minimal.js.map ./dist/main.js.map

# Set ownership
RUN chown -R o4oapi:nodejs /app

# Switch to non-root user
USER o4oapi

# Expose Cloud Run port
EXPOSE 8080

# Health check (Cloud Run uses HTTP health checks)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "--max-old-space-size=512", "dist/main.js"]
