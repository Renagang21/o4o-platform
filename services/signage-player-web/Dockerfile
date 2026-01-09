# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/signage-player-web/package.json ./services/signage-player-web/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter signage-player-web

# Copy source files
COPY services/signage-player-web ./services/signage-player-web

# Build
ARG VITE_API_URL=https://api.neture.co.kr
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/services/signage-player-web
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY services/signage-player-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/services/signage-player-web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
