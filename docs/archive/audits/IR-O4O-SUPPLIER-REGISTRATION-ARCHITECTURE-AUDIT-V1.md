# IR-O4O-SUPPLIER-REGISTRATION-ARCHITECTURE-AUDIT-V1

> **Investigation Report** | 2026-03-11
> Supplier Registration 기능 구현 전 기존 구조 조사

---

## 1. Executive Summary

**Neture 공급자 시스템은 이미 완전히 구현되어 있다.**

| 질문 | 결론 | 근거 |
|------|------|------|
| Supplier 테이블 신규 생성? | **NO** | `neture_suppliers` 테이블 존재, 운영 중 |
| Supplier 등록 API 신규 개발? | **NO** | `POST /api/v1/neture/supplier/register` 활성 |
| Admin 공급자 승인 기능 신규 개발? | **NO** | `POST /api/v1/neture/admin/suppliers/:id/approve` 활성 |

---

## 2. Supplier Entity 구조

### 2.1 Two Supplier Systems

| Entity | Table | Module | Status Enum | 활성 |
|--------|-------|--------|-------------|------|
| `Supplier` | `suppliers` | Legacy (generic) | PENDING, ACTIVE, APPROVED, SUSPENDED, REJECTED | ❌ 비활성 (deprecated) |
| **`NetureSupplier`** | `neture_suppliers` | Neture | PENDING, ACTIVE, INACTIVE, REJECTED | ✅ **Primary** |

### 2.2 NetureSupplier 주요 필드

| Field | Type | 설명 |
|-------|------|------|
| id | UUID | PK |
| slug | varchar | Unique, URL-safe |
| name | varchar | 공급자명 |
| user_id | UUID (nullable) | 사용자 FK |
| status | enum | PENDING → ACTIVE / REJECTED / INACTIVE |
| approved_by | UUID | 승인 관리자 |
| approved_at | timestamp | 승인 일시 |
| rejected_reason | text | 거부 사유 |
| category, description, pricing_policy, moq | various | 비즈니스 정보 |
| contact_email, contact_phone, contact_website | varchar | 연락처 |

### 2.3 Product Chain

```
ProductMaster (product_masters)
    ↓ master_id
SupplierProductOffer (supplier_product_offers)
    ↓ supplier_id
NetureSupplier (neture_suppliers)
```

**SupplierProductOffer 주요 필드:**
- distribution_type: PUBLIC / SERVICE / PRIVATE
- approval_status: PENDING / APPROVED / REJECTED
- price_general, price_gold, price_platinum (B2B 등급별 가격)
- stock_quantity, reserved_quantity (재고 관리)

---

## 3. Supplier API Inventory

### 3.1 Route Registration

```
main.ts:1069-1099
├── createNetureRoutes()          → /api/v1/neture (legacy)
├── createNetureModuleRoutes()    → /api/v1/neture (WO-O4O-ROUTES-REFACTOR-V1)
├── netureLibraryRoutes           → /api/v1/neture/library
└── createSupplierCopilotRouter() → /api/v1/neture/supplier/copilot
```

**AdminSupplierController** (legacy generic) — main.ts에 **미등록** (비활성)

### 3.2 Active Supplier Endpoints (요약)

| 모듈 | Prefix | 엔드포인트 수 | 주요 기능 |
|------|--------|-------------|----------|
| Supplier Management | `/supplier` | 6 | 등록, 대시보드, 프로필 |
| Supplier Products | `/supplier/products` | 8 | 상품 등록/수정, CSV 임포트 |
| Supplier Orders | `/supplier/orders` | 8 | 주문 관리, 배송 |
| Supplier Inventory | `/supplier/inventory` | 3 | 재고 관리 |
| Supplier Settlements | `/supplier/settlements` | 7 | 정산, 커미션 |
| Supplier Copilot | `/supplier/copilot` | 4 | AI KPI |
| Supplier Library | `/library` | 5 | 콘텐츠 |
| **Admin Supplier** | `/admin/suppliers` | **7** | **승인/거부/취소** |
| Admin Settlements | `/admin/settlements` | 14 | 정산 관리 |
| Partner | `/partner` | 30+ | 파트너십, 계약 |

**Total: 90+ active supplier-related endpoints**

### 3.3 Key Endpoints

| Action | Method | Path | Auth |
|--------|--------|------|------|
| 공급자 등록 | POST | `/api/v1/neture/supplier/register` | requireAuth |
| 공급자 승인 | POST | `/api/v1/neture/admin/suppliers/:id/approve` | neture:admin |
| 공급자 거부 | POST | `/api/v1/neture/admin/suppliers/:id/reject` | neture:admin |
| 공급자 취소 | POST | `/api/v1/neture/admin/suppliers/:id/revoke` | neture:admin |
| 대기 목록 | GET | `/api/v1/neture/admin/suppliers/pending` | neture:admin |
| 상품 등록 | POST | `/api/v1/neture/supplier/products` | requireActiveSupplier |
| 주문 관리 | GET | `/api/v1/neture/supplier/orders` | requireLinkedSupplier |

---

## 4. Supplier RBAC Analysis

### 4.1 Role 정의

```typescript
// types/roles.ts
'neture:supplier'   // Neture 공급자
'neture:partner'    // Neture 파트너
'glycopharm:supplier' // GlycoPharm 공급자
'cosmetics:supplier'  // K-Cosmetics 공급자
```

### 4.2 Supplier Identity Middleware

```
neture-identity.middleware.ts
├── requireActiveSupplier()  → supplier.status === 'ACTIVE' (쓰기 작업용)
├── requireLinkedSupplier()  → supplier exists (읽기 작업용)
├── requireActivePartner()   → partner.status === 'ACTIVE'
└── requireLinkedPartner()   → partner exists
```

**특이사항:** RBAC role 체크 없음. supplier status만 확인.

### 4.3 CRITICAL GAP — 승인 시 Role 미할당

**`approveSupplier()` in `neture.service.ts`:**
```typescript
supplier.status = SupplierStatus.ACTIVE;
supplier.approvedBy = approvedByUserId;
supplier.approvedAt = new Date();
await this.supplierRepo.save(supplier);
// ❌ roleAssignmentService.assignRole() 호출 없음
```

**검증:**
- `roleAssignmentService` → Neture 모듈 전체에서 참조 0건
- `assignRole.*neture:supplier` → 전체 코드베이스에서 0건

**영향:**
- Supplier 엔드포인트는 `requireActiveSupplier` (status 체크)로 게이팅되어 **기능적으로 정상 동작**
- 그러나 RBAC SSOT (F9 Freeze) 원칙 위반
- JWT payload에 `neture:supplier` role 미포함 → role 기반 분기 불가

---

## 5. Admin Supplier UI

### 5.1 Backend

- `modules/neture/controllers/admin.controller.ts` — 7 endpoints (승인/거부/취소/조회/수정)
- Guard: `requireNetureScope('neture:admin')`

### 5.2 Frontend

- `services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx` — Neture admin 공급자 승인 페이지 존재

---

## 6. E-commerce Flow

```
Supplier Registration
    → Admin Approval (status: ACTIVE)
        → Product Offer 등록 (SupplierProductOffer)
            → Store Listing (ProductMaster + Offer)
                → Order (checkoutService.createOrder())
                    → Settlement (SupplierSettlement)
                        → Commission (PartnerCommission)
```

---

## 7. 권장 사항

| # | 작업 | 우선순위 | 영향 범위 |
|---|------|---------|----------|
| 1 | `approveSupplier()`에 `roleAssignmentService.assignRole(userId, 'neture:supplier')` 추가 | **P0** | RBAC SSOT 준수 |
| 2 | `rejectSupplier()/revokeSupplier()`에 role 제거 추가 | P1 | RBAC 일관성 |
| 3 | Legacy `Supplier` entity 정리 (사용처 없음) | P2 | 코드 정리 |
| 4 | Supplier 미들웨어에 RBAC role 체크 보조 추가 | P2 | 보안 강화 |

### 7.1 P0 수정 예시

```typescript
// neture.service.ts - approveSupplier()
async approveSupplier(id: string, approvedByUserId: string) {
  const supplier = await this.supplierRepo.findOneOrFail({ where: { id } });
  supplier.status = SupplierStatus.ACTIVE;
  supplier.approvedBy = approvedByUserId;
  supplier.approvedAt = new Date();
  await this.supplierRepo.save(supplier);

  // ✅ RBAC SSOT 준수: role 할당
  if (supplier.userId) {
    await this.roleAssignmentService.assignRole(
      supplier.userId,
      'neture:supplier',
      'neture',
      approvedByUserId
    );
  }
}
```

---

## 8. 결론

Neture 공급자 시스템은 **Entity, API, Admin UI, Product Chain, Settlement** 모두 구현 완료 상태.
신규 개발 대신 **RBAC role 할당 갭** 수정이 필요한 유일한 작업.

---

*Investigation Date: 2026-03-11*
*Scope: apps/api-server/src/modules/neture/, entities/Supplier.ts, types/roles.ts*
*Status: Complete*
