# WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1
# store.neture.co.kr = O4O 공통 Store Workspace (서비스가 아니다 · serviceKey 없음). 골격은 web-lecture 와 동일.
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/shared-space-ui/package.json ./packages/shared-space-ui/
COPY packages/content-editor/package.json ./packages/content-editor/
COPY packages/ui/package.json ./packages/ui/
COPY services/web-store/package.json ./services/web-store/
RUN pnpm install --filter store-web... --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/shared-space-ui/ ./packages/shared-space-ui/
COPY packages/content-editor/ ./packages/content-editor/
COPY packages/ui/ ./packages/ui/
COPY services/web-store/ ./services/web-store/
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
RUN pnpm --filter @o4o/ui build
RUN pnpm --filter @o4o/content-editor build
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
