FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/file-understanding-core/package.json ./packages/file-understanding-core/
COPY packages/hospital-pharmacy-core/package.json ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/package.json ./services/web-hospital-pharmacy/
RUN pnpm install --filter hospital-pharmacy-web... --ignore-scripts
COPY packages/file-understanding-core/ ./packages/file-understanding-core/
COPY packages/hospital-pharmacy-core/ ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/ ./services/web-hospital-pharmacy/
# 무로그인 V1 — auth 패키지(types·auth-utils·auth-client·auth-react) 의존 없음.
# @o4o/file-understanding-core 는 main=dist/index.js(api-server 와 공용) — 빌드 필요. 브라우저 decode 용 xlsx 포함.
RUN pnpm --filter @o4o/file-understanding-core build
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
