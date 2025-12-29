# Cosmetics API Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 cosmetics-api의 책임, 금지, 허용 범위를 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 역할 정의

### 1.1 cosmetics-api의 책임

| 책임 | 설명 |
|------|------|
| 화장품 비즈니스 로직 | 상품, 브랜드, 가격 정책 등 |
| Cosmetics DB 관리 | cosmetics_* 테이블 CRUD |
| 비즈니스 검증 | 상품 상태, 가격 유효성 등 |

### 1.2 cosmetics-api가 아닌 것

| 금지 | 이유 |
|------|------|
| 플랫폼 기능 재구현 | Core API 책임 |
| 인증/권한 처리 | Core Auth 책임 |
| 다른 도메인 비즈니스 | 각 도메인 API 책임 |

---

## 2. 허용 API 범위

cosmetics-api는 아래 API만 제공할 수 있다.

### 2.1 상품 조회 API

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/cosmetics/products` | GET | 상품 목록 조회 |
| `/cosmetics/products/:id` | GET | 상품 상세 조회 |
| `/cosmetics/products/search` | GET | 상품 검색 |

### 2.2 상품 관리 API (관리자)

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/cosmetics/admin/products` | POST | 상품 등록 |
| `/cosmetics/admin/products/:id` | PUT | 상품 수정 |
| `/cosmetics/admin/products/:id/status` | PATCH | 상태 변경 (노출/중지/품절) |

### 2.3 브랜드/라인 API

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/cosmetics/brands` | GET | 브랜드 목록 |
| `/cosmetics/brands/:id` | GET | 브랜드 상세 |
| `/cosmetics/lines` | GET | 라인 목록 |

### 2.4 가격 정책 API (관리자)

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/cosmetics/admin/prices/:productId` | GET | 가격 정책 조회 |
| `/cosmetics/admin/prices/:productId` | PUT | 가격 정책 수정 |

### 2.5 로그 조회 API (관리자)

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/cosmetics/admin/logs/products` | GET | 상품 변경 이력 |
| `/cosmetics/admin/logs/prices` | GET | 가격 변경 이력 |

---

## 3. 절대 금지 API

다음 API는 **어떠한 명분으로도 생성할 수 없다**.

| 금지 API | 이유 |
|----------|------|
| 사용자 생성/수정/삭제 | Core Auth 소유 |
| 로그인 / 토큰 발급 | Core Auth 소유 |
| 인증 처리 | Core Auth 소유 |
| 권한/역할 관리 | Core Auth 소유 |
| Core 설정 접근 (apps, settings) | Core 소유 |
| 다른 Business API 호출 | 서비스 간 결합 방지 |
| 결제/주문 처리 | E-commerce Core 소유 |

### 3.1 금지 엔드포인트 예시

```
# 절대 생성 금지
POST /cosmetics/users
POST /cosmetics/auth/login
POST /cosmetics/auth/token
GET /cosmetics/settings
POST /cosmetics/orders
```

---

## 4. 인증 규칙

### 4.1 JWT 처리 원칙

| 허용 | 금지 |
|------|------|
| JWT 검증 (verify) | JWT 발급 (sign) |
| 토큰에서 user_id 추출 | 토큰 갱신 (refresh) |
| Scope 확인 | 새 토큰 생성 |

### 4.2 Scope 규칙

cosmetics-api는 `cosmetics:*` scope만 사용한다.

```
cosmetics:read      # 상품 조회
cosmetics:write     # 상품 수정 (관리자)
cosmetics:admin     # 관리 기능
```

### 4.3 인증 흐름

```
1. 사용자 → Core API 로그인 → JWT 발급
2. JWT 포함하여 cosmetics-api 요청
3. cosmetics-api → JWT 검증 (Core 공개키 사용)
4. 검증 성공 시 요청 처리
```

---

## 5. 데이터 접근 규칙

### 5.1 DB 접근 원칙

| DB | 읽기 | 쓰기 |
|----|------|------|
| Cosmetics DB | O | O |
| Core DB | O (제한적) | **X** |

### 5.2 Core DB 읽기 허용 범위

Core DB에서 읽기만 허용되는 데이터:

| 테이블 | 허용 필드 | 용도 |
|--------|-----------|------|
| `users` | id, name | 감사 로그 표시 |

### 5.3 Core DB 접근 금지 데이터

| 테이블 | 이유 |
|--------|------|
| `users` (민감정보) | email, phone, password 등 |
| `roles`, `permissions` | Auth 도메인 |
| `apps`, `settings` | Platform Core |
| `refresh_tokens` | Auth 도메인 |

### 5.4 FK 제약 금지

```sql
-- 금지: Core 테이블에 FK 설정
FOREIGN KEY (user_id) REFERENCES users(id)

-- 허용: UUID만 저장 (FK 없음)
created_by_user_id uuid  -- FK 제약 없음
```

---

## 6. 통신 규칙

### 6.1 허용 통신 방향

```
cosmetics-web → cosmetics-api       # 허용
cosmetics-api → core-api            # 필요 시 허용 (인증 검증 등)
```

### 6.2 금지 통신

```
core-api → cosmetics-api            # 금지 (역방향)
cosmetics-api → other-business-api  # 금지 (타 비즈니스)
cosmetics-api → core 내부 모듈      # 금지 (직접 접근)
```

### 6.3 Core API 호출 시 규칙

cosmetics-api가 Core API를 호출할 때:

| 허용 | 금지 |
|------|------|
| 공개 엔드포인트만 | 내부 엔드포인트 |
| HTTP 통신만 | 직접 모듈 import |
| 읽기 전용 호출 | 쓰기 호출 |

---

## 7. 에러 처리 규칙

### 7.1 표준 에러 코드

| 코드 | 의미 |
|------|------|
| `COSMETICS_001` | 상품 없음 |
| `COSMETICS_002` | 브랜드 없음 |
| `COSMETICS_003` | 유효하지 않은 상태 변경 |
| `COSMETICS_004` | 가격 정책 오류 |
| `COSMETICS_401` | 인증 필요 |
| `COSMETICS_403` | 권한 없음 |

### 7.2 에러 응답 형식

```json
{
  "error": {
    "code": "COSMETICS_001",
    "message": "Product not found",
    "details": {}
  }
}
```

---

## 8. 위반 시 조치

본 규칙을 위반하는 작업은 **즉시 중단 및 재설계 대상**이다.

| 위반 유형 | 조치 |
|-----------|------|
| 금지 API 생성 | 즉시 삭제 |
| JWT 발급 구현 | 즉시 제거 |
| Core DB 쓰기 | 롤백 및 재설계 |
| 타 Business API 호출 | 제거 및 아키텍처 검토 |
| FK 제약 설정 | FK 제거 |

---

## 9. 참조 문서

- CLAUDE.md §11 Cosmetics Domain Rules
- CLAUDE.md §12 Cosmetics API Rules
- docs/architecture/cosmetics-db-schema.md
- docs/services/cosmetics/api-definition.md
- docs/services/cosmetics/service-flow.md

---

*이 문서는 규칙이며, 이후 모든 cosmetics API 개발은 이 문서를 기준으로 검증됩니다.*
