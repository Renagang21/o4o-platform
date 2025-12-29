# Cosmetics Web Integration Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 cosmetics-web과 cosmetics-api 간의 연동 규칙을 정의합니다.
**설명이 아닌 준수 규칙**이며, 위반 시 즉시 작업 중단 대상입니다.

---

## 1. 역할 분리 원칙

### 1.1 구성 요소별 책임

| 구성 요소 | 책임 | 금지 |
|-----------|------|------|
| **cosmetics-web** | UI/UX, 상태 표현, 사용자 상호작용 | 비즈니스 로직, DB 접근 |
| **cosmetics-api** | 비즈니스 로직, 검증, DB CRUD | JWT 발급, 사용자 관리 |
| **core-api** | 인증, 권한, 사용자 관리 | 도메인 비즈니스 로직 |

### 1.2 역할 위반 예시

```
# 금지: cosmetics-web에서 비즈니스 검증
if (product.price < 0) { ... }  // ❌ API에서 처리

# 금지: cosmetics-web에서 DB 접근
const products = await db.query('SELECT...')  // ❌ 절대 금지

# 금지: cosmetics-api에서 JWT 발급
jwt.sign({ user_id: ... })  // ❌ Core API 책임
```

---

## 2. 호출 규칙

### 2.1 허용 호출 경로

```
┌─────────┐    ┌───────────────┐    ┌───────────────┐    ┌──────────┐
│ Browser │───▶│ cosmetics-web │───▶│ cosmetics-api │───▶│ core-api │
└─────────┘    └───────────────┘    └───────────────┘    └──────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │ Cosmetics DB│
                                    └─────────────┘
```

### 2.2 금지 호출 경로

| 경로 | 상태 | 이유 |
|------|------|------|
| Browser → cosmetics-api | ❌ **금지** | CORS, 보안 |
| cosmetics-web → core-api | ❌ **금지** | 계층 분리 |
| cosmetics-api → cosmetics-web | ❌ **금지** | 역방향 |
| core-api → cosmetics-api | ❌ **금지** | 역방향 |

### 2.3 호출 흐름 상세

```
[사용자 액션]
     │
     ▼
[cosmetics-web] ── HTTP Request ──▶ [cosmetics-api]
     │                                     │
     │                               JWT 검증
     │                                     │
     │                              비즈니스 처리
     │                                     │
     │                              DB 조회/수정
     │                                     │
[화면 업데이트] ◀── HTTP Response ──────────┘
```

---

## 3. 인증/권한 규칙

### 3.1 인증 흐름

```
[로그인]
Browser → cosmetics-web → core-api → JWT 발급
                              │
                              ▼
                    cosmetics-web에 JWT 전달
                              │
                              ▼
                    localStorage/cookie 저장

[API 호출]
cosmetics-web → cosmetics-api
    │
    └── Header: Authorization: Bearer <JWT>
```

### 3.2 JWT 처리 원칙

| 역할 | cosmetics-web | cosmetics-api | core-api |
|------|---------------|---------------|----------|
| JWT 발급 | ❌ | ❌ | ✅ |
| JWT 저장 | ✅ | ❌ | ❌ |
| JWT 전달 | ✅ | ✅ (검증 후) | - |
| JWT 검증 | ❌ | ✅ | ✅ |
| JWT 갱신 | 요청만 | ❌ | ✅ |

### 3.3 Scope 규칙

cosmetics-web이 요청하는 API는 아래 Scope만 사용:

```
cosmetics:read      # 상품/브랜드 조회
cosmetics:write     # 상품 수정 (관리자)
cosmetics:admin     # 관리 기능
```

### 3.4 권한 검증 위치

| 검증 유형 | 위치 | 방법 |
|-----------|------|------|
| 로그인 여부 | cosmetics-web | JWT 존재 확인 |
| Scope 권한 | cosmetics-api | JWT payload 확인 |
| 비즈니스 권한 | cosmetics-api | DB 조회 후 확인 |

---

## 4. 라우팅 규칙

### 4.1 cosmetics-web 라우트 구조

```
/                       # 메인 페이지
/products               # 상품 목록
/products/:id           # 상품 상세
/brands                 # 브랜드 목록
/brands/:id             # 브랜드 상세
/admin                  # 관리자 대시보드 (권한 필요)
/admin/products         # 상품 관리
/admin/products/new     # 상품 등록
/admin/products/:id     # 상품 수정
```

### 4.2 금지 라우트

```
/api/*                  ❌  # 웹에서 API 라우트 처리 금지
/auth/*                 ❌  # 인증 라우트는 Core 담당
/users/*                ❌  # 사용자 관리는 Core 담당
```

### 4.3 API Base URL 설정

```typescript
// 환경변수로만 설정 (하드코딩 금지)
const API_BASE_URL = process.env.COSMETICS_API_URL;

// 금지: 하드코딩
const API_BASE_URL = 'https://api.cosmetics.example.com';  // ❌
```

---

## 5. 에러 처리 규칙

### 5.1 에러 처리 책임

| 계층 | 책임 |
|------|------|
| cosmetics-api | 의미 있는 HTTP Status + 에러 코드 반환 |
| cosmetics-web | 사용자 친화적 메시지 표시 |

### 5.2 에러 응답 형식 (API)

```json
{
  "error": {
    "code": "COSMETICS_001",
    "message": "Product not found",
    "details": {
      "product_id": "uuid"
    }
  }
}
```

### 5.3 에러 처리 (Web)

```typescript
// 허용: 에러 메시지 가공
const message = translateError(error.code);
showToast(message);

// 금지: Core 에러 그대로 노출
showToast(error.message);  // ❌ 원본 메시지 노출 금지
```

### 5.4 HTTP Status 매핑

| Status | cosmetics-web 처리 |
|--------|-------------------|
| 400 | 입력 오류 안내 |
| 401 | 로그인 페이지 리다이렉트 |
| 403 | 권한 없음 안내 |
| 404 | 404 페이지 표시 |
| 409 | 충돌 상황 안내 |
| 500 | 일반 오류 안내 |

---

## 6. 데이터 흐름 규칙

### 6.1 상태 관리 원칙

| 상태 유형 | 저장 위치 | 예시 |
|-----------|-----------|------|
| 서버 상태 | API 호출 결과 (캐시) | 상품 목록, 브랜드 정보 |
| UI 상태 | 로컬 상태 | 모달 열림/닫힘, 폼 입력 |
| 인증 상태 | JWT (localStorage) | 로그인 여부 |

### 6.2 데이터 요청 규칙

```typescript
// 허용: API를 통한 데이터 요청
const products = await fetch(`${API_BASE_URL}/cosmetics/products`);

// 금지: 직접 DB 접근
const products = await db.query('SELECT * FROM cosmetics_products');  // ❌

// 금지: 다른 API 직접 호출
const users = await fetch(`${CORE_API_URL}/users`);  // ❌
```

### 6.3 캐싱 규칙

| 데이터 | 캐시 TTL | 무효화 조건 |
|--------|----------|-------------|
| 상품 목록 | 5분 | 상품 변경 시 |
| 상품 상세 | 10분 | 해당 상품 수정 시 |
| 브랜드 목록 | 30분 | 브랜드 변경 시 |

---

## 7. 보안 규칙

### 7.1 CORS 정책

```
# cosmetics-api CORS 설정
Access-Control-Allow-Origin: https://cosmetics.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, X-Request-Id
```

### 7.2 민감 정보 처리

| 정보 유형 | cosmetics-web | cosmetics-api |
|-----------|---------------|---------------|
| 비밀번호 | 입력만, 저장 ❌ | 처리 ❌ |
| JWT | 저장 (httpOnly 권장) | 검증만 |
| 개인정보 | 표시만 | 저장 ❌ |

### 7.3 입력 검증 규칙

| 검증 유형 | cosmetics-web | cosmetics-api |
|-----------|---------------|---------------|
| 형식 검증 | ✅ (UX용) | ✅ (필수) |
| 비즈니스 검증 | ❌ | ✅ |
| 보안 검증 | ❌ | ✅ |

---

## 8. 금지 사항 (절대 규칙)

### 8.1 cosmetics-web 금지 목록

| 금지 사항 | 이유 |
|-----------|------|
| 비즈니스 검증 로직 구현 | API 책임 |
| DB/ORM 직접 접근 | 계층 분리 |
| Core 설정 직접 참조 | 도메인 분리 |
| JWT 발급/검증 | Core 책임 |
| API URL 하드코딩 | 환경 분리 |
| 다른 API 직접 호출 | 계층 분리 |

### 8.2 위반 예시

```typescript
// ❌ 비즈니스 검증 로직
if (product.status === 'draft' && !user.isAdmin) {
  return <NotFound />;  // API에서 처리해야 함
}

// ❌ Core 설정 참조
const settings = await fetch('/api/settings');

// ❌ 다른 API 호출
const user = await fetch(`${CORE_API_URL}/users/${userId}`);
```

---

## 9. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| Browser → API 직접 호출 | 즉시 제거 |
| Web에서 비즈니스 로직 | API로 이전 |
| Web에서 DB 접근 | 즉시 제거, 재설계 |
| 하드코딩 URL | 환경변수로 변경 |
| Core API 직접 호출 | cosmetics-api 경유로 변경 |

---

## 10. 참조 문서

- docs/architecture/cosmetics-api-rules.md
- docs/services/cosmetics/api-definition.md
- docs/services/cosmetics/service-flow.md
- docs/services/cosmetics/web-api-contract.md
- docs/services/cosmetics/deployment-boundary.md
- CLAUDE.md §12 Cosmetics API Rules
- CLAUDE.md §13 Cosmetics Web Integration Rules

---

*이 문서는 규칙이며, 모든 cosmetics-web 개발은 이 문서를 기준으로 검증됩니다.*
