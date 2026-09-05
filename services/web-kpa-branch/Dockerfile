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
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

# Copy workspace package manifests needed for this service
#   auth-react → { auth-utils, auth-client } → types
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/

# Copy service package.json
COPY services/web-kpa-branch/package.json ./services/web-kpa-branch/

# WO-O4O-DOCKER-PNPM-IGNORE-SCRIPTS-FIX-V1: --ignore-scripts 로 prepare 자동 빌드 skip
RUN pnpm install --filter kpa-branch-web... --ignore-scripts

# Copy workspace package source
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/

# Copy service source
COPY services/web-kpa-branch/ ./services/web-kpa-branch/

# Build workspace dependencies first (auth-react 는 source-mode 라 빌드 불필요)
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build

WORKDIR /app/services/web-kpa-branch

# 빌드 시점 API base URL (미지정 시 apiClient 기본값 사용)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npx vite build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/services/web-kpa-branch/dist ./dist

# WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1
#   번들 asset 은 vite `base: '/kpa/'` 때문에 항상 `/kpa/assets/*` 로 요청된다.
#   같은 이미지가 두 진입 방식을 서빙해야 하므로 dist 를 `/kpa` 아래에도 둔다.
#     공용 경로  kpa-society.co.kr/kpa/{slug} → LB 가 `/kpa/...` 그대로 전달 → dist/kpa/assets/*
#     자체 도메인 {branch domain}/           → index.html 은 root, asset 은 /kpa/assets/*
#   HTML 자체는 `serve -s` 의 SPA fallback(dist/index.html)이 두 경우 모두 처리한다.
RUN cp -r ./dist ./dist-public-base && mv ./dist-public-base ./dist/kpa

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
