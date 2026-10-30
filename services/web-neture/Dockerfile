# syntax=docker/dockerfile:1
# Phase 1 - Service Web Server Dockerfile
# Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
# docker build -f services/web-neture/Dockerfile .

# Build stage
FROM node:22.18.0-alpine AS builder

WORKDIR /app

# Install pnpm
# Optional managed-environment proxy CA; never stored in an image layer.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g pnpm@10.25.0 --ignore-scripts

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

# Copy workspace packages needed for this service
# Dependency chain: types -> auth-client -> content-editor -> organization-core -> forum-core
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/organization-core/package.json ./packages/organization-core/
COPY packages/forum-core/package.json ./packages/forum-core/
COPY packages/ui/package.json ./packages/ui/
COPY packages/operator-core-ui/package.json ./packages/operator-core-ui/
COPY packages/lms-ui/package.json ./packages/lms-ui/
COPY packages/lms-client/package.json ./packages/lms-client/
COPY packages/hub-core/package.json ./packages/hub-core/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/admin-ux-core/package.json ./packages/admin-ux-core/
COPY packages/o4o-ai-components/package.json ./packages/o4o-ai-components/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/account-ui/package.json ./packages/account-ui/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/store-products-ui/package.json ./packages/store-products-ui/
COPY packages/store-ui-core/package.json ./packages/store-ui-core/
# WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C: 공급자 Screen Set 제작기(공유 편집기) 소비.
COPY packages/screen-content-core/package.json ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/package.json ./packages/tablet-kiosk-core/
COPY packages/tablet-screen-set-editor/package.json ./packages/tablet-screen-set-editor/

# Copy service package.json
COPY services/web-neture/package.json ./services/web-neture/

# Install dependencies
# WO-O4O-DOCKER-PNPM-IGNORE-SCRIPTS-FIX-V1: --ignore-scripts로 prepare 자동 빌드 skip.
# packages/types prepare가 tsconfig.json 미복사 시점에 tsc --build 실행해 실패하는 문제 회피.
# 명시적 build는 source copy 후 아래 RUN 단계에서 수행됨.
RUN --mount=type=secret,id=proxy_ca \
    --mount=type=cache,id=o4o-neture-pnpm,target=/pnpm/store \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --filter @o4o/web-neture... --frozen-lockfile --ignore-scripts \
      --store-dir=/pnpm/store --verify-store-integrity=true

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/organization-core/ ./packages/organization-core/
COPY packages/forum-core/ ./packages/forum-core/
COPY packages/ui/ ./packages/ui/
COPY packages/operator-core-ui/ ./packages/operator-core-ui/
COPY packages/lms-ui/ ./packages/lms-ui/
COPY packages/lms-client/ ./packages/lms-client/
COPY packages/hub-core/ ./packages/hub-core/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/admin-ux-core/ ./packages/admin-ux-core/
COPY packages/o4o-ai-components/ ./packages/o4o-ai-components/
COPY packages/error-handling/ ./packages/error-handling/
COPY packages/account-ui/ ./packages/account-ui/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/store-products-ui/ ./packages/store-products-ui/
COPY packages/store-ui-core/ ./packages/store-ui-core/
# WO-O4O-SUPPLIER-SCREEN-SET-UI-STORE-HUB-INTEGRATION-V2C: 공급자 Screen Set 제작기(공유 편집기) 소비.
COPY packages/screen-content-core/ ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/ ./packages/tablet-kiosk-core/
COPY packages/tablet-screen-set-editor/ ./packages/tablet-screen-set-editor/

# Pure pharmacy data contract shared by Main and the standalone PC runtime (no agent I/O code).
COPY tools/o4o-local-agent/src/pharmacy-order-contract.mjs tools/o4o-local-agent/src/pharmacy-order-contract.d.mts ./tools/o4o-local-agent/src/

# Copy service source
COPY services/web-neture/ ./services/web-neture/

# Only the production image build installs this isolated, pinned build toolchain.
RUN --mount=type=secret,id=proxy_ca \
    --mount=type=cache,id=o4o-neture-pnpm,target=/pnpm/store \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm --dir services/web-neture/tools/obfuscation-pilot install --ignore-workspace \
      --frozen-lockfile --ignore-scripts --verify-store-integrity=true --store-dir=/pnpm/store

# Build workspace dependencies
# Note: Both organization-core and forum-core have @types/express for compilation
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/account-ui build
RUN pnpm --filter @o4o/content-editor build
RUN pnpm --filter @o4o/organization-core build
RUN pnpm --filter @o4o/forum-core build

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ARG VITE_USE_REAL_FORUM_API=true
ARG VITE_API_URL=https://api.neture.co.kr
# WO-O4O-DOMAIN-SSOT-CANONICALIZATION-V1: canonical service URL for password reset & cross-service handoff
ARG VITE_SERVICE_URL=https://neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_REAL_FORUM_API=$VITE_USE_REAL_FORUM_API
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL
ARG VITE_HOST_CUTOVER_SUPPLIER=true
ENV VITE_HOST_CUTOVER_SUPPLIER=$VITE_HOST_CUTOVER_SUPPLIER
ARG VITE_HOST_CUTOVER_FUNDING=true
ENV VITE_HOST_CUTOVER_FUNDING=$VITE_HOST_CUTOVER_FUNDING

# Build the service (vite only — tsc는 CI/로컬에서 별도 수행)
WORKDIR /app/services/web-neture
ARG NETURE_OBFUSCATION=names
RUN mkdir -p /app/.private-neture-build \
    && NETURE_PRIVATE_DEBUG_DIR=/app/.private-neture-build NETURE_OBFUSCATION=$NETURE_OBFUSCATION pnpm exec vite build

# Production stage
FROM nginx:1.28-alpine AS runner

# Copy built files
COPY --from=builder /app/services/web-neture/dist /usr/share/nginx/html
# Private image artifact, outside nginx's document root and unreadable by UID 101.
COPY --from=builder /app/.private-neture-build /opt/o4o-private-debug
RUN chmod -R a+rX /usr/share/nginx/html \
    && chmod -R go-rwx /opt/o4o-private-debug
COPY --chmod=644 services/web-neture/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=644 services/web-neture/nginx/nginx.conf /etc/nginx/nginx.conf
# The entrypoint renders the template as UID 101; all runtime temp files use /tmp.
RUN chmod 755 /etc/nginx/templates \
    && chown nginx:nginx /etc/nginx/conf.d /etc/nginx/conf.d/default.conf

# Cloud Run uses PORT env variable
ENV PORT=8080
# Restrict envsubst to PORT so nginx's host/uri variables survive unchanged.
ENV NGINX_ENVSUBST_FILTER=^PORT$
USER 101

EXPOSE 8080

# The nginx entrypoint renders the PORT template before starting the server.
CMD ["nginx", "-g", "daemon off;"]
