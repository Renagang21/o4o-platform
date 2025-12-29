# Cosmetics API Definition

> **Version**: 1.0
> **Status**: Draft (OpenAPI 이전 단계)
> **Created**: 2025-12-29

이 문서는 cosmetics-api의 실제 엔드포인트, 요청/응답 스키마를 정의합니다.

---

## 1. 기본 정보

### 1.1 Base URL

| 환경 | URL |
|------|-----|
| Production | `https://cosmetics-api.neture.co.kr` |
| Development | `http://localhost:3003` |

### 1.2 공통 헤더

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

### 1.3 인증 요구사항

| 접근 레벨 | 요구사항 |
|-----------|----------|
| Public | 인증 불필요 |
| User | JWT 필수 (cosmetics:read) |
| Admin | JWT 필수 (cosmetics:admin) |

---

## 2. 상품 API

### 2.1 상품 목록 조회

```
GET /cosmetics/products
```

**Access**: Public

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 (default: 1) |
| limit | number | N | 페이지당 항목 수 (default: 20, max: 100) |
| brand_id | uuid | N | 브랜드 필터 |
| line_id | uuid | N | 라인 필터 |
| status | string | N | 상태 필터 (visible, hidden, sold_out) |
| sort | string | N | 정렬 (created_at, price, name) |
| order | string | N | 정렬 방향 (asc, desc) |

**Response** (200 OK):

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

### 2.2 상품 상세 조회

```
GET /cosmetics/products/:id
```

**Access**: Public

**Path Parameters**:

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | uuid | 상품 ID |

**Response** (200 OK):

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
    "images": [...],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses**:

| 코드 | 상황 |
|------|------|
| 404 | 상품 없음 (COSMETICS_001) |

---

## 3. 브랜드 API

### 3.1 브랜드 목록 조회

```
GET /cosmetics/brands
```

**Access**: Public

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| is_active | boolean | N | 활성 브랜드만 (default: true) |

**Response** (200 OK):

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

### 3.2 브랜드 상세 조회

```
GET /cosmetics/brands/:id
```

**Access**: Public

**Response** (200 OK):

```json
{
  "data": {
    "id": "uuid",
    "name": "브랜드명",
    "slug": "brand-slug",
    "description": "브랜드 상세 설명",
    "logo_url": "https://...",
    "is_active": true,
    "lines": [
      {
        "id": "uuid",
        "name": "라인명",
        "product_count": 10
      }
    ],
    "product_count": 25
  }
}
```

---

## 4. 관리자 API

### 4.1 상품 등록

```
POST /cosmetics/admin/products
```

**Access**: Admin (cosmetics:admin)

**Request Body**:

```json
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

**Response** (201 Created):

```json
{
  "data": {
    "id": "uuid",
    "name": "상품명",
    ...
  }
}
```

**Error Responses**:

| 코드 | 상황 |
|------|------|
| 400 | 유효성 검증 실패 |
| 401 | 인증 필요 (COSMETICS_401) |
| 403 | 권한 없음 (COSMETICS_403) |

### 4.2 상품 상태 변경

```
PATCH /cosmetics/admin/products/:id/status
```

**Access**: Admin (cosmetics:admin)

**Request Body**:

```json
{
  "status": "visible",
  "reason": "상태 변경 사유"
}
```

**Allowed Status Transitions**:

| From | To |
|------|-----|
| draft | visible, hidden |
| visible | hidden, sold_out |
| hidden | visible, sold_out |
| sold_out | visible, hidden |

**Response** (200 OK):

```json
{
  "data": {
    "id": "uuid",
    "status": "visible",
    "previous_status": "draft",
    "changed_at": "2025-01-01T00:00:00Z",
    "changed_by": "uuid"
  }
}
```

**Error Responses**:

| 코드 | 상황 |
|------|------|
| 400 | 유효하지 않은 상태 전이 (COSMETICS_003) |

### 4.3 가격 정책 수정

```
PUT /cosmetics/admin/prices/:productId
```

**Access**: Admin (cosmetics:admin)

**Request Body**:

```json
{
  "base_price": 50000,
  "sale_price": 45000,
  "sale_start_at": "2025-01-01T00:00:00Z",
  "sale_end_at": "2025-01-31T23:59:59Z"
}
```

**Response** (200 OK):

```json
{
  "data": {
    "product_id": "uuid",
    "base_price": 50000,
    "sale_price": 45000,
    "sale_active": true,
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## 5. 에러 응답 형식

### 5.1 표준 에러 구조

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

### 5.2 에러 코드 목록

| 코드 | HTTP | 설명 |
|------|------|------|
| COSMETICS_001 | 404 | 상품 없음 |
| COSMETICS_002 | 404 | 브랜드 없음 |
| COSMETICS_003 | 400 | 유효하지 않은 상태 변경 |
| COSMETICS_004 | 400 | 가격 정책 오류 |
| COSMETICS_401 | 401 | 인증 필요 |
| COSMETICS_403 | 403 | 권한 없음 |
| COSMETICS_500 | 500 | 서버 오류 |

---

## 6. Rate Limiting

| 엔드포인트 유형 | 제한 |
|-----------------|------|
| Public API | 100 req/min |
| User API | 200 req/min |
| Admin API | 50 req/min |

**Rate Limit Headers**:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## 7. 참조 문서

- docs/architecture/cosmetics-api-rules.md
- docs/architecture/cosmetics-db-schema.md
- docs/services/cosmetics/service-flow.md

---

*이 문서는 OpenAPI 스펙 생성 이전 단계의 API 정의입니다.*
