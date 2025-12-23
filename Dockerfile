# Node.js (workspace 요구사항 충족)
FROM node:22-alpine

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 작업 디렉토리 = repo 루트
WORKDIR /repo

# pnpm-lock.yaml 복사
COPY pnpm-lock.yaml ./

# workspace 메타 파일 복사
COPY pnpm-workspace.yaml package.json ./

# TypeScript 설정 파일들 복사
COPY tsconfig.json tsconfig.base.json tsconfig.packages.json ./

# 모든 패키지 메타 복사
COPY apps ./apps
COPY packages ./packages

# workspace 전체 의존성 설치
RUN pnpm install --frozen-lockfile=false

# 기본 패키지들 빌드
RUN pnpm --filter @o4o/types run build || true
RUN pnpm --filter @o4o/cpt-registry run build || true
RUN pnpm --filter @o4o/organization-core run build || true
RUN pnpm --filter @o4o/ecommerce-core run build || true
RUN pnpm --filter @o4o/platform-core run build || true
RUN pnpm --filter @o4o/dropshipping-core run build || true
RUN pnpm --filter @o4o/membership-yaksa run build || true
RUN pnpm --filter @o4o/reporting-yaksa run build || true
RUN pnpm --filter @o4o/annualfee-yaksa run build || true
RUN pnpm --filter @o4o/lms-core run build || true
RUN pnpm --filter @o4o/lms-yaksa run build || true
RUN pnpm --filter @o4o/groupbuy-yaksa run build || true
RUN pnpm --filter @o4o/yaksa-scheduler run build || true
RUN pnpm --filter @o4o/forum-core run build || true
RUN pnpm --filter @o4o-apps/signage run build || true
RUN pnpm --filter @o4o-apps/cms-core run build || true
RUN pnpm --filter @o4o-extensions/organization-forum run build || true
RUN pnpm --filter @o4o/auth-core run build || true
RUN pnpm --filter @o4o/block-renderer run build || true
RUN pnpm --filter @o4o/shortcodes run build || true

# dropshipping-cosmetics 빌드 (디버깅 포함)
WORKDIR /repo/packages/dropshipping-cosmetics
RUN echo "=== Building dropshipping-cosmetics ===" && \
    npx tsc -p tsconfig.json --skipLibCheck 2>&1 || echo "Build had issues" && \
    echo "=== Checking dist ===" && \
    ls -la dist/backend/entities/ 2>/dev/null || echo "No entities folder"

# 다른 패키지들 직접 빌드
WORKDIR /repo
RUN cd packages/cosmetics-seller-extension && npx tsc -p tsconfig.json --skipLibCheck || true
RUN cd packages/cosmetics-partner-extension && npx tsc -p tsconfig.json --skipLibCheck || true
RUN cd packages/cosmetics-supplier-extension && npx tsc -p tsconfig.json --skipLibCheck || true
RUN cd packages/cosmetics-sample-display-extension && npx tsc -p tsconfig.json --skipLibCheck || true
RUN cd packages/health-extension && npx tsc -p tsconfig.json --skipLibCheck || true

# api-server tsup 번들 빌드 (모든 @o4o/* 패키지 인라인 포함)
WORKDIR /repo/apps/api-server
RUN npx tsup --config tsup.config.ts

# Cloud Run 포트
ENV PORT=8080
EXPOSE 8080

# API 서버 실행
CMD ["node", "--max-old-space-size=1024", "dist/main.js"]
