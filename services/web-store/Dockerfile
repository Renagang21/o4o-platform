# WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 (§8 Scope Extension)
# store.neture.co.kr = O4O 공통 Store Workspace (서비스가 아니다 · serviceKey 없음).
# 선별 COPY: store-web 의 workspace 의존 closure 전부(신규 패키지 추가 시 package.json + source 두 줄 + 필요 시 build 한 줄).
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/ui/package.json ./packages/ui/
COPY packages/slide-app/package.json ./packages/slide-app/
COPY packages/content-core/package.json ./packages/content-core/
COPY packages/block-renderer/package.json ./packages/block-renderer/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/error-handling/package.json ./packages/error-handling/
COPY packages/account-ui/package.json ./packages/account-ui/
COPY packages/lms-client/package.json ./packages/lms-client/
COPY packages/operator-ux-core/package.json ./packages/operator-ux-core/
COPY packages/screen-content-core/package.json ./packages/screen-content-core/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/store-asset-policy-core/package.json ./packages/store-asset-policy-core/
COPY packages/store-products-ui/package.json ./packages/store-products-ui/
COPY packages/store-ui-core/package.json ./packages/store-ui-core/
COPY packages/tablet-kiosk-core/package.json ./packages/tablet-kiosk-core/
COPY packages/tablet-screen-set-editor/package.json ./packages/tablet-screen-set-editor/
COPY services/web-store/package.json ./services/web-store/
RUN pnpm install --filter store-web... --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/ui/ ./packages/ui/
COPY packages/slide-app/ ./packages/slide-app/
COPY packages/content-core/ ./packages/content-core/
COPY packages/block-renderer/ ./packages/block-renderer/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/error-handling/ ./packages/error-handling/
COPY packages/account-ui/ ./packages/account-ui/
COPY packages/lms-client/ ./packages/lms-client/
COPY packages/operator-ux-core/ ./packages/operator-ux-core/
COPY packages/screen-content-core/ ./packages/screen-content-core/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/store-asset-policy-core/ ./packages/store-asset-policy-core/
COPY packages/store-products-ui/ ./packages/store-products-ui/
COPY packages/store-ui-core/ ./packages/store-ui-core/
COPY packages/tablet-kiosk-core/ ./packages/tablet-kiosk-core/
COPY packages/tablet-screen-set-editor/ ./packages/tablet-screen-set-editor/
COPY services/web-store/ ./services/web-store/
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/content-editor build
RUN pnpm --filter @o4o/block-renderer build
RUN pnpm --filter @o4o/account-ui build
RUN pnpm --filter @o4o/lms-client build
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SERVICE_URL=https://store.neture.co.kr
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL
WORKDIR /app/services/web-store
RUN npx vite build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/services/web-store/dist ./dist
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
