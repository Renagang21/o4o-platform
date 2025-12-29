# Cosmetics Service Flow

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 Cosmetics 서비스의 통신 흐름, 인증 흐름, 데이터 흐름을 정의합니다.

---

## 1. 서비스 구성

### 1.1 구성 요소

| 구성 요소 | 역할 | 기술 스택 |
|-----------|------|-----------|
| cosmetics-web | 프론트엔드 | React/Next.js |
| cosmetics-api | 백엔드 API | NestJS |
| Cosmetics DB | 비즈니스 데이터 | PostgreSQL |
| Core API | 플랫폼 인증/설정 | NestJS |
| Core DB | 사용자/권한 데이터 | PostgreSQL |

### 1.2 서비스 관계도

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 브라우저                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        cosmetics-web                             │
│  (React/Next.js 프론트엔드)                                       │
│  - 상품 목록/상세 화면                                            │
│  - 관리자 대시보드                                                │
│  - JWT 저장 및 전달                                               │
└─────────────────────────────────────────────────────────────────┘
                │                               │
                │ API 요청                       │ 로그인 요청
                │ (Bearer JWT)                  │
                ▼                               ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│       cosmetics-api       │    │          Core API             │
│  (NestJS 백엔드)          │◄───│  (인증/사용자 관리)            │
│                           │    │                               │
│  - 상품 CRUD              │    │  - 로그인 처리                 │
│  - 브랜드/라인 관리        │    │  - JWT 발급                   │
│  - 가격 정책              │    │  - 사용자 정보 제공            │
│  - JWT 검증 (verify only) │    │  - 권한/역할 관리              │
└───────────────────────────┘    └───────────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐    ┌───────────────────────────────┐
│      Cosmetics DB         │    │          Core DB              │
│  (cosmetics_* 테이블)     │    │  (users, roles 테이블)        │
│                           │    │                               │
│  - cosmetics_products     │    │  - users (읽기만 허용)        │
│  - cosmetics_brands       │    │  - 쓰기 절대 금지             │
│  - cosmetics_lines        │    │                               │
│  - cosmetics_prices       │    │                               │
└───────────────────────────┘    └───────────────────────────────┘
```

---

## 2. 인증 흐름

### 2.1 로그인 흐름

```
[사용자] ──(1)──▶ [cosmetics-web] ──(2)──▶ [Core API]
                                              │
                                         (3) JWT 발급
                                              │
[사용자] ◀──(5)── [cosmetics-web] ◀──(4)──────┘
   │
   │ JWT 저장 (localStorage/cookie)
   ▼
```

**단계별 설명**:

| 단계 | 설명 |
|------|------|
| (1) | 사용자가 로그인 폼 제출 |
| (2) | cosmetics-web → Core API 로그인 요청 |
| (3) | Core API가 인증 후 JWT 발급 |
| (4) | JWT를 cosmetics-web에 반환 |
| (5) | cosmetics-web이 JWT 저장 |

### 2.2 API 요청 흐름 (인증 필요)

```
[사용자] ──(1)──▶ [cosmetics-web] ──(2)──▶ [cosmetics-api]
                                              │
                                         (3) JWT 검증
                                              │
                                         (4) 비즈니스 로직
                                              │
                                         (5) DB 조회/수정
                                              │
[사용자] ◀──(7)── [cosmetics-web] ◀──(6)──────┘
```

**단계별 설명**:

| 단계 | 설명 |
|------|------|
| (1) | 사용자 액션 (상품 등록 등) |
| (2) | cosmetics-web → cosmetics-api (Bearer JWT 포함) |
| (3) | cosmetics-api가 JWT 검증 (Core 공개키 사용) |
| (4) | Scope 확인 후 비즈니스 로직 실행 |
| (5) | Cosmetics DB 조회/수정 |
| (6) | 결과 반환 |
| (7) | 화면 업데이트 |

### 2.3 JWT 검증 상세

```
┌─────────────────────────────────────────────────────────────────┐
│                      cosmetics-api JWT 검증                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ Authorization 헤더     │
                    │ Bearer <JWT>          │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │ JWT 서명 검증          │
                    │ (Core 공개키 사용)     │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
        검증 실패          검증 성공           만료됨
              │                 │                 │
              ▼                 ▼                 ▼
    401 Unauthorized    Scope 확인        401 Token Expired
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        cosmetics:read  cosmetics:write  cosmetics:admin
              │               │               │
              ▼               ▼               ▼
         조회 허용       수정 허용       관리 허용
```

---

## 3. 데이터 흐름

### 3.1 상품 조회 흐름 (Public)

```
[사용자] ──▶ [cosmetics-web] ──▶ [cosmetics-api] ──▶ [Cosmetics DB]
    │                                                       │
    │                                                  products
    │                                                  brands
    │                                                  lines
    │                                                       │
[화면] ◀── [응답 데이터] ◀────────────────────────────────────┘
```

**특징**:
- 인증 불필요 (Public API)
- Core DB 접근 없음
- Cosmetics DB만 조회

### 3.2 상품 등록 흐름 (Admin)

```
[관리자] ──▶ [cosmetics-web] ──▶ [cosmetics-api]
                                      │
                                 JWT 검증
                                      │
                            cosmetics:admin 확인
                                      │
                              ┌───────┴───────┐
                              │               │
                       유효성 검증      브랜드 존재 확인
                              │               │
                              └───────┬───────┘
                                      │
                              [Cosmetics DB]
                                      │
                               products INSERT
                                      │
                              [감사 로그 저장]
                                      │
                                      ▼
[화면 업데이트] ◀── [생성 결과] ◀─────────┘
```

**감사 로그에 기록되는 정보**:
- `created_by_user_id`: JWT에서 추출한 user_id
- `created_at`: 생성 시점
- `action`: CREATE

### 3.3 가격 변경 흐름 (Admin)

```
[관리자] ──▶ [가격 수정 요청]
                   │
                   ▼
            [cosmetics-api]
                   │
            JWT 검증 + Scope 확인
                   │
                   ▼
        ┌─────────────────────┐
        │  가격 정책 검증      │
        │  - base >= sale     │
        │  - 날짜 유효성       │
        └─────────┬───────────┘
                  │
        ┌─────────┴───────────┐
        │                     │
   검증 성공              검증 실패
        │                     │
        ▼                     ▼
  [가격 업데이트]      COSMETICS_004 반환
        │
  [이력 저장]
        │
        ▼
  [성공 응답]
```

---

## 4. 상태 전이 흐름

### 4.1 상품 상태 전이

```
                    ┌──────────────────┐
                    │      draft       │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              │              ▼
       ┌─────────────┐       │       ┌─────────────┐
       │   visible   │◀──────┴──────▶│   hidden    │
       └──────┬──────┘               └──────┬──────┘
              │                             │
              │         ┌───────────────────┤
              │         │                   │
              ▼         ▼                   ▼
       ┌─────────────────────────────────────────┐
       │               sold_out                   │
       └─────────────────────────────────────────┘
```

**상태 전이 API**:

```
PATCH /cosmetics/admin/products/:id/status
{
  "status": "visible",
  "reason": "판매 시작"
}
```

### 4.2 상태별 조회 가능 여부

| 상태 | Public 조회 | Admin 조회 |
|------|-------------|------------|
| draft | ❌ | ✅ |
| visible | ✅ | ✅ |
| hidden | ❌ | ✅ |
| sold_out | ✅ (표시) | ✅ |

---

## 5. 에러 처리 흐름

### 5.1 인증 에러 흐름

```
[요청] ──▶ [cosmetics-api]
                │
         JWT 검증 실패
                │
                ▼
    ┌───────────────────────┐
    │ 401 Unauthorized      │
    │ {                     │
    │   "error": {          │
    │     "code": "..._401",│
    │     "message": "..."  │
    │   }                   │
    │ }                     │
    └───────────────────────┘
                │
                ▼
    [cosmetics-web 로그인 리다이렉트]
```

### 5.2 비즈니스 에러 흐름

```
[요청] ──▶ [cosmetics-api]
                │
         비즈니스 로직 에러
                │
        ┌───────┴───────┐
        │               │
   404 Not Found   400 Bad Request
        │               │
        ▼               ▼
 COSMETICS_001    COSMETICS_003
 COSMETICS_002    COSMETICS_004
```

---

## 6. 통신 제약 규칙

### 6.1 허용 통신

```
✅ cosmetics-web → cosmetics-api
✅ cosmetics-web → core-api (로그인만)
✅ cosmetics-api → core-api (필요 시, 읽기만)
```

### 6.2 금지 통신

```
❌ core-api → cosmetics-api (역방향)
❌ cosmetics-api → other-business-api (타 비즈니스)
❌ cosmetics-api → core 내부 모듈 (직접 import)
```

### 6.3 DB 접근 제약

```
┌─────────────────────────────────────────────────────────────────┐
│                        cosmetics-api                             │
├─────────────────────────────────────────────────────────────────┤
│  Cosmetics DB    │  Core DB                                     │
│  ───────────     │  ────────                                    │
│  READ    ✅      │  users.id, users.name 읽기 ✅               │
│  WRITE   ✅      │  users 민감정보 읽기 ❌                      │
│  DELETE  ✅      │  WRITE ❌ (절대 금지)                        │
│                  │  roles, permissions ❌                       │
│                  │  apps, settings ❌                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 캐싱 전략

### 7.1 권장 캐싱 레이어

```
[사용자] ──▶ [CDN/브라우저 캐시]
                   │
              Cache Hit
                   │
              Cache Miss
                   ▼
            [cosmetics-api]
                   │
            [Redis 캐시]
                   │
              Cache Hit
                   │
              Cache Miss
                   ▼
            [Cosmetics DB]
```

### 7.2 캐시 TTL 권장값

| 데이터 유형 | TTL | 무효화 조건 |
|-------------|-----|-------------|
| 상품 목록 | 5분 | 상품 변경 시 |
| 상품 상세 | 10분 | 해당 상품 수정 시 |
| 브랜드 목록 | 30분 | 브랜드 변경 시 |
| 가격 정보 | 1분 | 가격 변경 시 |

---

## 8. 모니터링 포인트

### 8.1 핵심 메트릭

| 메트릭 | 임계값 | 알림 |
|--------|--------|------|
| API 응답 시간 | > 500ms | Warning |
| API 응답 시간 | > 2000ms | Critical |
| 에러율 | > 1% | Warning |
| 에러율 | > 5% | Critical |
| JWT 검증 실패 | > 10/min | Warning |

### 8.2 로그 포인트

```
[INFO]  상품 조회 - product_id, response_time
[INFO]  상품 생성 - product_id, user_id
[WARN]  JWT 검증 실패 - client_ip, reason
[ERROR] DB 에러 - query, error_message
```

---

## 9. 참조 문서

- docs/architecture/cosmetics-api-rules.md
- docs/architecture/cosmetics-db-schema.md
- docs/services/cosmetics/api-definition.md
- CLAUDE.md §11 Cosmetics Domain Rules
- CLAUDE.md §12 Cosmetics API Rules

---

*이 문서는 Cosmetics 서비스 개발 및 운영 시 반드시 준수해야 하는 통신/흐름 규칙입니다.*
