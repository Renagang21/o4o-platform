# Pharmacy-Hub Web — Cloud Run 호환 정적 파일 서빙
#
# WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
#   docker build -f services/web-pharmacy-hub/Dockerfile .
#
# 배포 연결은 하지 않았다: .github/workflows/deploy-web-services.yml 미변경,
# Cloud Run 서비스/DNS 미생성. (WO §6 — 배포 및 DNS 변경 금지)
# 파일 자체는 후속 배포 WO 가 바로 쓸 수 있도록 앱 골격에 포함한다.
#
# ⚠️ 신규 workspace 패키지를 dependency 로 추가하면 아래 COPY 2 곳(package.json / source)에
#    반드시 함께 추가해야 한다. 누락 시 Docker 빌드가 실패한다.

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

# Copy workspace package manifests needed for this service
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
# WO-PHARMACY-HUB-STORE-SHELL-AND-MENU-CONFIG-V1: 공통 매장 셸 의존 체인
#   store-ui-core → { error-handling, operator-ux-core, ui } → types
COPY packages/store-ui-core/package.json ./packages/store-ui-core/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/ui/package.json ./packages/ui/
# WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1: 공통 계정 UI (프로필·비밀번호·알림)
COPY packages/account-ui/package.json ./packages/account-ui/
# WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1: 표준 편집기 (@o4o/* 의존 없음 — tiptap only)
COPY packages/content-editor/package.json ./packages/content-editor/
# WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1:
#   태블릿 Screen Set 편집기·kiosk 미리보기를 공유 패키지로 재사용한다.
#   package.json 블록과 source 블록 **양쪽** 에 넣어야 한다 — 한쪽만 넣으면
#   ERR_PNPM_WORKSPACE_PKG_NOT_FOUND(설치 단계) 또는 빌드 시 모듈 미해결로 실패한다.
COPY packages/tablet-screen-set-editor/package.json ./packages/tablet-screen-set-editor/
COPY packages/screen-content-core/package.json ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/package.json ./packages/tablet-kiosk-core/
# WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1: 공통 StoreHubTemplate (/store-hub 홈)
#   source-mode 패키지라 별도 build 단계는 필요 없다. 의존(@o4o/ui · @o4o/content-editor)은 위에 이미 있다.
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/

# Copy service package.json
COPY services/web-pharmacy-hub/package.json ./services/web-pharmacy-hub/

# WO-O4O-DOCKER-PNPM-IGNORE-SCRIPTS-FIX-V1: --ignore-scripts 로 prepare 자동 빌드 skip
RUN pnpm install --filter pharmacy-hub-web... --ignore-scripts

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/store-ui-core/ ./packages/store-ui-core/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/error-handling/ ./packages/error-handling/
COPY packages/ui/ ./packages/ui/
COPY packages/account-ui/ ./packages/account-ui/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/tablet-screen-set-editor/ ./packages/tablet-screen-set-editor/
COPY packages/screen-content-core/ ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/ ./packages/tablet-kiosk-core/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/

# Copy service source
COPY services/web-pharmacy-hub/ ./services/web-pharmacy-hub/

# Build workspace dependencies first
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
# @o4o/ui 는 dist-mode (main: ./dist/index.js) — 빌드 필요.
# store-ui-core / operator-ux-core / error-handling 은 source-mode 로 빌드 불필요.
RUN pnpm --filter @o4o/ui build
# @o4o/account-ui 도 dist-mode (main: ./dist/index.js) — 빌드 필요.
RUN pnpm --filter @o4o/account-ui build
# @o4o/content-editor 도 dist-mode — 빌드 필요. (WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1)
RUN pnpm --filter @o4o/content-editor build

# Build-time environment variables for Vite
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# WO-O4O-DOMAIN-SSOT-CANONICALIZATION-V1: canonical service URL
ARG VITE_SERVICE_URL=https://pharmacyhub.co.kr
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL

# Build the service (vite only — tsc 는 CI/로컬에서 별도 수행)
WORKDIR /app/services/web-pharmacy-hub
RUN npx vite build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/services/web-pharmacy-hub/dist ./dist

ENV PORT=8080

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
