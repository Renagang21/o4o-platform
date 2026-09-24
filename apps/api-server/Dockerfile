# =============================================================================
# O4O API Server - Cloud Run Dockerfile
# =============================================================================
# Multi-stage build optimized for Cloud Run deployment
#
# Strategy:
# - Stage 1: Install only external runtime dependencies (no devDependencies)
# - Stage 2: Copy bundled app (dist/main.js) + production node_modules
#
# Prerequisites:
# - dist/main.js must be built locally via `pnpm run build:api`
# - This Dockerfile does NOT build the bundle (build happens in CI or locally)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies Installation
# -----------------------------------------------------------------------------
FROM node:22-slim AS deps

WORKDIR /app

# Copy the production package.json (external dependencies only)
# Full API version with all runtime dependencies
COPY package.production.json ./package.json

# Install production dependencies only
# Using npm for simplicity in Docker (no pnpm workspace complexity)
RUN npm install --omit=dev --ignore-scripts \
    && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
# WO-O4O-API-DOCKER-BUILD-CACHE-AND-OWNERSHIP-V1: /app 자체(WORKDIR 가 root 로 생성)만
# 여기서 넘기고, 그 아래는 전부 COPY --chown 으로 처음부터 o4oapi 소유로 복사한다.
# 과거의 마지막 `RUN chown -R o4oapi:nodejs /app` 는 node_modules 전체를 한 레이어 더
# 복제해(≈28s + export/push 증가) 같은 결과를 냈다. 동치는 아래 ownership guard 가 강제한다.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 o4oapi \
    && chown o4oapi:nodejs /app

# Copy node_modules from deps stage
# CACHEBUST 보다 앞이라 package.production.json 이 같으면 레지스트리 캐시에서 재사용된다.
COPY --from=deps --chown=o4oapi:nodejs /app/node_modules ./node_modules

# Cache bust argument - pass --build-arg CACHEBUST=$(date +%s) to invalidate cache
ARG CACHEBUST=1
# Force cache invalidation for COPY steps below
RUN echo "Cache bust: ${CACHEBUST}"

# Copy the bundled application (tsup creates bundled entry points)
# - main.js: API Server entry (Cloud Run Service)
# - migrate.js: Migration CLI entry (Cloud Run Job)
COPY --chown=o4oapi:nodejs dist/main.js ./dist/main.js
COPY --chown=o4oapi:nodejs dist/main.js.map ./dist/main.js.map
COPY --chown=o4oapi:nodejs dist/migrate.js ./dist/migrate.js
COPY --chown=o4oapi:nodejs dist/migrate.js.map ./dist/migrate.js.map
# - drug-seed-candidate-import-job.js: 약가마스터 candidate 적재 one-off Job entry
COPY --chown=o4oapi:nodejs dist/drug-seed-candidate-import-job.js ./dist/drug-seed-candidate-import-job.js
COPY --chown=o4oapi:nodejs dist/drug-seed-candidate-import-job.js.map ./dist/drug-seed-candidate-import-job.js.map
# - drug-seed-promotion-apply-job.js: candidate → ProductMaster/Identifier 승격 one-off Job entry
COPY --chown=o4oapi:nodejs dist/drug-seed-promotion-apply-job.js ./dist/drug-seed-promotion-apply-job.js
COPY --chown=o4oapi:nodejs dist/drug-seed-promotion-apply-job.js.map ./dist/drug-seed-promotion-apply-job.js.map
# - easy-drug-seed-candidate-import-job.js: e약은요 JSONL → ProductCandidate 적재 one-off Job entry
COPY --chown=o4oapi:nodejs dist/easy-drug-seed-candidate-import-job.js ./dist/easy-drug-seed-candidate-import-job.js
COPY --chown=o4oapi:nodejs dist/easy-drug-seed-candidate-import-job.js.map ./dist/easy-drug-seed-candidate-import-job.js.map
# - easy-drug-shared-description-derive-job.js: e약은요 candidate → master별 SharedProductDescription 파생 one-off Job entry
COPY --chown=o4oapi:nodejs dist/easy-drug-shared-description-derive-job.js ./dist/easy-drug-shared-description-derive-job.js
COPY --chown=o4oapi:nodejs dist/easy-drug-shared-description-derive-job.js.map ./dist/easy-drug-shared-description-derive-job.js.map
# - drug-representative-grouping-job.js: MFDS_CODE 기준 representative_products 생성+연결 one-off Job entry
COPY --chown=o4oapi:nodejs dist/drug-representative-grouping-job.js ./dist/drug-representative-grouping-job.js
COPY --chown=o4oapi:nodejs dist/drug-representative-grouping-job.js.map ./dist/drug-representative-grouping-job.js.map
# - easy-drug-image-copy-job.js: e약은요 외부이미지 → GCS 사본 → ProductImage → 대표 thumbnail one-off Job entry
COPY --chown=o4oapi:nodejs dist/easy-drug-image-copy-job.js ./dist/easy-drug-image-copy-job.js
COPY --chown=o4oapi:nodejs dist/easy-drug-image-copy-job.js.map ./dist/easy-drug-image-copy-job.js.map
# - drug-shared-description-bulk-canonical-job.js: e약은요 설명 안전후보 → canonical 일괄 승격 one-off Job entry
COPY --chown=o4oapi:nodejs dist/drug-shared-description-bulk-canonical-job.js ./dist/drug-shared-description-bulk-canonical-job.js
COPY --chown=o4oapi:nodejs dist/drug-shared-description-bulk-canonical-job.js.map ./dist/drug-shared-description-bulk-canonical-job.js.map

# Copy database folder for migrations
# - migration-config.js: Lightweight DataSource for TypeORM CLI (fallback)
# - migrations/*.js: Compiled migration files
COPY --chown=o4oapi:nodejs dist/database ./dist/database

# Copy static assets (fonts for PDF generation)
COPY --chown=o4oapi:nodejs src/assets ./dist/assets

# Copy email templates (mail-core, copied into build context by CI from packages/mail-core/templates/email)
COPY --chown=o4oapi:nodejs mail-templates ./templates/email

# Verify the bundle and migration files exist
# (deploy-api.yml 은 buildx --push 로 이미지를 로컬에 두지 않으므로, 과거 post-build
#  `docker run ... ls -la /app/dist/` 목록 출력도 여기서 빌드 로그로 남긴다.)
RUN ls -la /app/dist/
RUN ls -la /app/dist/main.js || (echo "CRITICAL: dist/main.js not found!" && exit 1)
RUN ls -la /app/dist/migrate.js || (echo "CRITICAL: dist/migrate.js not found!" && exit 1)
RUN ls -la /app/dist/database/migrations/*.js | head -5 || echo "WARNING: No migrations found"

# Ownership guard — 과거 `chown -R o4oapi:nodejs /app` 와 동치임을 빌드 실패로 강제한다.
# /app 아래에 o4oapi:nodejs 가 아닌 항목이 하나라도 있으면 실패한다.
RUN bad="$(find /app \( ! -user o4oapi -o ! -group nodejs \) -print -quit)"; \
    if [ -n "$bad" ]; then echo "CRITICAL: not owned by o4oapi:nodejs: $bad" && exit 1; fi

# Switch to non-root user
USER o4oapi

# Expose Cloud Run port
EXPOSE 8080

# Health check (Cloud Run uses HTTP health checks)
# NOTE: Cloud Run ignores HEALTHCHECK - it uses its own probing
# This is for local Docker testing only
# Increased start-period to 60s to allow for DB connection attempts
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "--max-old-space-size=512", "dist/main.js"]
