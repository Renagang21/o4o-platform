# {Business} API Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {business}-api의 책임, 금지, 허용 범위를 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 역할 정의

### 1.1 {business}-api의 책임

| 책임 | 설명 |
|------|------|
| {Business} 비즈니스 로직 | 핵심 도메인 기능 |
| {Business} DB 관리 | {business}_* 테이블 CRUD |
| 비즈니스 검증 | 도메인 규칙 검증 |

### 1.2 {business}-api가 아닌 것

| 금지 | 이유 |
|------|------|
| 플랫폼 기능 재구현 | Core API 책임 |
| 인증/권한 처리 | Core Auth 책임 |
| 다른 도메인 비즈니스 | 각 도메인 API 책임 |

---

## 2. 허용 API 범위

{business}-api는 아래 API만 제공할 수 있다.

### 2.1 조회 API

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/{business}/resources` | GET | 리소스 목록 조회 |
| `/{business}/resources/:id` | GET | 리소스 상세 조회 |
| `/{business}/resources/search` | GET | 리소스 검색 |

### 2.2 관리 API (관리자)

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/{business}/admin/resources` | POST | 리소스 등록 |
| `/{business}/admin/resources/:id` | PUT | 리소스 수정 |
| `/{business}/admin/resources/:id/status` | PATCH | 상태 변경 |

### 2.3 로그 조회 API (관리자)

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/{business}/admin/logs/resources` | GET | 리소스 변경 이력 |

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
POST /{business}/users
POST /{business}/auth/login
POST /{business}/auth/token
GET /{business}/settings
POST /{business}/orders
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

{business}-api는 `{business}:*` scope만 사용한다.

```
{business}:read      # 조회
{business}:write     # 수정 (관리자)
{business}:admin     # 관리 기능
```

### 4.3 인증 흐름

```
1. 사용자 → Core API 로그인 → JWT 발급
2. JWT 포함하여 {business}-api 요청
3. {business}-api → JWT 검증 (Core 공개키 사용)
4. 검증 성공 시 요청 처리
```

---

## 5. 데이터 접근 규칙

### 5.1 DB 접근 원칙

| DB | 읽기 | 쓰기 |
|----|------|------|
| {Business} DB | O | O |
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
{business}-web → {business}-api       # 허용
{business}-api → core-api             # 필요 시 허용 (인증 검증 등)
```

### 6.2 금지 통신

```
core-api → {business}-api             # 금지 (역방향)
{business}-api → other-business-api   # 금지 (타 비즈니스)
{business}-api → core 내부 모듈       # 금지 (직접 접근)
```

### 6.3 Core API 호출 시 규칙

{business}-api가 Core API를 호출할 때:

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
| `{BUSINESS}_001` | 리소스 없음 |
| `{BUSINESS}_002` | 유효하지 않은 상태 변경 |
| `{BUSINESS}_401` | 인증 필요 |
| `{BUSINESS}_403` | 권한 없음 |

### 7.2 에러 응답 형식

```json
{
  "error": {
    "code": "{BUSINESS}_001",
    "message": "Resource not found",
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

- CLAUDE.md §15 Business API Template Rules
- docs/architecture/business-api-template.md
- docs/services/{business}/openapi.yaml
- docs/services/{business}/service-flow.md

---

*이 문서는 규칙이며, 이후 모든 {business} API 개발은 이 문서를 기준으로 검증됩니다.*
