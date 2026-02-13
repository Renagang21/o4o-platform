# GlucoseView Web - Cloud Run Dockerfile
# 약사 전용 CGM 데이터 요약 서비스
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-glucoseview/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Copy workspace packages needed for this service
COPY packages/operator-core/package.json ./packages/operator-core/

# Copy service package.json
COPY services/web-glucoseview/package.json ./services/web-glucoseview/

# Install dependencies
RUN pnpm install --filter glucoseview-web...

# Copy workspace package source (operator-core exports TS source directly, no build needed)
COPY packages/operator-core/ ./packages/operator-core/

# Copy service source
COPY services/web-glucoseview/ ./services/web-glucoseview/

# Build-time environment variable for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the service
WORKDIR /app/services/web-glucoseview
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-glucoseview/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
