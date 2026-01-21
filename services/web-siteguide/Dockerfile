# SiteGuide Web Dockerfile
# Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-siteguide/Dockerfile .

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy service package.json
COPY services/web-siteguide/package.json ./services/web-siteguide/

# Install dependencies
RUN pnpm install --filter @o4o/web-siteguide...

# Copy service source
COPY services/web-siteguide/ ./services/web-siteguide/

# Build the service
WORKDIR /app/services/web-siteguide
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/services/web-siteguide/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
