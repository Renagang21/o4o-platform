FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-utils/package.json ./packages/auth-utils/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/auth-react/package.json ./packages/auth-react/
COPY packages/hospital-pharmacy-core/package.json ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/package.json ./services/web-hospital-pharmacy/
RUN pnpm install --filter hospital-pharmacy-web... --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-utils/ ./packages/auth-utils/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/auth-react/ ./packages/auth-react/
COPY packages/hospital-pharmacy-core/ ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/ ./services/web-hospital-pharmacy/
RUN pnpm --filter @o4o/types build
# @o4o/auth-utils 는 main=dist/index.js — 빌드 필요(web-lecture Dockerfile 선례).
RUN pnpm --filter @o4o/auth-utils build
RUN pnpm --filter @o4o/auth-client build
# @o4o/auth-react 는 main=src/index.ts — Vite 가 소스에서 직접 번들, 빌드 불필요.
# @o4o/hospital-pharmacy-core 는 순수 소스 패키지(main=src/index.ts) — Vite 가 소스에서 직접 번들, 빌드 불필요.
ARG VITE_API_BASE_URL=https://api.neture.co.kr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SERVICE_URL=https://hospital.neture.co.kr
ENV VITE_SERVICE_URL=$VITE_SERVICE_URL
WORKDIR /app/services/web-hospital-pharmacy
RUN npx vite build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/services/web-hospital-pharmacy/dist ./dist
# 정본 진입은 neture.co.kr/hospital (LB 가 `/hospital/...` 을 그대로 전달) · Cloud Run 직접 URL 은 root 진입.
# 같은 이미지가 두 진입을 서빙해야 하므로 dist 를 `/hospital` 아래에도 둔다(kpa-branch `/kpa` 선례).
# HTML 은 `serve -s` 의 SPA fallback(dist/index.html)이 두 경우 모두 처리한다.
RUN cp -r ./dist ./dist-base && mv ./dist-base ./dist/hospital
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
