# CPT/ACF Preset System - API Reference

**작성일:** 2025-10-31
**버전:** 1.0.0
**대상:** 개발자

---

## 📚 목차

1. [API 개요](#1-api-개요)
2. [인증 (Authentication)](#2-인증-authentication)
3. [Form Preset API](#3-form-preset-api)
4. [View Preset API](#4-view-preset-api)
5. [Template Preset API](#5-template-preset-api)
6. [공통 응답 형식](#6-공통-응답-형식)
7. [에러 코드](#7-에러-코드)
8. [Rate Limiting](#8-rate-limiting)

---

## 1. API 개요

### 1.1 Base URL

```
Production:  https://api.neture.co.kr/api/v1
Development: http://localhost:4000/api/v1
```

### 1.2 API Endpoints 구조

```
/api/v1/presets
├── /forms              # Form Preset 관리
│   ├── GET     /       # 목록 조회
│   ├── GET     /:id    # 단일 조회
│   ├── POST    /       # 생성
│   ├── PUT     /:id    # 수정
│   ├── DELETE  /:id    # 삭제
│   └── POST    /:id/clone  # 복제
├── /views              # View Preset 관리
│   ├── GET     /
│   ├── GET     /:id
│   ├── POST    /
│   ├── PUT     /:id
│   ├── DELETE  /:id
│   └── POST    /:id/clone
└── /templates          # Template Preset 관리
    ├── GET     /
    ├── GET     /:id
    ├── POST    /
    ├── PUT     /:id
    ├── DELETE  /:id
    └── POST    /:id/clone
```

### 1.3 Content-Type

모든 요청과 응답은 JSON 형식입니다:

```
Content-Type: application/json
Accept: application/json
```

---

## 2. 인증 (Authentication)

### 2.1 Bearer Token

모든 API 요청은 JWT Bearer 토큰이 필요합니다:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### 2.2 토큰 획득

```typescript
import { authClient } from '@o4o/auth-client';

// 로그인
const { token } = await authClient.login({
  email: 'user@example.com',
  password: 'password'
});

// authClient가 자동으로 토큰 관리
// 이후 authClient.api.get/post/put/delete 사용 시 자동으로 헤더 추가
```

### 2.3 권한

| 작업 | 필요 권한 |
|------|-----------|
| 목록 조회 (GET /) | 인증된 사용자 |
| 단일 조회 (GET /:id) | 인증된 사용자 + preset.roles 확인 |
| 생성 (POST /) | admin |
| 수정 (PUT /:id) | admin |
| 삭제 (DELETE /:id) | admin |
| 복제 (POST /:id/clone) | admin |

---

## 3. Form Preset API

### 3.1 목록 조회

**Endpoint:** `GET /api/v1/presets/forms`

**Query Parameters:**

| 파라미터 | 타입 | 설명 | 기본값 |
|----------|------|------|--------|
| `cptSlug` | string | CPT 필터링 | - |
| `isActive` | boolean | 활성 상태 필터 | - |
| `page` | number | 페이지 번호 | 1 |
| `limit` | number | 페이지 크기 | 20 |
| `orderBy` | string | 정렬 필드 | createdAt |
| `order` | ASC\|DESC | 정렬 순서 | DESC |

**Example Request:**

```bash
curl -X GET \
  'https://api.neture.co.kr/api/v1/presets/forms?cptSlug=product&page=1&limit=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Product Registration Form v1",
      "description": "Basic product form",
      "cptSlug": "product",
      "version": 1,
      "config": {
        "fields": [...],
        "layout": {...},
        "validation": [...],
        "submitBehavior": {...}
      },
      "roles": ["admin", "seller"],
      "isActive": true,
      "createdAt": "2025-10-31T10:00:00.000Z",
      "updatedAt": "2025-10-31T10:00:00.000Z",
      "createdBy": "user-id"
    }
  ],
  "total": 25,
  "pagination": {
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

### 3.2 단일 조회

**Endpoint:** `GET /api/v1/presets/forms/:id`

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `id` | string (UUID) | Preset ID |

**Example Request:**

```bash
curl -X GET \
  'https://api.neture.co.kr/api/v1/presets/forms/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Product Registration Form v1",
    "description": "Basic product form",
    "cptSlug": "product",
    "version": 1,
    "config": {
      "fields": [
        {
          "fieldKey": "field_product_name",
          "order": 1,
          "required": true,
          "placeholder": "Enter product name"
        }
      ],
      "layout": {
        "columns": 2,
        "sections": []
      },
      "validation": [],
      "submitBehavior": {
        "redirectTo": "/admin/products",
        "showSuccessMessage": true,
        "successMessage": "Product created!"
      }
    },
    "roles": ["admin", "seller"],
    "isActive": true,
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  }
}
```

### 3.3 생성

**Endpoint:** `POST /api/v1/presets/forms`

**Request Body:**

```typescript
interface CreateFormPresetRequest {
  name: string;
  description?: string;
  cptSlug: string;
  config: FormPresetConfig;
  roles?: string[];
}
```

**Example Request:**

```bash
curl -X POST \
  'https://api.neture.co.kr/api/v1/presets/forms' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Contact Form v1",
    "description": "Basic contact form",
    "cptSlug": "contact",
    "config": {
      "fields": [
        {
          "fieldKey": "field_contact_name",
          "order": 1,
          "required": true
        },
        {
          "fieldKey": "field_contact_email",
          "order": 2,
          "required": true
        }
      ],
      "layout": {
        "columns": 1,
        "sections": []
      },
      "validation": [
        {
          "field": "field_contact_email",
          "type": "email",
          "message": "Invalid email"
        }
      ],
      "submitBehavior": {
        "showSuccessMessage": true,
        "successMessage": "Thank you!"
      }
    },
    "roles": []
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "new-uuid-here",
    "name": "Contact Form v1",
    "cptSlug": "contact",
    "version": 1,
    "config": {...},
    "isActive": true,
    "createdAt": "2025-10-31T11:00:00.000Z",
    "updatedAt": "2025-10-31T11:00:00.000Z"
  }
}
```

### 3.4 수정

**Endpoint:** `PUT /api/v1/presets/forms/:id`

**Request Body:**

```typescript
interface UpdateFormPresetRequest {
  name?: string;
  description?: string;
  config?: FormPresetConfig;
  roles?: string[];
  isActive?: boolean;
}
```

**Example Request:**

```bash
curl -X PUT \
  'https://api.neture.co.kr/api/v1/presets/forms/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Contact Form v2",
    "isActive": true
  }'
```

### 3.5 삭제

**Endpoint:** `DELETE /api/v1/presets/forms/:id`

**Example Request:**

```bash
curl -X DELETE \
  'https://api.neture.co.kr/api/v1/presets/forms/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "success": true,
  "message": "Form preset deleted successfully"
}
```

### 3.6 복제

**Endpoint:** `POST /api/v1/presets/forms/:id/clone`

**Example Request:**

```bash
curl -X POST \
  'https://api.neture.co.kr/api/v1/presets/forms/550e8400-e29b-41d4-a716-446655440000/clone' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "cloned-uuid-here",
    "name": "Product Registration Form v1 (Copy)",
    "cptSlug": "product",
    "version": 2,
    "config": {...},
    "createdAt": "2025-10-31T12:00:00.000Z"
  }
}
```

---

## 4. View Preset API

View Preset API는 Form Preset API와 동일한 구조를 가지며, 엔드포인트 경로만 `/forms` → `/views`로 변경됩니다.

### 4.1 목록 조회

**Endpoint:** `GET /api/v1/presets/views`

**Query Parameters:** [Form Preset과 동일](#31-목록-조회)

### 4.2 단일 조회

**Endpoint:** `GET /api/v1/presets/views/:id`

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "view-uuid",
    "name": "Product Grid v1",
    "cptSlug": "product",
    "version": 1,
    "config": {
      "renderMode": "grid",
      "fields": [
        {
          "fieldKey": "field_product_image",
          "format": "image",
          "order": 1
        },
        {
          "fieldKey": "field_product_name",
          "format": "text",
          "order": 2
        },
        {
          "fieldKey": "field_product_price",
          "format": "number",
          "formatter": {
            "type": "number",
            "currency": "KRW",
            "decimals": 0
          },
          "sortable": true,
          "order": 3
        }
      ],
      "defaultSort": {
        "field": "createdAt",
        "order": "DESC"
      },
      "pagination": {
        "pageSize": 12,
        "showPagination": true
      },
      "cache": {
        "ttl": 300,
        "strategy": "stale-while-revalidate"
      }
    },
    "isActive": true
  }
}
```

### 4.3 생성

**Endpoint:** `POST /api/v1/presets/views`

**Request Body:**

```typescript
interface CreateViewPresetRequest {
  name: string;
  description?: string;
  cptSlug: string;
  config: ViewPresetConfig;
  roles?: string[];
}
```

### 4.4 수정, 삭제, 복제

Form Preset API와 동일한 구조:
- `PUT /api/v1/presets/views/:id`
- `DELETE /api/v1/presets/views/:id`
- `POST /api/v1/presets/views/:id/clone`

---

## 5. Template Preset API

Template Preset API 역시 동일한 구조를 가지며, 경로만 `/templates`를 사용합니다.

### 5.1 엔드포인트 목록

- `GET /api/v1/presets/templates` - 목록 조회
- `GET /api/v1/presets/templates/:id` - 단일 조회
- `POST /api/v1/presets/templates` - 생성
- `PUT /api/v1/presets/templates/:id` - 수정
- `DELETE /api/v1/presets/templates/:id` - 삭제
- `POST /api/v1/presets/templates/:id/clone` - 복제

### 5.2 Config 구조

```json
{
  "config": {
    "layout": {
      "type": "2-column-right",
      "header": {
        "blocks": [
          {
            "blockName": "core/heading",
            "props": {
              "content": "{field_product_name}"
            },
            "order": 1
          }
        ]
      },
      "main": {
        "blocks": [...]
      },
      "sidebar": {
        "blocks": [...]
      }
    },
    "seoMeta": {
      "titleTemplate": "{field_product_name} | My Store",
      "descriptionField": "field_product_description",
      "ogImageField": "field_product_image"
    },
    "schemaOrg": {
      "type": "Product",
      "fieldMapping": {
        "name": "field_product_name",
        "price": "field_product_price"
      }
    }
  }
}
```

---

## 6. 공통 응답 형식

### 6.1 성공 응답

#### 단일 데이터
```json
{
  "success": true,
  "data": { ... }
}
```

#### 목록 데이터
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "pagination": {
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

#### 작업 완료
```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

### 6.2 에러 응답

```json
{
  "success": false,
  "error": "Error message here",
  "details": {
    "field": "Additional error details"
  }
}
```

---

## 7. 에러 코드

### 7.1 HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 (검증 실패) |
| 401 | Unauthorized | 인증 실패 (토큰 없음/만료) |
| 403 | Forbidden | 권한 없음 (역할 부족) |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 충돌 (중복된 ID 등) |
| 422 | Unprocessable Entity | 잘못된 데이터 형식 |
| 500 | Internal Server Error | 서버 오류 |

### 7.2 에러 메시지 예시

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "details": "Token is missing or invalid"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to access this preset",
  "details": {
    "requiredRoles": ["admin"],
    "userRole": "user"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Form preset not found"
}
```

#### 422 Unprocessable Entity
```json
{
  "success": false,
  "error": "Invalid preset configuration",
  "details": {
    "config.fields[0].fieldKey": "Field key is required",
    "config.layout.columns": "Must be 1, 2, or 3"
  }
}
```

---

## 8. Rate Limiting

### 8.1 제한

| 엔드포인트 타입 | 제한 | 기간 |
|-----------------|------|------|
| 조회 (GET) | 100 requests | 1분 |
| 생성/수정/삭제 (POST/PUT/DELETE) | 30 requests | 1분 |
| 복제 (POST /clone) | 10 requests | 1분 |

### 8.2 Rate Limit 헤더

응답 헤더에 현재 제한 상태가 포함됩니다:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698765432
```

### 8.3 Rate Limit 초과

**Status:** 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "retryAfter": 60
  }
}
```

---

## Frontend 사용 예시

### authClient 사용 (권장)

```typescript
import { authClient } from '@o4o/auth-client';

// 목록 조회
const response = await authClient.api.get('/api/v1/presets/views', {
  params: { cptSlug: 'product', page: 1, limit: 10 }
});

// 단일 조회
const preset = await authClient.api.get('/api/v1/presets/views/preset-id');

// 생성
const newPreset = await authClient.api.post('/api/v1/presets/forms', {
  name: 'New Form',
  cptSlug: 'product',
  config: {...}
});

// 수정
await authClient.api.put('/api/v1/presets/forms/preset-id', {
  isActive: false
});

// 삭제
await authClient.api.delete('/api/v1/presets/forms/preset-id');
```

### usePreset Hook

```typescript
import { usePreset } from '@o4o/utils';

function MyComponent() {
  const { preset, loading, error, refetch } = usePreset('view_product_grid_v1', 'view');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <PresetRenderer preset={preset} data={products} />;
}
```

---

**관련 가이드:**
- [Form Preset 사용 가이드](./cpt-preset-form-guide.md)
- [View Preset 사용 가이드](./cpt-preset-view-guide.md)
- [개발자 가이드](./cpt-preset-developer-guide.md)

**마지막 업데이트:** 2025-10-31
