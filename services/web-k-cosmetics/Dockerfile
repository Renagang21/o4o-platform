# Phase 1 - Service Web Server Dockerfile
# Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-k-cosmetics/Dockerfile .

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
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/operator-core/package.json ./packages/operator-core/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/store-asset-policy-core/package.json ./packages/store-asset-policy-core/
COPY packages/store-ui-core/package.json ./packages/store-ui-core/
COPY packages/o4o-ai-components/package.json ./packages/o4o-ai-components/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/account-ui/package.json ./packages/account-ui/
COPY packages/content-editor/package.json ./packages/content-editor/

# Copy service package.json
COPY services/web-k-cosmetics/package.json ./services/web-k-cosmetics/

# Install dependencies
RUN pnpm install --filter @o4o/web-k-cosmetics...

# Copy workspace package source
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/types/ ./packages/types/
COPY packages/ui/ ./packages/ui/
COPY packages/operator-core/ ./packages/operator-core/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/store-asset-policy-core/ ./packages/store-asset-policy-core/
COPY packages/store-ui-core/ ./packages/store-ui-core/
COPY packages/o4o-ai-components/ ./packages/o4o-ai-components/
COPY packages/error-handling/ ./packages/error-handling/
COPY packages/account-ui/ ./packages/account-ui/
COPY packages/content-editor/ ./packages/content-editor/

# Copy service source
COPY services/web-k-cosmetics/ ./services/web-k-cosmetics/

# Build workspace dependencies first
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/account-ui build
RUN pnpm --filter @o4o/content-editor build

# Build-time environment variable for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the service (vite only — tsc는 CI/로컬에서 별도 수행)
WORKDIR /app/services/web-k-cosmetics
RUN npx vite build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-k-cosmetics/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
