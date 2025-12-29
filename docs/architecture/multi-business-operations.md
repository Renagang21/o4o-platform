# Multi-Business Operations Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 여러 Business 서비스가 동시에 운영될 때의 규칙을 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 적용 대상

### 1.1 현재 Business 서비스

| 서비스 | 도메인 | 상태 |
|--------|--------|------|
| cosmetics | 화장품 | Planned (템플릿 원본) |
| yaksa | 약사 서비스 | Planned |
| dropshipping | 드롭십핑 | Planned |
| tourism | 관광 서비스 | Planned |

### 1.2 구성 요소

각 Business 서비스는 다음으로 구성된다:

```
{business} 서비스
├── {business}-web       # 프론트엔드
├── {business}-api       # 백엔드 API
└── {business}_db        # 전용 DB (또는 스키마)
```

---

## 2. 독립성 원칙

### 2.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **배포 독립** | 각 서비스는 독립 배포 단위 |
| **데이터 독립** | 각 서비스는 자체 DB/스키마 소유 |
| **장애 격리** | 하나의 장애가 다른 서비스에 영향 없음 |
| **버전 독립** | 각 서비스는 독립 버전 관리 |

### 2.2 서비스 격리 다이어그램

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Core API Layer                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                       Core API (공유)                            │ │
│  │    • 인증/권한    • 사용자 관리    • 플랫폼 설정                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│    cosmetics 서비스   │ │     yaksa 서비스      │ │  dropshipping 서비스  │
│ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │  cosmetics-web   │ │ │ │    yaksa-web     │ │ │ │ dropshipping-web │ │
│ └────────┬─────────┘ │ │ └────────┬─────────┘ │ │ └────────┬─────────┘ │
│          │           │ │          │           │ │          │           │
│          ▼           │ │          ▼           │ │          ▼           │
│ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │  cosmetics-api   │ │ │ │    yaksa-api     │ │ │ │ dropshipping-api │ │
│ └────────┬─────────┘ │ │ └────────┬─────────┘ │ │ └────────┬─────────┘ │
│          │           │ │          │           │ │          │           │
│          ▼           │ │          ▼           │ │          ▼           │
│ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │
│ │   cosmetics_db   │ │ │ │     yaksa_db     │ │ │ │ dropshipping_db  │ │
│ └──────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 3. 통신 규칙

### 3.1 허용 통신 경로

```
┌─────────────────────────────────────────────────────────────────────┐
│                          허용 통신 경로                               │
├─────────────────────────────────────────────────────────────────────┤
│  {business}-web → {business}-api          ✅ 동일 도메인 내 통신     │
│  {business}-web → Core API (로그인만)     ✅ 인증 전용               │
│  {business}-api → Core API (검증/조회)    ✅ JWT 검증, 사용자 조회   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 금지 통신 경로

```
┌─────────────────────────────────────────────────────────────────────┐
│                          금지 통신 경로                               │
├─────────────────────────────────────────────────────────────────────┤
│  cosmetics-api → yaksa-api                ❌ 서비스 간 직접 호출     │
│  cosmetics-web → yaksa-api                ❌ 타 서비스 API 호출      │
│  cosmetics-api → yaksa_db                 ❌ 타 서비스 DB 접근       │
│  Core API → {business}-api                ❌ 역방향 호출             │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 예외: 서비스 간 통합이 필요한 경우

서비스 간 통합이 비즈니스적으로 필요한 경우:

| 방법 | 설명 | 예시 |
|------|------|------|
| **이벤트 기반** | 메시지 큐를 통한 비동기 통신 | 주문 이벤트 → 재고 감소 |
| **API Gateway** | 중앙 게이트웨이를 통한 라우팅 | 통합 검색 |
| **Core 중재** | Core API가 중재자 역할 | 통합 대시보드 |

> ⚠ 위 방법도 반드시 별도 Work Order 승인 필요

---

## 4. 데이터베이스 규칙

### 4.1 DB 분리 원칙

| 원칙 | 설명 |
|------|------|
| **전용 DB/스키마** | 각 서비스는 자체 DB 또는 스키마 소유 |
| **테이블 네이밍** | `{business}_` 접두사 필수 |
| **FK 금지** | 타 서비스 테이블에 FK 설정 금지 |
| **직접 접근 금지** | API를 통해서만 데이터 접근 |

### 4.2 테이블 네이밍 규칙

```sql
-- cosmetics 서비스
cosmetics_products
cosmetics_brands
cosmetics_product_lines
cosmetics_prices
cosmetics_audit_logs

-- yaksa 서비스
yaksa_pharmacies
yaksa_prescriptions
yaksa_consultations

-- dropshipping 서비스
dropshipping_suppliers
dropshipping_products
dropshipping_orders
```

### 4.3 Core 데이터 참조 규칙

| 허용 | 금지 |
|------|------|
| user_id UUID 저장 (FK 없음) | users 테이블 FK 설정 |
| Core API 통해 사용자 정보 조회 | Core DB 직접 쿼리 |
| 감사 로그에 user_id 기록 | Core DB에 데이터 쓰기 |

```sql
-- 허용: Soft FK
CREATE TABLE cosmetics_products (
  id uuid PRIMARY KEY,
  created_by_user_id uuid,  -- FK 제약 없음
  ...
);

-- 금지: Hard FK
CREATE TABLE cosmetics_products (
  id uuid PRIMARY KEY,
  created_by_user_id uuid REFERENCES users(id),  -- ❌
  ...
);
```

---

## 5. 인증 통합 규칙

### 5.1 JWT 단일 진실 원본

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Core API (JWT 발급자)                         │
│                                                                      │
│  • JWT 발급 유일 권한                                                 │
│  • 사용자 인증 처리                                                   │
│  • Scope 관리                                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ JWT (동일 토큰)
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            cosmetics-api     yaksa-api     dropshipping-api
            (검증만)          (검증만)      (검증만)
```

### 5.2 Scope 분리

각 서비스는 자체 Scope 네임스페이스를 가진다:

```
cosmetics:read       # Cosmetics 조회
cosmetics:write      # Cosmetics 수정
cosmetics:admin      # Cosmetics 관리

yaksa:read           # Yaksa 조회
yaksa:write          # Yaksa 수정
yaksa:admin          # Yaksa 관리

dropshipping:read    # Dropshipping 조회
dropshipping:write   # Dropshipping 수정
dropshipping:admin   # Dropshipping 관리
```

### 5.3 JWT 내 Scope 예시

```json
{
  "sub": "user-uuid",
  "scopes": [
    "cosmetics:read",
    "cosmetics:admin",
    "yaksa:read"
  ],
  "exp": 1735500000
}
```

---

## 6. 도메인 및 배포 규칙

### 6.1 도메인 구조

| 서비스 | Web 도메인 | API 도메인 |
|--------|------------|------------|
| cosmetics | cosmetics.neture.co.kr | cosmetics-api.neture.co.kr |
| yaksa | yaksa.neture.co.kr | yaksa-api.neture.co.kr |
| dropshipping | dropshipping.neture.co.kr | dropshipping-api.neture.co.kr |
| Core | - | api.neture.co.kr |

### 6.2 포트 할당 (개발 환경)

| 서비스 | Web 포트 | API 포트 |
|--------|----------|----------|
| Core | - | 3001 |
| cosmetics | 4001 | 4002 |
| yaksa | 4011 | 4012 |
| dropshipping | 4021 | 4022 |
| tourism | 4031 | 4032 |

### 6.3 독립 배포

```yaml
# 각 서비스는 독립 배포 트리거

cosmetics-web:
  paths:
    - 'apps/cosmetics-web/**'

cosmetics-api:
  paths:
    - 'apps/cosmetics-api/**'

yaksa-web:
  paths:
    - 'apps/yaksa-web/**'

yaksa-api:
  paths:
    - 'apps/yaksa-api/**'
```

---

## 7. 공유 리소스 규칙

### 7.1 허용 공유 패키지

| 패키지 | 용도 | 공유 범위 |
|--------|------|-----------|
| @o4o/types | 공통 타입 정의 | 모든 서비스 |
| @o4o/utils | 유틸리티 함수 | 모든 서비스 |
| @o4o/ui | UI 컴포넌트 | 모든 Web |
| @o4o/auth-client | 인증 클라이언트 | 모든 Web |

### 7.2 금지 공유

| 금지 | 이유 |
|------|------|
| 도메인 Entity 공유 | 서비스 결합 발생 |
| 비즈니스 로직 공유 | 독립성 훼손 |
| DB 연결 공유 | 데이터 격리 위반 |

---

## 8. 장애 격리 규칙

### 8.1 장애 영향 범위

| 장애 발생 | 영향 범위 |
|-----------|-----------|
| cosmetics-api 장애 | cosmetics 서비스만 |
| yaksa-web 장애 | yaksa Web만 |
| Core API 장애 | 모든 서비스 인증 |

### 8.2 헬스 체크

각 서비스는 독립 헬스 체크 엔드포인트를 가진다:

```
GET https://cosmetics-api.neture.co.kr/health
GET https://yaksa-api.neture.co.kr/health
GET https://dropshipping-api.neture.co.kr/health
```

### 8.3 Circuit Breaker 패턴

Core API 호출 시 Circuit Breaker 적용:

```typescript
// Core API 호출 시
const coreApiCall = circuitBreaker(
  async () => coreApi.getUser(userId),
  {
    timeout: 5000,
    errorThreshold: 50,
    resetTimeout: 30000,
  }
);
```

---

## 9. 모니터링 및 로깅

### 9.1 서비스별 로그 분리

| 서비스 | 로그 식별자 |
|--------|-------------|
| cosmetics-api | `[COSMETICS]` |
| yaksa-api | `[YAKSA]` |
| dropshipping-api | `[DROPSHIPPING]` |

### 9.2 상관 관계 추적

서비스 간 추적을 위해 X-Request-Id 헤더 전파:

```
Browser → cosmetics-web → cosmetics-api → Core API
                X-Request-Id: abc-123 (동일)
```

---

## 10. 신규 서비스 추가 절차

### 10.1 체크리스트

1. [ ] 템플릿에서 복사 (business-api-template, business-web-template)
2. [ ] 플레이스홀더 치환
3. [ ] 도메인/포트 할당 확인
4. [ ] DB/스키마 생성
5. [ ] Scope 정의 (Core에 등록 요청)
6. [ ] 환경변수 설정
7. [ ] 배포 파이프라인 설정
8. [ ] 헬스 체크 구현

### 10.2 금지 절차

| 금지 | 대안 |
|------|------|
| 템플릿 없이 신규 생성 | 템플릿 복사 |
| 기존 서비스 코드 복사 | 템플릿 사용 |
| 공유 모듈에 도메인 로직 추가 | 서비스 내 구현 |

---

## 11. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 서비스 간 직접 호출 | 즉시 제거 |
| 타 서비스 DB 접근 | 즉시 제거 및 재설계 |
| Core 테이블 FK 설정 | FK 제거 |
| 공유 패키지에 도메인 로직 | 서비스로 이전 |
| 템플릿 미사용 | 템플릿에서 재시작 |

---

## 12. 참조 문서

- docs/architecture/business-api-template.md
- docs/architecture/business-web-template.md
- docs/templates/business-api-template/
- docs/templates/business-web-template/
- CLAUDE.md §15 Business API Template Rules
- CLAUDE.md §16 Business Web Template Rules

---

*이 문서는 모든 Business 서비스의 동시 운영 규칙이며, 위반 시 즉시 작업 중단 대상입니다.*
