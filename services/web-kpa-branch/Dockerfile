# syntax=docker/dockerfile:1
# KPA Branch Web — Cloud Run 호환 정적 파일 서빙
#
# WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
#   docker build -f services/web-kpa-branch/Dockerfile .
#
# 분회별 배포를 만들지 않는다. 이 이미지 하나가 공용 도메인과 모든 분회 자체 도메인을
# 함께 서빙하고, 분회 tenant 는 URL segment 또는 Host 로만 해석된다.
#
# ⚠️ 신규 workspace 패키지를 dependency 로 추가하면 아래 COPY 2 곳(package.json / source)에
#    반드시 함께 추가해야 한다. 누락 시 Docker 빌드가 실패한다.

# Build stage
FROM node:22.23.4-alpine AS builder

WORKDIR /app

RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g --ignore-scripts pnpm@10.25.0

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

# Copy workspace package manifests needed for this service
#   auth-react → { auth-utils, auth-client } → types
#   shared-space-ui → { ui → types, content-editor }
#   operator-ux-core → { ui, types } (표준 회원 목록·ActionBar)
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/ui/package.json ./packages/ui/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/

# Copy service package.json
COPY services/web-kpa-branch/package.json ./services/web-kpa-branch/

# WO-O4O-DOCKER-PNPM-IGNORE-SCRIPTS-FIX-V1: --ignore-scripts 로 prepare 자동 빌드 skip
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --filter kpa-branch-web... --fail-if-no-match \
      --frozen-lockfile --ignore-scripts --verify-store-integrity=true

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/ui/ ./packages/ui/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/

# Copy service source
COPY services/web-kpa-branch/ ./services/web-kpa-branch/

# Build workspace dependencies first (auth-react 는 source-mode 라 빌드 불필요)
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/content-editor build

WORKDIR /app/services/web-kpa-branch

# 빌드 시점 API base URL (미지정 시 apiClient 기본값 사용)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm exec vite build

# Runner stage
FROM node:22.23.4-alpine AS runner

WORKDIR /app

RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install -g --ignore-scripts serve@14.2.4

COPY --from=builder /app/services/web-kpa-branch/dist ./dist

# WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1
#   번들 asset 은 vite `base: '/kpa/'` 때문에 항상 `/kpa/assets/*` 로 요청된다.
#   같은 이미지가 두 진입 방식을 서빙해야 하므로 dist 를 `/kpa` 아래에도 둔다.
#     공용 호스트 kpa.neture.co.kr/{slug}    → index.html 은 root, asset 은 /kpa/assets/*
#     자체 도메인 {branch domain}/           → index.html 은 root, asset 은 /kpa/assets/*
#   HTML 자체는 `serve -s` 의 SPA fallback(dist/index.html)이 두 경우 모두 처리한다.
RUN cp -r ./dist ./dist-public-base && mv ./dist-public-base ./dist/kpa

EXPOSE 8080

USER node
CMD ["serve", "-s", "dist", "-l", "8080"]
