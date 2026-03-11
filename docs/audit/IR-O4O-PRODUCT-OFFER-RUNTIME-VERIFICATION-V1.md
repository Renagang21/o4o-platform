# IR-O4O-PRODUCT-OFFER-RUNTIME-VERIFICATION-V1

> **Runtime Verification Report** | 2026-03-11
> Product Offer CRUD 실제 런타임 동작 검증

---

## 1. Executive Summary

| 단계 | API | 결과 | 비고 |
|------|-----|------|------|
| Supplier 등록+승인 | POST register → approve | **PASS** | neture:supplier 정상 할당 |
| RBAC 확인 | GET /auth/status | **PASS** | roles: [supplier, neture:supplier] |
| Supplier Profile | GET /supplier/profile | **PASS** | name, slug, contacts 정상 |
| **Offer 생성** | POST /supplier/products | **FAIL** | slug NOT NULL 위반 |
| **Offer 목록** | GET /supplier/products | **FAIL** | INTERNAL_ERROR |
| **Offer 요청** | GET /supplier/requests | **FAIL** | INTERNAL_ERROR |
| **Dashboard** | GET /supplier/dashboard/summary | **FAIL** | INTERNAL_ERROR |
| **Orders** | GET /supplier/orders | **FAIL** | INTERNAL_ERROR |
| Admin Dashboard | GET /admin/dashboard/summary | **PASS** | product_approvals 테이블 정상 |
| Admin Products | GET /admin/products | **PASS** | 기존 3개 상품 정상 조회 |
| Admin Categories | GET /admin/categories | **PASS** | 빈 배열 |
| Admin Brands | GET /admin/brands | **PASS** | 빈 배열 |

**종합: Supplier 인증 PASS, Product Offer CRUD 전체 FAIL (2개 근본 원인)**

---

## 2. 검증 환경

| 항목 | 값 |
|------|------|
| API Server | https://api.neture.co.kr |
| Test User | ir-product-test@o4o.com |
| Test User ID | d6441a7e-5f24-4649-95ee-009159327de1 |
| Supplier ID | 96a0c96d-93fd-4213-b5ff-b6f6b8aa85a4 |
| Supplier Slug | ir-product-test |
| Admin (Neture) | admin-neture@o4o.com (neture:admin) |
| Admin (Platform) | admin-glycopharm@o4o.com (glycopharm:admin) |
| Date | 2026-03-11 |

---

## 3. Step 1: Supplier 생성 + RBAC 확인 — PASS

### 3-1. User 등록 + 승인

```
POST /api/v1/auth/register → status: pending
PATCH /api/v1/admin/users/:id/status { status: "active" } → PASS
POST /api/v1/auth/login → roles: ["supplier"]
```

### 3-2. Supplier 등록 + 승인

```
POST /api/v1/neture/supplier/register → status: PENDING
POST /api/v1/neture/admin/suppliers/:id/approve → status: ACTIVE
```

### 3-3. 재로그인 RBAC 확인

```json
{
  "roles": ["supplier", "neture:supplier"],
  "memberships": [{ "serviceKey": "neture", "status": "active" }]
}
```

**결과:** WO-O4O-NETURE-SUPPLIER-APPROVAL-INTEGRATION-V1 수정 정상 동작 확인

---

## 4. Step 2: Product Offer 생성 — FAIL

### 4-1. GTIN 검증

```
POST /api/v1/neture/supplier/products
{ "barcode": "8801234567890", ... }

Response: { "error": "INVALID_GTIN: Invalid check digit: expected 3, got 0" }
```

**결과:** GTIN check digit 검증 정상 (올바른 거부)

### 4-2. 유효 바코드로 재시도

```
POST /api/v1/neture/supplier/products
{ "barcode": "8801234567893", "manualData": {...}, "distributionType": "PUBLIC", "priceGeneral": 12000 }

Response: { "success": false, "error": "INTERNAL_ERROR", "message": "Failed to create supplier product" }
```

### 4-3. Root Cause: slug NOT NULL

**Entity 정의** (`SupplierProductOffer.entity.ts`):
```typescript
@Column({ name: 'slug', type: 'varchar', length: 160, unique: true })
slug: string;  // NOT NULL, UNIQUE
```

**Service 코드** (`neture.service.ts:1453-1464`):
```typescript
const offer = this.offerRepo.create({
  supplierId,
  masterId: masterResult.data.id,
  distributionType: ...,
  isActive: false,
  approvalStatus: OfferApprovalStatus.PENDING,
  allowedSellerIds: [],
  priceGeneral: ...,
  // ❌ slug 필드 누락!
});
```

**결과:** PostgreSQL NOT NULL 제약 위반 → 500 INTERNAL_ERROR

---

## 5. Step 3-5: Offer 목록/요청/대시보드 — FAIL

### 5-1. 에러 패턴

| Endpoint | Result |
|----------|--------|
| GET /supplier/profile | **PASS** |
| GET /supplier/products | **FAIL** INTERNAL_ERROR |
| GET /supplier/requests | **FAIL** INTERNAL_ERROR |
| GET /supplier/dashboard/summary | **FAIL** INTERNAL_ERROR |
| GET /supplier/orders | **FAIL** INTERNAL_ERROR |

### 5-2. Root Cause: PostgreSQL Enum 대소문자 불일치

**ProductApproval Entity (`ProductApproval.ts`):**
```typescript
export enum ProductApprovalType {
  SERVICE = 'service',   // DB enum value: 'service'
  PRIVATE = 'private',   // DB enum value: 'private'
}
```

**모든 실패 엔드포인트의 Raw SQL:**
```sql
-- getSupplierProducts (neture.service.ts:1323)
WHERE ... AND pa.approval_type = 'PRIVATE'

-- getSupplierDashboardSummary (neture.service.ts:2074)
WHERE ... AND pa.approval_type = 'PRIVATE'

-- getSupplierOrdersSummary (neture.service.ts:1972)
WHERE ... AND pa.approval_type = 'PRIVATE' AND pa.approval_status = 'approved'

-- supplier/requests (supplier-product.controller.ts:111)
WHERE pa.approval_type = 'PRIVATE' AND spo.supplier_id = $1
```

**PostgreSQL 동작:**
```
'PRIVATE' ≠ 'private' (PostgreSQL enum은 case-sensitive)
→ ERROR: invalid input value for enum product_approvals_approval_type_enum: "PRIVATE"
```

### 5-3. 패턴 증거

| 엔드포인트 | approval_type 필터 | 결과 |
|-----------|:------------------:|:----:|
| GET /admin/dashboard/summary | 없음 (전체 COUNT) | **PASS** |
| GET /admin/products | 없음 | **PASS** |
| GET /supplier/products | `= 'PRIVATE'` | **FAIL** |
| GET /supplier/dashboard/summary | `= 'PRIVATE'` | **FAIL** |
| GET /supplier/orders/summary | `= 'PRIVATE'` | **FAIL** |
| GET /supplier/requests | `= 'PRIVATE'` | **FAIL** |
| GET /supplier/profile | 없음 (neture_suppliers만) | **PASS** |

**Admin 엔드포인트는 `approval_type` 필터 없이 전체 조회 → 정상 동작**
**Supplier 엔드포인트는 `= 'PRIVATE'` 필터 사용 → PostgreSQL enum 에러**

### 5-4. 부수 발견: Admin Dashboard의 silent 버그

```typescript
// neture.service.ts:2182
const privateTier = tierStats.find((t) => t.approval_type === 'PRIVATE') || emptyTier;
```

DB에서 `'private'` (lowercase) 반환 → JavaScript `=== 'PRIVATE'` 불일치 → 항상 `emptyTier` 반환.
에러는 아니지만 **Private tier 통계가 항상 0으로 표시**되는 데이터 버그.

---

## 6. Step 6: Orders 엔드포인트 — FAIL (별도 원인)

### 6-1. 추가 원인: neture_orders 테이블

`SupplierOrderService.listOrders()`의 raw SQL:
```sql
FROM neture_orders o
JOIN neture_order_items oi ON oi.order_id = o.id
JOIN supplier_product_offers spo ON spo.id = oi.product_id::uuid
WHERE spo.supplier_id = $1
```

`NetureOrder` 엔티티가 `connection.ts`에 **미등록**.
TypeORM `synchronize`로 테이블이 자동 생성되지 않았을 가능성.
(별도 마이그레이션으로 생성되었을 수 있으나, 확인 불가)

---

## 7. 발견된 문제 요약

| # | 문제 | 심각도 | 영향 범위 | 파일 |
|---|------|--------|----------|------|
| **P0** | `approval_type = 'PRIVATE'` 대소문자 불일치 | **Critical** | Supplier 전체 엔드포인트 (4개) | neture.service.ts, supplier-product.controller.ts |
| **P1** | `createSupplierOffer()` slug 미생성 | **Critical** | 상품 등록 불가 | neture.service.ts:1453 |
| **P2** | Admin dashboard privateTier JavaScript 비교 불일치 | **Medium** | Private tier 통계 항상 0 | neture.service.ts:2182 |
| **P3** | `neture_orders` 테이블 미확인 | **Low** | Orders 엔드포인트 (P0 수정 후에도 실패 가능) | supplier-order.service.ts |

---

## 8. 수정 방안

### P0: Raw SQL approval_type 대소문자 수정

**영향 파일 4개:**

```typescript
// 1. neture.service.ts:1323 (getSupplierProducts)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 2. neture.service.ts:1333 (getSupplierProducts)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 3. neture.service.ts:1972 (getSupplierOrdersSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 4. neture.service.ts:2020 (getSupplierOrdersSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 5. neture.service.ts:2074 (getSupplierDashboardSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 6. neture.service.ts:2082 (getSupplierDashboardSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 7. neture.service.ts:2094 (getSupplierDashboardSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 8. neture.service.ts:2106 (getSupplierDashboardSummary)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'

// 9. supplier-product.controller.ts:111 (requests endpoint)
- pa.approval_type = 'PRIVATE'
+ pa.approval_type = 'private'
```

**권장:** 모든 raw SQL에서 `'PRIVATE'` → `'private'`로 변경.
또는 TypeORM enum 상수 사용: `ProductApprovalType.PRIVATE` (= `'private'`)

### P1: createSupplierOffer slug 자동 생성

```typescript
// neture.service.ts:1453 - offer 생성 전에 slug 생성
const slugBase = masterResult.data.barcode || masterResult.data.id;
const slug = `${slugBase}-${supplierId.slice(0, 8)}-${Date.now()}`;

const offer = this.offerRepo.create({
  supplierId,
  masterId: masterResult.data.id,
  slug,  // ✅ slug 추가
  // ... 나머지 동일
});
```

### P2: Admin dashboard privateTier 비교 수정

```typescript
// neture.service.ts:2182
- const privateTier = tierStats.find((t) => t.approval_type === 'PRIVATE') || emptyTier;
+ const privateTier = tierStats.find((t) => t.approval_type === 'private') || emptyTier;
```

---

## 9. 기존 상품 데이터 확인

Admin products 엔드포인트로 확인한 기존 데이터:

| Offer ID | Master Name | Supplier | Distribution | Active | Approval |
|----------|-------------|----------|:------------:|:------:|:--------:|
| 2dfaa373... | 순수 오메가3 피쉬오일 | Firstmall Test Store | PRIVATE | false | REJECTED |
| 4b218490... | IR Test Product | Firstmall Test Store | PRIVATE | true | APPROVED |
| ed41e8b4... | 장건강 프로바이오틱스 100억 | Firstmall Test Store | PRIVATE | false | PENDING |

기존 상품은 모두 Firstmall Test Store (5d888132) 소유.
**이 supplier도 동일 INTERNAL_ERROR가 발생할 것으로 추정.**

---

## 10. 테스트 계정 정보 (정리 대상)

| 항목 | 값 |
|------|------|
| User ID | d6441a7e-5f24-4649-95ee-009159327de1 |
| Email | ir-product-test@o4o.com |
| Supplier ID | 96a0c96d-93fd-4213-b5ff-b6f6b8aa85a4 |
| Supplier Slug | ir-product-test |

**IR 완료 후 삭제 필요:** users, role_assignments, service_memberships, neture_suppliers

---

## 11. 결론

Product Offer CRUD **전체 FAIL**:

1. **P0 (Critical):** Raw SQL에서 PostgreSQL enum 대소문자 불일치
   - `'PRIVATE'` (코드) vs `'private'` (DB enum)
   - Supplier 엔드포인트 4개 전부 차단
   - Admin 엔드포인트는 해당 필터 미사용으로 영향 없음

2. **P1 (Critical):** Offer 생성 시 `slug` NOT NULL 위반
   - Entity에 `slug: varchar(160), UNIQUE, NOT NULL` 정의
   - `createSupplierOffer()`에서 slug 미설정

**P0+P1 수정 시 기대 결과:**
- Offer 생성 정상 동작
- Offer 목록/요청/대시보드 정상 동작
- Orders는 P3 (neture_orders 테이블) 별도 확인 필요

**수정 스코프:** `neture.service.ts` + `supplier-product.controller.ts` 2개 파일

---

*Verification Date: 2026-03-11*
*Method: Production API curl calls + Code path analysis*
*Status: Complete — 4 issues found (2 Critical, 1 Medium, 1 Low)*
