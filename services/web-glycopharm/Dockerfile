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

# Copy workspace packages needed for this service
COPY packages/types/package.json ./packages/types/

# Copy service package.json
COPY services/web-glycopharm/package.json ./services/web-glycopharm/

# Install dependencies
RUN pnpm install --filter glycopharm-web...

# Copy workspace package source
COPY packages/types/ ./packages/types/

# Copy service source
COPY services/web-glycopharm/ ./services/web-glycopharm/

# Build workspace dependencies first
RUN pnpm --filter @o4o/types build

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
