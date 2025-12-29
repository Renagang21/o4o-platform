# Phase 1 - Service Web Server Dockerfile
# Cloud Run 호환 정적 파일 서빙

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Build-time environment variable for Vite
ARG VITE_API_BASE_URL=https://o4o-core-api-117791934476.asia-northeast3.run.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built files
COPY --from=builder /app/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080

EXPOSE 8080

# Serve static files
CMD ["serve", "-s", "dist", "-l", "8080"]
