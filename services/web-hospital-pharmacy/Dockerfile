FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.packages.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/auth-client/package.json ./packages/auth-client/
COPY packages/hospital-pharmacy-core/package.json ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/package.json ./services/web-hospital-pharmacy/
RUN pnpm install --filter hospital-pharmacy-web... --ignore-scripts
COPY packages/types/ ./packages/types/
COPY packages/auth-client/ ./packages/auth-client/
COPY packages/hospital-pharmacy-core/ ./packages/hospital-pharmacy-core/
COPY services/web-hospital-pharmacy/ ./services/web-hospital-pharmacy/
RUN pnpm --filter @o4o/types build
RUN pnpm --filter @o4o/auth-client build
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
ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
