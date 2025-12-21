# ============================================================================
# O4O Platform API Server - Cloud Run Dockerfile
# Optimized for pnpm monorepo with native dependencies (bcrypt, sharp)
# ============================================================================

# Use slim instead of alpine for native module compatibility
FROM node:22-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace configuration (for dependency caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.json tsconfig.base.json tsconfig.packages.json ./

# Copy all package.json files first (for better cache)
COPY apps/api-server/package.json ./apps/api-server/
COPY apps/api-server/tsconfig.json ./apps/api-server/
COPY apps/api-server/tsconfig.build.json ./apps/api-server/
COPY packages/ ./packages/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api-server/src/ ./apps/api-server/src/

# Build packages and api-server
RUN pnpm run build:packages || echo "Some packages failed to build, continuing..."
RUN pnpm run build:api

# ============================================================================
# Production stage - minimal runtime
# ============================================================================
FROM node:22-slim AS production

# Install runtime dependencies only (for sharp)
RUN apt-get update && apt-get install -y \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY tsconfig.json tsconfig.base.json tsconfig.packages.json ./

# Copy package.json files and built dist directories
COPY --from=builder /app/apps/api-server/package.json ./apps/api-server/
COPY --from=builder /app/apps/api-server/dist/ ./apps/api-server/dist/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/apps/api-server/node_modules/ ./apps/api-server/node_modules/

# Copy public folder for uploads/static files (optional)
COPY public/ ./public/ 2>/dev/null || true

# Cloud Run environment
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Working directory for api-server
WORKDIR /app/apps/api-server

# Start the server
CMD ["node", "--max-old-space-size=1024", "dist/main.js"]
