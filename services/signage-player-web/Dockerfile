# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
# WO-O4O-SIGNAGE-PLAYER-WEB-DEPLOYMENT-ADOPTION-AND-PRODUCTION-SMOKE-V1
# `corepack prepare pnpm@latest` 는 node:20-alpine 에서 pnpm 11(node>=22 요구) 을 끌어와
# ERR_UNKNOWN_BUILTIN_MODULE 로 빌드가 죽는다. 배포되는 다른 7개 web service Dockerfile 과
# 동일한 `npm install -g pnpm` 패턴으로 통일한다.
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.packages.json ./
COPY packages/content-editor/package.json ./packages/content-editor/
COPY services/signage-player-web/package.json ./services/signage-player-web/

# Install dependencies
# 배포되는 다른 web service Dockerfile 과 동일한 형태:
#   `--filter <svc>...` (dependency 포함) — 이게 없으면 workspace 의존 패키지의
#   devDependency(tsup 등) 가 설치되지 않아 다음 build step 이 실패한다.
RUN pnpm install --filter signage-player-web... --ignore-scripts

# Copy source files
COPY packages/content-editor/ ./packages/content-editor/
COPY services/signage-player-web ./services/signage-player-web

# Build workspace dependencies
RUN pnpm --filter @o4o/content-editor build

# Build
ARG VITE_API_URL=https://api.neture.co.kr
ENV VITE_API_URL=$VITE_API_URL

# Build the service (vite only — tsc는 CI/로컬에서 별도 수정)
WORKDIR /app/services/signage-player-web
RUN npx vite build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY services/signage-player-web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/services/signage-player-web/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
