# Phase 1 - Service Web Server Dockerfile
# Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-neture/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

# Copy workspace packages needed for this service
COPY packages/types/package.json ./packages/types/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/content-editor/package.json ./packages/content-editor/
# Note: forum-core and organization-core are backend packages, copied but not built
COPY packages/organization-core/package.json ./packages/organization-core/
COPY packages/forum-core/package.json ./packages/forum-core/

# Copy service package.json
COPY services/web-neture/package.json ./services/web-neture/

# Install dependencies
RUN pnpm install --filter @o4o/web-neture...

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/organization-core/ ./packages/organization-core/
COPY packages/forum-core/ ./packages/forum-core/

# Copy service source
COPY services/web-neture/ ./services/web-neture/

# Build workspace dependencies (only frontend packages)
# Note: forum-core and organization-core are backend packages, not built here
# web-neture imports utils directly from source
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/content-editor build

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ARG VITE_USE_REAL_FORUM_API=true
ARG VITE_API_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_REAL_FORUM_API=$VITE_USE_REAL_FORUM_API
ENV VITE_API_URL=$VITE_API_URL

# Build the service
WORKDIR /app/services/web-neture
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-neture/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
