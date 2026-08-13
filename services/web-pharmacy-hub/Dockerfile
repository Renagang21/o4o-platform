# Pharmacy-Hub Web — Cloud Run 호환 정적 파일 서빙
#
# NOTE: 이 Dockerfile은 모노레포 루트에서 빌드 컨텍스트로 실행됩니다.
#   docker build -f services/web-pharmacy-hub/Dockerfile .
#
# ⚠️ 신규 workspace 패키지를 dependency 로 추가하면 아래 COPY 2 곳(package.json / source)에
#    반드시 함께 추가해야 한다. 누락 시 Docker 빌드가 실패한다.

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.packages.json ./

COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/store-ui-core/package.json ./packages/store-ui-core/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/ui/package.json ./packages/ui/
COPY packages/account-ui/package.json ./packages/account-ui/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/tablet-screen-set-editor/package.json ./packages/tablet-screen-set-editor/
COPY packages/screen-content-core/package.json ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/package.json ./packages/tablet-kiosk-core/

COPY services/web-pharmacy-hub/package.json ./services/web-pharmacy-hub/

RUN pnpm install --filter pharmacy-hub-web... --ignore-scripts

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
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/tablet-screen-set-editor/ ./packages/tablet-screen-set-editor/
COPY packages/screen-content-core/ ./packages/screen-content-core/
COPY packages/tablet-kiosk-core/ ./packages/tablet-kiosk-core/

COPY services/web-pharmacy-hub/ ./services/web-pharmacy-hub/

RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/account-ui build
RUN pnpm --filter @o4o/content-editor build

ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SERVICE_URL=https://pharmacyhub.co.kr
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL

WORKDIR /app/services/web-pharmacy-hub
RUN npx vite build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/services/web-pharmacy-hub/dist ./dist

ENV PORT=8080

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
