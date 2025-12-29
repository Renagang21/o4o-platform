# {Business} Web Deployment Boundary

> **Version**: 1.0
> **Status**: Reference
> **Created**: {date}

이 문서는 {business}-web의 빌드/배포 단위, 도메인 연결, 환경변수 기준을 정의합니다.

---

## 1. 서비스 분리 원칙

### 1.1 배포 단위

| 서비스 | 배포 단위 | 런타임 |
|--------|-----------|--------|
| {business}-web | 독립 | Static / SSR (Next.js) |
| {business}-api | 독립 | Node.js (NestJS) |
| Core API | 공유 (o4o-core-api) | Node.js (NestJS) |

### 1.2 분리 이유

- 독립 배포 / 독립 스케일링 / 독립 버전 관리
- Web과 API의 릴리스 주기 분리
- 장애 격리

---

## 2. 빌드 규칙

### 2.1 {business}-web 빌드

```yaml
build_command: "pnpm build"
output_directory: ".next"

framework: Next.js 14+
node_version: 20.x

dependencies:
  - "@o4o/ui"
  - "@o4o/types"
  - "@o4o/auth-client"

env:
  NEXT_PUBLIC_{BUSINESS}_API_URL: "https://{business}-api.neture.co.kr"
  NEXT_PUBLIC_CORE_API_URL: "https://api.neture.co.kr"
```

### 2.2 빌드 명령

```bash
# 개발
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 실행
pnpm start
```

---

## 3. 배포 환경

### 3.1 Production 구성

```
DNS / CDN
   │
   ├── {business}.neture.co.kr → Cloud Run (Web)
   │                                    │
   │                              ┌─────┴─────┐
   │                              │  Next.js  │
   │                              │   SSR     │
   │                              └─────┬─────┘
   │                                    │
   │                                    ▼
   │                         {business}-api.neture.co.kr
   │                                    │
   └────────────────────────────────────┘
```

### 3.2 Development 구성

```
localhost:3000 ({business}-web)
       │
       ▼
localhost:{port} ({business}-api)
       │
       ▼
  PostgreSQL (localhost)
```

---

## 4. 도메인 연결

### 4.1 도메인 구조

| 서비스 | Production | Development |
|--------|------------|-------------|
| {business}-web | `{business}.neture.co.kr` | `localhost:3000` |
| {business}-api | `{business}-api.neture.co.kr` | `localhost:{port}` |
| Core API | `api.neture.co.kr` | `localhost:3001` |

### 4.2 SSL/TLS

- Production: Cloud Run 관리형 SSL
- Development: 없음 (HTTP)

---

## 5. 환경변수 규칙

### 5.1 필수 환경변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_{BUSINESS}_API_URL` | O | 클라이언트용 API URL |
| `NEXT_PUBLIC_CORE_API_URL` | O | 클라이언트용 Core URL |
| `{BUSINESS}_API_URL` | O | 서버용 API URL |
| `CORE_API_URL` | O | 서버용 Core URL |

### 5.2 선택 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `NODE_ENV` | 실행 환경 | development |
| `PORT` | 서버 포트 | 3000 |

### 5.3 금지 환경변수

| 변수명 | 이유 |
|--------|------|
| `JWT_SECRET` | JWT 발급 금지 |
| `DB_*` | DB 접근 금지 |
| `{BUSINESS}_DB_*` | DB 접근 금지 |

---

## 6. CI/CD 파이프라인

### 6.1 GitHub Actions

```yaml
# .github/workflows/deploy-{business}-web.yml
name: Deploy {Business} Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/{business}-web/**'
      - 'packages/ui/**'
      - 'packages/types/**'
      - 'packages/auth-client/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm -F {business}-web build
        env:
          NEXT_PUBLIC_{BUSINESS}_API_URL: ${{ secrets.{BUSINESS}_API_URL }}

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: {business}-web
          region: asia-northeast3
          source: apps/{business}-web
```

### 6.2 배포 트리거

| 트리거 경로 | 서비스 |
|-------------|--------|
| `apps/{business}-web/**` | {business}-web |
| `packages/ui/**` | 모든 Web |
| `packages/types/**` | 모든 Web/API |

### 6.3 독립 배포 원칙

| 서비스 | 배포 트리거 | 독립성 |
|--------|-------------|--------|
| {business}-web | apps/{business}-web/** 변경 | API 배포와 독립 |
| {business}-api | apps/{business}-api/** 변경 | Web 배포와 독립 |

---

## 7. Cloud Run 설정

### 7.1 서비스 설정

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: {business}-web
spec:
  template:
    spec:
      containers:
        - image: gcr.io/{project}/{business}-web:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_{BUSINESS}_API_URL
              value: https://{business}-api.neture.co.kr
          resources:
            limits:
              memory: 512Mi
              cpu: 1000m
```

### 7.2 스케일링 설정

```yaml
annotations:
  autoscaling.knative.dev/minScale: "0"
  autoscaling.knative.dev/maxScale: "10"
```

---

## 8. 모니터링

### 8.1 헬스 체크

```typescript
// app/api/health/route.ts (예외적으로 허용)
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

### 8.2 로깅

- Cloud Run 기본 로깅 사용
- 구조화된 JSON 로그 형식

---

## 9. 참조 문서

- docs/architecture/business-web-template.md
- docs/services/{business}/web-rules.md
- docs/infra/cloud-run-deployment.md
- CLAUDE.md §8 인프라 정보

---

*이 문서는 {business}-web의 배포 경계를 정의합니다.*
