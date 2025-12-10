# Dropshipping API Contract

**버전:** 2.0.0
**상태:** Active

---

## 1. 개요

드랍쉬핑 시스템의 API 계약을 정의합니다.
모든 API는 Module Loader를 통해 자동 등록되며, 표준 응답 형식을 따릅니다.

### API 버전

| 버전 | Base Path | 상태 |
|------|-----------|------|
| v1 | `/api/v1/dropshipping` | Active |
| admin | `/api/v1/admin/dropshipping` | Active |

### 인증

```
Authorization: Bearer <access_token>
```

---

## 2. 공통 규격

### 성공 응답

```typescript
// 목록
{ data: T[], meta: { total, page, pageSize, totalPages } }

// 단일
{ data: T }
```

### 에러 응답

```typescript
{ error: { code: string, message: string, details?: any } }
```

---

## 3. 핵심 API

### 3.1 Supplier (공급사)

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/dropshipping/suppliers` | 목록 |
| GET | `/api/v1/dropshipping/suppliers/:id` | 상세 |
| POST | `/api/v1/dropshipping/suppliers` | 생성 |
| PUT | `/api/v1/dropshipping/suppliers/:id` | 수정 |

### 3.2 Partner (판매자)

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/dropshipping/partners` | 목록 |
| GET | `/api/v1/dropshipping/partners/:id` | 상세 |
| POST | `/api/v1/dropshipping/partners` | 생성 |
| PUT | `/api/v1/dropshipping/partners/:id` | 수정 |

### 3.3 ProductLink (상품 연동)

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/dropshipping/product-links` | 목록 |
| POST | `/api/v1/dropshipping/product-links` | 생성 |
| PUT | `/api/v1/dropshipping/product-links/:id` | 수정 |
| DELETE | `/api/v1/dropshipping/product-links/:id` | 삭제 |

### 3.4 Order (주문)

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/dropshipping/orders` | 목록 |
| GET | `/api/v1/dropshipping/orders/:id` | 상세 |
| POST | `/api/v1/dropshipping/orders/:id/fulfill` | 배송 처리 |

### 3.5 Settlement (정산)

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/dropshipping/settlements` | 목록 |
| POST | `/api/v1/dropshipping/settlements/calculate` | 정산 계산 |

---

## 4. Admin API

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/v1/admin/dropshipping/stats` | 통계 |
| GET | `/api/v1/admin/dropshipping/partners` | 파트너 관리 |
| GET | `/api/v1/admin/dropshipping/suppliers` | 공급사 관리 |

---

## 5. 에러 코드

| 코드 | 설명 |
|------|------|
| `ERR_NOT_FOUND` | 리소스 없음 |
| `ERR_UNAUTHORIZED` | 인증 실패 |
| `ERR_FORBIDDEN` | 권한 없음 |
| `ERR_VALIDATION` | 검증 실패 |
| `ERR_DUPLICATE` | 중복 데이터 |

---

## 6. 규칙

1. **표준 응답 형식**: `{ data, meta }` 형식 준수
2. **인증 필수**: 모든 API는 Bearer Token 인증 필요
3. **버전 prefix**: `/api/v1/` prefix 사용
4. **RESTful 규칙**: HTTP Method와 리소스 명명 규칙 준수

---
*최종 업데이트: 2025-12-10*
