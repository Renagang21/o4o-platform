# GlucoseView Web - Cloud Run Dockerfile
# 약사 전용 CGM 데이터 요약 서비스

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies using npm (standalone build)
RUN npm install

# Copy source
COPY . .

# Build-time environment variable for Vite
ARG VITE_API_URL=https://o4o-core-api-117791934476.asia-northeast3.run.app/api
ENV VITE_API_URL=$VITE_API_URL

# Build using npm
RUN npm run build

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
