# App API Reference

> **Status**: 🔒 FROZEN (G6 Phase)
> **Frozen Date**: 2025-12-25

이 디렉토리는 **동결된 Reference Implementation**입니다.
모든 새 App API는 이 디렉토리를 복사하여 시작해야 합니다.

## 동결 상태

```
🔒 구조 변경 금지
🔒 기능 추가 금지
🔒 의존성 추가 금지
⭕ 버그 수정만 허용
⭕ 보안 패치만 허용
```

수정이 필요한 경우 [reference-freeze-policy.md](../../docs/_platform/reference-freeze-policy.md)를 참조하세요.

---

## Quick Start

```bash
# 새 App API 생성
cp -r apps/app-api-reference apps/{new-api-name}

# 의존성 설치
pnpm install

# 개발 서버
pnpm -F @o4o/{new-api-name} dev

# 빌드
pnpm -F @o4o/{new-api-name} build
```

## Structure

```
apps/app-api-reference/
├── src/
│   ├── config/
│   │   └── env.ts              # 환경변수 설정
│   ├── middleware/
│   │   └── auth.middleware.ts  # Core API 인증 위임
│   ├── routes/
│   │   ├── health.routes.ts    # Health 엔드포인트 (필수)
│   │   └── api.routes.ts       # API 엔드포인트 예제
│   └── main.ts                 # 진입점
├── Dockerfile                  # Cloud Run 배포
├── package.json
└── tsconfig.json
```

## Key Principles

| 원칙 | 설명 |
|------|------|
| **인증 위임** | 모든 인증은 Core API에 위임 |
| **DB 직접 접근 금지** | Core API 엔드포인트만 사용 |
| **Health 필수** | `/health`, `/health/ready` 구현 필수 |
| **Cloud Run 호환** | K_SERVICE 환경 감지 지원 |

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Liveness check |
| `/health/ready` | GET | No | Readiness check (Core API 연결 확인) |
| `/api/v1/me` | GET | Yes | 현재 사용자 정보 |
| `/api/v1/public/info` | GET | No | 서비스 정보 |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | 환경 |
| `PORT` | No | 3100 | 서버 포트 |
| `HOST` | No | 0.0.0.0 | 바인딩 호스트 |
| `CORE_API_URL` | Yes (prod) | http://localhost:4000 | Core API URL |

## 새 App API 생성 절차

### 1단계: Reference 복사

```bash
cp -r apps/app-api-reference apps/{new-api-name}
```

### 2단계: 필수 수정

```bash
# package.json
- "name": "@o4o/app-api-reference" → "@o4o/{new-api-name}"
- "description": 변경

# src/config/env.ts
- PORT 기본값 변경 (충돌 방지)

# src/routes/health.routes.ts
- service: 'app-api-reference' → '{new-api-name}'

# src/main.ts
- 서버명, 엔드포인트 설명 변경

# Dockerfile
- 주석의 서비스명 변경
```

### 3단계: 도메인 로직 추가

```bash
# 새 라우트 파일 생성
src/routes/{domain}.routes.ts

# main.ts에 등록
app.use('/api/v1/{domain}', domainRoutes);

# 불필요한 api.routes.ts 삭제 가능
```

### 4단계: 검증

```bash
pnpm -F @o4o/{new-api-name} type-check
pnpm -F @o4o/{new-api-name} build
```

## ❌ 복사 후 금지 사항

| 금지 | 이유 |
|------|------|
| Health 엔드포인트 삭제 | 배포 필수 요소 |
| auth.middleware.ts 삭제 | 인증 규칙 위반 |
| 직접 DB 연결 | 계층 규칙 위반 |
| API URL 하드코딩 | 환경 분리 위반 |

## Reference

- [reference-freeze-policy.md](../../docs/_platform/reference-freeze-policy.md) - 동결 정책
- [app-api-architecture.md](../../docs/_platform/app-api-architecture.md) - 아키텍처 규칙
- [core-boundary.md](../../docs/_platform/core-boundary.md) - Core/Domain 경계
- [CLAUDE.md](../../CLAUDE.md) - 플랫폼 헌법
