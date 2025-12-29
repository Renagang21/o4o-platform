# Cosmetics Deployment Boundary

> **Version**: 1.0
> **Status**: Reference
> **Created**: 2025-12-29

이 문서는 Cosmetics 서비스의 빌드/배포 단위, 도메인 연결, 환경변수 기준을 정의합니다.

---

## 1. 서비스 분리 원칙

### 1.1 배포 단위

| 서비스 | 배포 단위 | 런타임 |
|--------|-----------|--------|
| cosmetics-web | 독립 | Static / SSR |
| cosmetics-api | 독립 | Node.js (NestJS) |
| Core API | 공유 (o4o-core-api) | Node.js (NestJS) |

### 1.2 분리 이유

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  cosmetics-web  │    │  cosmetics-api  │    │   Core API      │
│                 │    │                 │    │                 │
│  독립 배포      │    │  독립 배포      │    │  플랫폼 공유    │
│  독립 스케일링  │    │  독립 스케일링  │    │  중앙 관리      │
│  독립 버전      │    │  독립 버전      │    │  버전 고정      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 2. 빌드 규칙

### 2.1 cosmetics-web 빌드

```yaml
# 빌드 명령
build_command: "pnpm build"
output_directory: "dist" or ".next"

# 의존성
dependencies:
  - "@o4o/ui"            # 공유 UI 컴포넌트
  - "@o4o/types"         # 공유 타입
  - "@o4o/auth-client"   # 인증 클라이언트

# 빌드 시점 환경변수
env:
  COSMETICS_API_URL: "https://cosmetics-api.neture.co.kr"
  CORE_API_URL: "https://api.neture.co.kr"
```

### 2.2 cosmetics-api 빌드

```yaml
# 빌드 명령
build_command: "pnpm build"
output_directory: "dist"

# 의존성
dependencies:
  - "@o4o/types"         # 공유 타입
  - "@o4o/utils"         # 공유 유틸리티

# 번들링 (tsup)
bundle_config:
  entry: "src/main.ts"
  output: "dist/main.js"
  noExternal: ["@o4o/*"]  # 모든 @o4o 패키지 인라인
```

### 2.3 금지 사항

| 금지 | 이유 |
|------|------|
| cosmetics-web에서 cosmetics-api import | 런타임 분리 |
| cosmetics-api에서 Core 모듈 직접 import | 도메인 분리 |
| 빌드 시점 DB 접근 | 환경 분리 |

---

## 3. 배포 환경

### 3.1 Production 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                         DNS / CDN                                │
│                                                                  │
│  cosmetics.neture.co.kr    cosmetics-api.neture.co.kr           │
│           │                           │                          │
│           ▼                           ▼                          │
│  ┌─────────────────┐       ┌─────────────────┐                  │
│  │ Cloud Run (Web) │       │ Cloud Run (API) │                  │
│  │ or Vercel       │       │                 │                  │
│  └─────────────────┘       └────────┬────────┘                  │
│                                     │                            │
│                            ┌────────┴────────┐                  │
│                            │   Cloud SQL     │                  │
│                            │ (Cosmetics DB)  │                  │
│                            └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Development 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                       Local Development                          │
│                                                                  │
│  localhost:3000 (web)       localhost:3003 (api)                │
│           │                           │                          │
│           ▼                           ▼                          │
│  ┌─────────────────┐       ┌─────────────────┐                  │
│  │ Next.js Dev     │       │ NestJS Dev      │                  │
│  │ Server          │       │ Server          │                  │
│  └─────────────────┘       └────────┬────────┘                  │
│                                     │                            │
│                            ┌────────┴────────┐                  │
│                            │  PostgreSQL     │                  │
│                            │  (localhost)    │                  │
│                            └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 도메인 연결

### 4.1 도메인 구조

| 서비스 | Production | Development |
|--------|------------|-------------|
| cosmetics-web | `cosmetics.neture.co.kr` | `localhost:3000` |
| cosmetics-api | `cosmetics-api.neture.co.kr` | `localhost:3003` |
| Core API | `api.neture.co.kr` | `localhost:3001` |

### 4.2 CORS 설정

**cosmetics-api CORS**

```typescript
// Production
cors: {
  origin: ['https://cosmetics.neture.co.kr'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  credentials: true
}

// Development
cors: {
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  credentials: true
}
```

### 4.3 SSL/TLS

| 환경 | 인증서 |
|------|--------|
| Production | Cloud Run 관리형 또는 Cloudflare |
| Development | 불필요 (localhost) |

---

## 5. 환경변수 규칙

### 5.1 cosmetics-web 환경변수

| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `COSMETICS_API_URL` | O | Cosmetics API URL | `https://cosmetics-api.neture.co.kr` |
| `CORE_API_URL` | O | Core API URL (로그인용) | `https://api.neture.co.kr` |
| `NEXT_PUBLIC_COSMETICS_API_URL` | O | 클라이언트용 API URL | `https://cosmetics-api.neture.co.kr` |

### 5.2 cosmetics-api 환경변수

| 변수명 | 필수 | 설명 | 예시 |
|--------|------|------|------|
| `PORT` | O | API 서버 포트 | `3003` |
| `NODE_ENV` | O | 실행 환경 | `production` |
| `DB_HOST` | O | Cosmetics DB 호스트 | `localhost` 또는 Cloud SQL |
| `DB_PORT` | O | DB 포트 | `5432` |
| `DB_NAME` | O | DB 이름 | `cosmetics` |
| `DB_USERNAME` | O | DB 사용자 | `cosmetics_user` |
| `DB_PASSWORD` | O | DB 비밀번호 | `***` |
| `JWT_PUBLIC_KEY` | O | JWT 검증용 공개키 | Core에서 제공 |
| `CORE_API_URL` | N | Core API URL (선택적 호출용) | `https://api.neture.co.kr` |

### 5.3 환경변수 금지 사항

| 금지 | 이유 |
|------|------|
| `JWT_SECRET` in cosmetics-api | JWT 발급 금지 |
| `CORE_DB_*` in cosmetics-api | Core DB 직접 접근 금지 |
| 하드코딩 URL | 환경 분리 |

---

## 6. 데이터베이스 분리

### 6.1 DB 구성

| DB | 소유자 | 용도 |
|----|--------|------|
| Core DB | Core API | 사용자, 권한, 설정 |
| Cosmetics DB | cosmetics-api | 상품, 브랜드, 가격 |

### 6.2 DB 접근 규칙

```
cosmetics-api
    │
    ├── Cosmetics DB: READ/WRITE ✅
    │
    └── Core DB: READ (제한적) ⚠️
              WRITE ❌ (금지)
```

### 6.3 Connection String 분리

```bash
# cosmetics-api (Cosmetics DB만)
DATABASE_URL=postgresql://cosmetics_user:***@localhost:5432/cosmetics

# Core API (Core DB만)
DATABASE_URL=postgresql://core_user:***@localhost:5432/o4o_platform
```

---

## 7. CI/CD 파이프라인

### 7.1 cosmetics-web 파이프라인

```yaml
# .github/workflows/deploy-cosmetics-web.yml
name: Deploy Cosmetics Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/cosmetics-web/**'
      - 'packages/ui/**'
      - 'packages/types/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: pnpm -F cosmetics-web build
      - name: Deploy to Cloud Run / Vercel
        # ...
```

### 7.2 cosmetics-api 파이프라인

```yaml
# .github/workflows/deploy-cosmetics-api.yml
name: Deploy Cosmetics API

on:
  push:
    branches: [main]
    paths:
      - 'apps/cosmetics-api/**'
      - 'packages/types/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: pnpm -F cosmetics-api build
      - name: Build Docker Image
        run: docker build -t cosmetics-api .
      - name: Deploy to Cloud Run
        # ...
```

### 7.3 독립 배포 원칙

| 서비스 | 배포 트리거 | 독립성 |
|--------|-------------|--------|
| cosmetics-web | apps/cosmetics-web/** 변경 | Core 배포와 독립 |
| cosmetics-api | apps/cosmetics-api/** 변경 | Core 배포와 독립 |

---

## 8. 스케일링 규칙

### 8.1 Cloud Run 설정 (참조)

**cosmetics-web**

```yaml
spec:
  containerConcurrency: 80
  timeoutSeconds: 60
  autoscaling:
    minScale: 0
    maxScale: 10
```

**cosmetics-api**

```yaml
spec:
  containerConcurrency: 100
  timeoutSeconds: 300
  autoscaling:
    minScale: 1
    maxScale: 20
```

### 8.2 스케일링 분리

```
cosmetics-web 트래픽 ──▶ cosmetics-web 스케일링
                           (독립)

cosmetics-api 트래픽 ──▶ cosmetics-api 스케일링
                           (독립)
```

---

## 9. 모니터링 경계

### 9.1 서비스별 모니터링

| 서비스 | 메트릭 |
|--------|--------|
| cosmetics-web | 페이지 로드 시간, 에러율, Core Web Vitals |
| cosmetics-api | 응답 시간, 에러율, DB 쿼리 시간 |

### 9.2 알림 경계

| 알림 | 대상 |
|------|------|
| Web 에러율 > 5% | cosmetics-web 담당 |
| API 응답 > 2s | cosmetics-api 담당 |
| DB 연결 실패 | cosmetics-api + DBA |

---

## 10. 참조 문서

- docs/architecture/cosmetics-api-rules.md
- docs/architecture/cosmetics-web-integration-rules.md
- docs/services/cosmetics/web-api-contract.md
- docs/infra/cloud-run-deployment.md
- CLAUDE.md §8 인프라 정보

---

*이 문서는 Cosmetics 서비스의 배포 경계를 정의합니다.*
