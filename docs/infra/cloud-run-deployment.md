# O4O Platform - Cloud Run Deployment Guide

> **Version**: 1.0
> **Last Updated**: 2025-12-29
> **Status**: Active

이 문서는 O4O Platform API 서버의 GCP Cloud Run 배포에 대한 종합 가이드입니다.

---

## 1. 인프라 개요

### 1.1 GCP 리소스

| 리소스 | 값 |
|--------|-----|
| **Project ID** | `netureyoutube` |
| **Region** | `asia-northeast3` (서울) |
| **Cloud Run Service** | `o4o-core-api` |
| **Artifact Registry** | `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server` |
| **Cloud SQL Instance** | `netureyoutube:asia-northeast3:o4o-platform-db` |
| **DB Name** | `o4o_platform` |
| **DB User** | `o4o_api` |

### 1.2 Cloud Run 서비스 URL

```
https://o4o-core-api-117791934476.asia-northeast3.run.app
```

- Health Check: `/health`
- API Base: `/api`

---

## 2. 아키텍처

### 2.1 빌드 파이프라인

```
Source Code → tsup Bundle → Docker Build → Artifact Registry → Cloud Run
```

1. **tsup 번들링**: 모든 `@o4o/*` 워크스페이스 패키지가 `dist/main.js`에 인라인됨
2. **Docker 다단계 빌드**: 런타임 의존성만 포함
3. **Artifact Registry**: Docker 이미지 저장소
4. **Cloud Run**: 서버리스 컨테이너 실행

### 2.2 데이터베이스 연결

Cloud Run과 Cloud SQL은 **Unix Socket**으로 연결됩니다.

```
Cloud Run Container ↔ /cloudsql/netureyoutube:asia-northeast3:o4o-platform-db ↔ Cloud SQL
```

**중요**: TCP 연결이 아닌 Unix Socket 경로를 `DB_HOST`에 직접 지정합니다.

---

## 3. 핵심 파일

### 3.1 Dockerfile (`apps/api-server/Dockerfile`)

```dockerfile
# Stage 1: Dependencies
FROM node:22-slim AS deps
WORKDIR /app
COPY package.production.json ./package.json
RUN npm install --omit=dev --ignore-scripts

# Stage 2: Runtime
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=8080

# Copy node_modules and bundled app
COPY --from=deps /app/node_modules ./node_modules
COPY dist/ ./dist/

CMD ["node", "--max-old-space-size=512", "dist/main.js"]
```

**핵심 원칙**:
- `packages/` 복사 금지 - tsup이 모든 `@o4o/*` 패키지를 번들링
- `dist/main.js`만 복사 - 모든 애플리케이션 코드 포함

### 3.2 .dockerignore (`apps/api-server/.dockerignore`)

```
# Ignore everything
*

# Allow only production files
!dist/
!package.production.json
!package.production-minimal.json
!Dockerfile
```

**금지**: `!packages/` 추가 금지 - tsup 번들링과 충돌

### 3.3 DB Connection (`apps/api-server/src/database/connection.ts`)

```typescript
// Unix socket 감지
const isUnixSocket = DB_TYPE === 'postgres' && DB_HOST?.startsWith('/cloudsql/');

if (isUnixSocket) {
  // Cloud Run + Cloud SQL
  dataSourceConfig = {
    type: 'postgres',
    host: DB_HOST,  // /cloudsql/project:region:instance
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
}

// SSL 설정 - Unix socket에서는 제외
...(DB_TYPE === 'postgres' && NODE_ENV === 'production' && !isUnixSocket ? {
  ssl: { rejectUnauthorized: false }
} : {})
```

**핵심**:
- `host`에 Unix socket 경로 직접 지정 (pg 라이브러리 규칙)
- Unix socket은 SSL 불필요 (이미 안전한 연결)

---

## 4. 환경변수

### 4.1 Cloud Run 환경변수

| 변수 | 값 | 설명 |
|------|-----|------|
| `NODE_ENV` | `production` | 실행 환경 |
| `PORT` | `8080` | Cloud Run 기본 포트 |
| `DB_TYPE` | `postgres` | 데이터베이스 타입 |
| `DB_HOST` | `/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db` | Unix socket 경로 |
| `DB_USERNAME` | `o4o_api` | DB 사용자 |
| `DB_PASSWORD` | (Secret Manager) | DB 비밀번호 |
| `DB_NAME` | `o4o_platform` | DB 이름 |
| `JWT_SECRET` | (Secret) | JWT 서명 키 |
| `JWT_REFRESH_SECRET` | (Secret) | Refresh Token 키 |
| `EMAIL_SERVICE_ENABLED` | `false` | 이메일 서비스 비활성화 |
| `GRACEFUL_STARTUP` | `true` | 점진적 시작 |

### 4.2 환경변수 업데이트 명령

```bash
# 주의: --update-env-vars는 다른 변수를 삭제함
# 반드시 --set-env-vars로 모든 변수를 함께 설정

gcloud run services update o4o-core-api \
  --region=asia-northeast3 \
  --set-env-vars="NODE_ENV=production,PORT=8080,DB_TYPE=postgres,..." \
  --project=netureyoutube
```

---

## 5. 배포 프로세스

### 5.1 자동 배포 (GitHub Actions)

`.github/workflows/deploy-api.yml` 트리거 조건:
- `main` 브랜치 push
- `apps/api-server/**` 또는 `packages/**` 변경

### 5.2 수동 배포

```bash
cd apps/api-server

# 1. 로컬 빌드
pnpm run build

# 2. Docker 이미지 빌드 & 푸시 & 배포
./deploy-cloudrun.sh all

# 또는 개별 단계
./deploy-cloudrun.sh build
./deploy-cloudrun.sh push
./deploy-cloudrun.sh deploy
```

### 5.3 배포 확인

```bash
# 서비스 상태
gcloud run services describe o4o-core-api \
  --region=asia-northeast3 \
  --project=netureyoutube

# Health check
curl https://o4o-core-api-117791934476.asia-northeast3.run.app/health

# 로그 확인
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=o4o-core-api" \
  --limit=50 \
  --project=netureyoutube
```

---

## 6. 데이터베이스 마이그레이션

### 6.1 Cloud SQL Proxy 로컬 연결

```bash
# Cloud SQL Proxy 실행
cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port=5432

# 마이그레이션 실행 (별도 터미널)
cd apps/api-server
DB_HOST=localhost DB_PORT=5432 DB_USERNAME=o4o_api \
  DB_PASSWORD="O4oPlatform2025!" DB_NAME=o4o_platform \
  node scripts/run-migration-standalone.mjs --run
```

### 6.2 마이그레이션 스크립트

| 스크립트 | 용도 |
|----------|------|
| `run-migration-standalone.mjs` | 코어 테이블 생성 |
| `fix-user-roles-table.mjs` | user_roles 조인 테이블 수정 |

### 6.3 핵심 테이블

- `users` - 사용자
- `roles` - 역할
- `permissions` - 권한
- `user_roles` - 사용자-역할 ManyToMany 조인
- `role_permissions` - 역할-권한 ManyToMany 조인
- `apps` - 앱 시스템
- `settings` - 설정

---

## 7. 트러블슈팅

### 7.1 `connect ECONNREFUSED 127.0.0.1:5432`

**원인**: Cloud Run에서 TCP 연결 시도
**해결**: `DB_HOST`에 Unix socket 경로 지정

```
DB_HOST=/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db
```

### 7.2 `connect ENOENT /cloudsql/.s.PGSQL.5432`

**원인**: pg 라이브러리의 잘못된 socketPath 설정
**해결**: `host`에 직접 socket 경로 지정 (extra.socketPath 사용 금지)

```typescript
// 올바른 방법
dataSourceConfig = {
  type: 'postgres',
  host: '/cloudsql/project:region:instance',  // 직접 지정
  // ...
};
```

### 7.3 `The server does not support SSL connections`

**원인**: Unix socket 연결에 SSL 적용
**해결**: Unix socket일 때 SSL 제외

```typescript
...(NODE_ENV === 'production' && !isUnixSocket ? { ssl: {...} } : {})
```

### 7.4 `column user_id does not exist`

**원인**: user_roles 테이블 스키마가 TypeORM ManyToMany와 불일치
**해결**: `fix-user-roles-table.mjs` 실행

### 7.5 Docker 빌드 시 `@o4o/xxx not found`

**원인**: tsup 번들링과 Dockerfile의 packages/ 복사 충돌
**해결**: Dockerfile에서 `COPY packages/` 제거 (tsup이 처리)

---

## 8. 보안 고려사항

### 8.1 비밀번호 관리

- 환경변수에 직접 저장 (현재)
- TODO: Secret Manager 전환 권장

### 8.2 네트워크

- Cloud Run ↔ Cloud SQL: Unix socket (VPC 내부)
- 외부 접근: Cloud Run URL (HTTPS)

### 8.3 인증

- Cloud Run: 비인증 허용 (`--allow-unauthenticated`)
- API 레벨 JWT 인증 적용

---

## 9. 참조

### 9.1 관련 파일

- `apps/api-server/Dockerfile`
- `apps/api-server/.dockerignore`
- `apps/api-server/deploy-cloudrun.sh`
- `apps/api-server/src/database/connection.ts`
- `.github/workflows/deploy-api.yml`
- `apps/api-server/scripts/run-migration-standalone.mjs`
- `apps/api-server/scripts/fix-user-roles-table.mjs`

### 9.2 GCP Console

- Cloud Run: https://console.cloud.google.com/run?project=netureyoutube
- Cloud SQL: https://console.cloud.google.com/sql?project=netureyoutube
- Artifact Registry: https://console.cloud.google.com/artifacts?project=netureyoutube

---

*이 문서는 AWS Lightsail에서 GCP Cloud Run으로 이전 후 작성되었습니다.*
