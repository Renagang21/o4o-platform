# Account Center Web - Cloud Run Dockerfile
# O4O 플랫폼 계정 센터 (서비스 이동 허브)
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-account/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.packages.json ./

# Copy all workspace packages (pnpm reads lockfile and expects all
# packages/* entries to exist for workspace graph resolution)
COPY packages/ ./packages/

# Copy service
COPY services/web-account/ ./services/web-account/

# Install dependencies
RUN pnpm install --filter account-web...

# Build-time environment variable for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build workspace dependencies
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build

# Build the service (vite only — tsc는 CI/로컬에서 별도 수행)
WORKDIR /app/services/web-account
RUN npx vite build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-account/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
