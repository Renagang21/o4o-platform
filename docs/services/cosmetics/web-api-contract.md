# Cosmetics Web-API Contract

> **Version**: 1.0
> **Status**: Draft (OpenAPI 스펙 생성 이전)
> **Created**: 2025-12-29

이 문서는 cosmetics-web과 cosmetics-api 간의 호출 계약을 정의합니다.

---

## 1. 공통 규약

### 1.1 Base URL

| 환경 | URL |
|------|-----|
| Production | `https://cosmetics-api.neture.co.kr` |
| Development | `http://localhost:3003` |

### 1.2 공통 요청 헤더

| 헤더 | 필수 | 설명 |
|------|------|------|
| `Authorization` | 조건부 | `Bearer <JWT>` (인증 필요 API) |
| `Content-Type` | O | `application/json` |
| `Accept` | O | `application/json` |
| `X-Request-Id` | 권장 | UUID (추적용) |

### 1.3 공통 응답 헤더

| 헤더 | 설명 |
|------|------|
| `X-Request-Id` | 요청 추적 ID (echo) |
| `X-RateLimit-Limit` | Rate Limit 총량 |
| `X-RateLimit-Remaining` | Rate Limit 잔여 |
| `X-RateLimit-Reset` | Rate Limit 리셋 시간 (Unix timestamp) |

---

## 2. 인증 계약

### 2.1 JWT 전달 방식

```http
GET /cosmetics/products HTTP/1.1
Host: cosmetics-api.neture.co.kr
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

### 2.2 JWT Payload 구조 (참조용)

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "scopes": ["cosmetics:read", "cosmetics:write"],
  "iat": 1704067200,
  "exp": 1704070800
}
```

> JWT 발급은 Core API 책임. cosmetics-api는 검증만 수행.

---

## 3. 엔드포인트 계약

### 3.1 상품 목록 조회

**Request**

```http
GET /cosmetics/products?page=1&limit=20&brand_id=uuid&status=visible
```

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | N | 1 | 페이지 번호 |
| limit | number | N | 20 | 페이지당 항목 (max: 100) |
| brand_id | uuid | N | - | 브랜드 필터 |
| line_id | uuid | N | - | 라인 필터 |
| status | string | N | - | 상태 필터 |
| sort | string | N | created_at | 정렬 필드 |
| order | string | N | desc | 정렬 방향 |

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "상품명",
      "brand": {
        "id": "uuid",
        "name": "브랜드명",
        "slug": "brand-slug"
      },
      "line": {
        "id": "uuid",
        "name": "라인명"
      },
      "description": "상품 설명",
      "status": "visible",
      "price": {
        "base": 50000,
        "sale": 45000,
        "currency": "KRW"
      },
      "images": [
        {
          "url": "https://...",
          "alt": "이미지 설명",
          "is_primary": true
        }
      ],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

---

### 3.2 상품 상세 조회

**Request**

```http
GET /cosmetics/products/:id
```

**Response (200 OK)**

```json
{
  "data": {
    "id": "uuid",
    "name": "상품명",
    "brand": {
      "id": "uuid",
      "name": "브랜드명",
      "slug": "brand-slug",
      "logo_url": "https://..."
    },
    "line": {
      "id": "uuid",
      "name": "라인명"
    },
    "description": "상품 상세 설명",
    "ingredients": ["성분1", "성분2"],
    "status": "visible",
    "price": {
      "base": 50000,
      "sale": 45000,
      "currency": "KRW"
    },
    "variants": [
      {
        "id": "uuid",
        "name": "50ml",
        "sku": "SKU-001",
        "price_modifier": 0
      }
    ],
    "images": [
      {
        "url": "https://...",
        "alt": "이미지 설명",
        "is_primary": true,
        "order": 1
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Response (404)**

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

---

### 3.3 브랜드 목록 조회

**Request**

```http
GET /cosmetics/brands?is_active=true
```

**Response (200 OK)**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "브랜드명",
      "slug": "brand-slug",
      "description": "브랜드 설명",
      "logo_url": "https://...",
      "is_active": true,
      "product_count": 25
    }
  ]
}
```

---

### 3.4 상품 등록 (Admin)

**Request**

```http
POST /cosmetics/admin/products
Authorization: Bearer <JWT with cosmetics:admin>
Content-Type: application/json

{
  "name": "상품명",
  "brand_id": "uuid",
  "line_id": "uuid",
  "description": "상품 설명",
  "ingredients": ["성분1", "성분2"],
  "price": {
    "base": 50000,
    "sale": null
  },
  "status": "draft"
}
```

**Response (201 Created)**

```json
{
  "data": {
    "id": "uuid",
    "name": "상품명",
    "brand": { "id": "uuid", "name": "브랜드명" },
    "status": "draft",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Response (400)**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": "Name is required",
        "brand_id": "Brand not found"
      }
    }
  }
}
```

---

### 3.5 상품 상태 변경 (Admin)

**Request**

```http
PATCH /cosmetics/admin/products/:id/status
Authorization: Bearer <JWT with cosmetics:admin>
Content-Type: application/json

{
  "status": "visible",
  "reason": "판매 시작"
}
```

**Response (200 OK)**

```json
{
  "data": {
    "id": "uuid",
    "status": "visible",
    "previous_status": "draft",
    "changed_at": "2025-01-01T00:00:00Z",
    "changed_by": "user-uuid"
  }
}
```

**Error Response (400)**

```json
{
  "error": {
    "code": "COSMETICS_003",
    "message": "Invalid status transition",
    "details": {
      "from": "sold_out",
      "to": "draft",
      "allowed": ["visible", "hidden"]
    }
  }
}
```

---

## 4. 에러 코드 규약

### 4.1 HTTP Status 매핑

| HTTP Status | 의미 | 사용 상황 |
|-------------|------|-----------|
| 200 | OK | 조회/수정 성공 |
| 201 | Created | 생성 성공 |
| 400 | Bad Request | 유효성 검증 실패, 비즈니스 규칙 위반 |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복, 충돌 |
| 429 | Too Many Requests | Rate Limit 초과 |
| 500 | Internal Server Error | 서버 오류 |

### 4.2 에러 코드 목록

| 코드 | HTTP | 설명 | Web 처리 |
|------|------|------|----------|
| COSMETICS_001 | 404 | 상품 없음 | 404 페이지 |
| COSMETICS_002 | 404 | 브랜드 없음 | 404 페이지 |
| COSMETICS_003 | 400 | 유효하지 않은 상태 변경 | 에러 토스트 |
| COSMETICS_004 | 400 | 가격 정책 오류 | 폼 에러 표시 |
| COSMETICS_401 | 401 | 인증 필요 | 로그인 리다이렉트 |
| COSMETICS_403 | 403 | 권한 없음 | 권한 없음 페이지 |
| COSMETICS_409 | 409 | 중복 데이터 | 에러 토스트 |
| COSMETICS_429 | 429 | 요청 제한 | 재시도 안내 |
| COSMETICS_500 | 500 | 서버 오류 | 일반 에러 페이지 |
| VALIDATION_ERROR | 400 | 유효성 검증 실패 | 폼 필드 에러 표시 |

### 4.3 에러 응답 구조

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {
      "field_name": "error message",
      ...
    }
  }
}
```

---

## 5. 페이지네이션 규약

### 5.1 요청 파라미터

| 파라미터 | 타입 | 기본값 | 최대값 |
|----------|------|--------|--------|
| page | number | 1 | - |
| limit | number | 20 | 100 |

### 5.2 응답 메타 구조

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 6. cosmetics-web 구현 가이드

### 6.1 API 클라이언트 구조

```typescript
// services/cosmetics-api.ts
const API_BASE_URL = process.env.COSMETICS_API_URL;

export const cosmeticsApi = {
  products: {
    list: (params) => fetch(`${API_BASE_URL}/cosmetics/products?${qs(params)}`),
    get: (id) => fetch(`${API_BASE_URL}/cosmetics/products/${id}`),
    create: (data) => fetch(`${API_BASE_URL}/cosmetics/admin/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }),
    updateStatus: (id, data) => fetch(`${API_BASE_URL}/cosmetics/admin/products/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
  },
  brands: {
    list: () => fetch(`${API_BASE_URL}/cosmetics/brands`),
    get: (id) => fetch(`${API_BASE_URL}/cosmetics/brands/${id}`)
  }
};
```

### 6.2 에러 처리 패턴

```typescript
// utils/error-handler.ts
export function handleApiError(error: ApiError) {
  switch (error.code) {
    case 'COSMETICS_401':
      redirectToLogin();
      break;
    case 'COSMETICS_403':
      showForbiddenPage();
      break;
    case 'COSMETICS_001':
    case 'COSMETICS_002':
      showNotFoundPage();
      break;
    case 'VALIDATION_ERROR':
      return { fieldErrors: error.details.fields };
    default:
      showErrorToast(translateError(error.code));
  }
}
```

### 6.3 인증 헤더 생성

```typescript
// utils/auth.ts
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('jwt');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'X-Request-Id': crypto.randomUUID()
  };
}
```

---

## 7. 참조 문서

- docs/services/cosmetics/api-definition.md
- docs/architecture/cosmetics-api-rules.md
- docs/architecture/cosmetics-web-integration-rules.md
- CLAUDE.md §12 Cosmetics API Rules
- CLAUDE.md §13 Cosmetics Web Integration Rules

---

*이 문서는 OpenAPI 스펙 생성 이전 단계의 계약 문서입니다.*
