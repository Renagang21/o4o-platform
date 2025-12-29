# {Business} Deployment Boundary

> **Version**: 1.0
> **Status**: Reference
> **Created**: {date}

이 문서는 {Business} 서비스의 빌드/배포 단위, 도메인 연결, 환경변수 기준을 정의합니다.

---

## 1. 서비스 분리 원칙

### 1.1 배포 단위

| 서비스 | 배포 단위 | 런타임 |
|--------|-----------|--------|
| {business}-web | 독립 | Static / SSR |
| {business}-api | 독립 | Node.js (NestJS) |
| Core API | 공유 (o4o-core-api) | Node.js (NestJS) |

### 1.2 분리 이유

- 독립 배포 / 독립 스케일링 / 독립 버전 관리

---

## 2. 빌드 규칙

### 2.1 {business}-web 빌드

```yaml
build_command: "pnpm build"
output_directory: "dist" or ".next"

dependencies:
  - "@o4o/ui"
  - "@o4o/types"
  - "@o4o/auth-client"

env:
  {BUSINESS}_API_URL: "https://{business}-api.neture.co.kr"
  CORE_API_URL: "https://api.neture.co.kr"
```

### 2.2 {business}-api 빌드

```yaml
build_command: "pnpm build"
output_directory: "dist"

dependencies:
  - "@o4o/types"
  - "@o4o/utils"

bundle_config:
  entry: "src/main.ts"
  output: "dist/main.js"
  noExternal: ["@o4o/*"]
```

---

## 3. 배포 환경

### 3.1 Production 구성

```
DNS / CDN
   │
   ├── {business}.neture.co.kr → Cloud Run (Web)
   │
   └── {business}-api.neture.co.kr → Cloud Run (API)
                                          │
                                     Cloud SQL
                                   ({Business} DB)
```

### 3.2 Development 구성

```
localhost:3000 (web) → localhost:{port} (api)
                             │
                        PostgreSQL
                        (localhost)
```

---

## 4. 도메인 연결

### 4.1 도메인 구조

| 서비스 | Production | Development |
|--------|------------|-------------|
| {business}-web | `{business}.neture.co.kr` | `localhost:3000` |
| {business}-api | `{business}-api.neture.co.kr` | `localhost:{port}` |
| Core API | `api.neture.co.kr` | `localhost:3001` |

### 4.2 CORS 설정

```typescript
// Production
cors: {
  origin: ['https://{business}.neture.co.kr'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  credentials: true
}
```

---

## 5. 환경변수 규칙

### 5.1 {business}-web 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `{BUSINESS}_API_URL` | O | API URL |
| `CORE_API_URL` | O | Core API URL (로그인용) |
| `NEXT_PUBLIC_{BUSINESS}_API_URL` | O | 클라이언트용 API URL |

### 5.2 {business}-api 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `PORT` | O | API 서버 포트 |
| `NODE_ENV` | O | 실행 환경 |
| `DB_HOST` | O | DB 호스트 |
| `DB_PORT` | O | DB 포트 |
| `DB_NAME` | O | DB 이름 |
| `DB_USERNAME` | O | DB 사용자 |
| `DB_PASSWORD` | O | DB 비밀번호 |
| `JWT_PUBLIC_KEY` | O | JWT 검증용 공개키 |

### 5.3 금지 환경변수

| 금지 | 이유 |
|------|------|
| `JWT_SECRET` | JWT 발급 금지 |
| `CORE_DB_*` | Core DB 직접 접근 금지 |

---

## 6. 데이터베이스 분리

### 6.1 DB 구성

| DB | 소유자 | 용도 |
|----|--------|------|
| Core DB | Core API | 사용자, 권한, 설정 |
| {Business} DB | {business}-api | 도메인 데이터 |

### 6.2 DB 접근 규칙

```
{business}-api
    │
    ├── {Business} DB: READ/WRITE ✅
    │
    └── Core DB: READ (제한적) ⚠️
              WRITE ❌ (금지)
```

---

## 7. CI/CD 파이프라인

### 7.1 {business}-api 파이프라인

```yaml
name: Deploy {Business} API

on:
  push:
    branches: [main]
    paths:
      - 'apps/{business}-api/**'
      - 'packages/types/**'

jobs:
  deploy:
    steps:
      - Build
      - Docker Build
      - Deploy to Cloud Run
```

### 7.2 독립 배포 원칙

| 서비스 | 배포 트리거 | 독립성 |
|--------|-------------|--------|
| {business}-web | apps/{business}-web/** 변경 | Core 배포와 독립 |
| {business}-api | apps/{business}-api/** 변경 | Core 배포와 독립 |

---

## 8. 참조 문서

- docs/architecture/business-api-template.md
- docs/services/{business}/api-rules.md
- docs/services/{business}/openapi.yaml
- docs/infra/cloud-run-deployment.md
- CLAUDE.md §8 인프라 정보

---

*이 문서는 {Business} 서비스의 배포 경계를 정의합니다.*
