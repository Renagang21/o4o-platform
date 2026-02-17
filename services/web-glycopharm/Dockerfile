# Phase 1 - Service Web Server Dockerfile
# Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-glycopharm/Dockerfile .

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
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/
COPY packages/operator-core/package.json ./packages/operator-core/
COPY packages/hub-core/package.json ./packages/hub-core/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/admin-ux-core/package.json ./packages/admin-ux-core/

# Copy service package.json
COPY services/web-glycopharm/package.json ./services/web-glycopharm/

# Install dependencies
RUN pnpm install --filter glycopharm-web...

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/utils/ ./packages/utils/
COPY packages/ui/ ./packages/ui/
COPY packages/operator-core/ ./packages/operator-core/
COPY packages/hub-core/ ./packages/hub-core/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/admin-ux-core/ ./packages/admin-ux-core/

# Copy service source
COPY services/web-glycopharm/ ./services/web-glycopharm/

# Build workspace dependencies first
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/utils build

# Build-time environment variable for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the service
WORKDIR /app/services/web-glycopharm
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-glycopharm/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
