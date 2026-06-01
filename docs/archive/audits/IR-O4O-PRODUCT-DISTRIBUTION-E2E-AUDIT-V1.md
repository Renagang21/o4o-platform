# IR-O4O-PRODUCT-DISTRIBUTION-E2E-AUDIT-V1

> Investigation Report: Product Distribution End-to-End Audit
> Date: 2026-03-06
> Status: Complete
> WO: WO-O4O-PRODUCT-DISTRIBUTION-E2E-AUDIT-V1

---

## Executive Summary

O4O 플랫폼의 상품 유통 전체 흐름을 5단계로 점검했다.

| 단계 | 이름 | 상태 |
|------|------|------|
| STEP 1 | Supplier 상품 등록 | ✅ 정상 |
| STEP 2 | Neture Admin 승인 | ⚠️ **UI 부재** |
| STEP 3 | Service 노출 | ✅ 정상 |
| STEP 4 | Store HUB 진열 | ✅ 정상 |
| STEP 5 | Store 활용 | ✅ 정상 |

**핵심 발견사항:**
1. **Admin 상품 승인 전용 UI 없음** (HIGH) — API는 존재하나 Admin Dashboard에 승인 큐 페이지 부재
2. **autoExpandPublicProduct() 이중 호출** (MEDIUM) — approveProduct()과 createSupplierOffer() 양쪽에서 호출
3. **KPI 집계 serviceKey 필터 미적용** (MEDIUM) — 크로스 서비스 데이터 혼입 가능

---

## 1. 전체 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                    O4O Product Distribution Flow                     │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: Supplier 상품 등록
┌──────────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│ SupplierProduct      │───→│ resolveOrCreate       │───→│ SupplierProduct │
│ CreatePage           │    │ Master(barcode)        │    │ Offer (PENDING) │
│ (2-step wizard)      │    │                       │    │                 │
│ Step1: 바코드 입력    │    │ ProductMaster         │    │ distribution:   │
│ Step2: 유통타입 선택  │    │ (SSOT)               │    │ PUBLIC/SERVICE/ │
│                      │    │                       │    │ PRIVATE         │
└──────────────────────┘    └───────────────────────┘    └────────┬────────┘
                                                                  │
STEP 2: Admin 승인                                                ▼
┌──────────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│ Admin Dashboard      │───→│ POST /neture/admin/   │───→│ Offer           │
│ ⚠️ 전용 승인 UI 없음  │    │ products/:id/approve  │    │ APPROVED        │
│ (ProductListPage     │    │                       │    │ isActive=true   │
│  는 일반 CRUD)       │    │ + autoExpand(PUBLIC)  │    │                 │
└──────────────────────┘    └───────────────────────┘    └────────┬────────┘
                                                                  │
STEP 3: Service 노출                                              ▼
┌──────────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│ KPA B2B Catalog      │    │ organization_product  │    │ B2B Catalog     │
│ GlycoPharm Catalog   │───→│ _listings             │───→│ 서비스별 노출    │
│ (서비스별 카탈로그)    │    │ (auto-created)        │    │                 │
└──────────────────────┘    └───────────────────────┘    └────────┬────────┘
                                                                  │
STEP 4: Store HUB 진열                                            ▼
┌──────────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│ Operator Dashboard   │───→│ organization_product  │───→│ 4-Layer         │
│ 상품 관리            │    │ _channels             │    │ Visibility Gate │
│                      │    │ (price/channel)       │    │                 │
└──────────────────────┘    └───────────────────────┘    └────────┬────────┘
                                                                  │
STEP 5: Store 활용                                                ▼
┌──────────────────────┐    ┌───────────────────────┐    ┌─────────────────┐
│ QR Store             │    │ Public Store          │    │ Tablet POS      │
│ /s/:orgId            │    │ /store/:orgId         │    │ /tablet/:orgId  │
│                      │    │                       │    │                 │
└──────────────────────┘    └───────────────────────┘    └─────────────────┘
```

---

## 2. 단계별 점검 결과

### STEP 1: Supplier 상품 등록 ✅

**UI**: `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx`

| 항목 | 상태 | 설명 |
|------|------|------|
| 2-Step 위자드 | ✅ | Step1: 바코드 입력 → Step2: 유통타입 선택 |
| ProductMaster 연동 | ✅ | `adminMasterApi.getMasterByBarcode()` |
| 유통타입 3종 | ✅ | PUBLIC / SERVICE / PRIVATE |
| Barcode 기반 생성 | ✅ | `resolveOrCreateMaster()` 강제 (외부 masterId 주입 불가) |
| CSV 대량 등록 | ✅ | SupplierProductCSVImportPage 존재 |
| 권한 체크 | ✅ | `requireAuth` + supplier 소유권 검증 |

**API**: `POST /api/v1/neture/supplier/products`
- `neture.routes.ts` → `NetureService.createSupplierOffer()`
- 바코드로 ProductMaster resolve → SupplierProductOffer 생성 (status: PENDING)

**발견 사항**: 없음. 정상 동작.

---

### STEP 2: Neture Admin 승인 ⚠️

**API**: 존재함

| 엔드포인트 | 미들웨어 | 동작 |
|-----------|---------|------|
| `POST /neture/admin/products/:id/approve` | `requireNetureScope('neture:admin')` | PENDING → APPROVED + autoExpand |
| `POST /neture/admin/products/:id/reject` | `requireNetureScope('neture:admin')` | PENDING → REJECTED + cascade revoke |

**승인 로직** (`neture.service.ts:483-534`):
1. approvalStatus === PENDING 검증
2. APPROVED + isActive=true 설정
3. PUBLIC 타입 → `autoExpandPublicProduct()` 호출
4. QueryRunner 트랜잭션으로 원자적 처리

**UI**: ⚠️ **전용 승인 페이지 부재**

| 페이지 | 역할 | 승인 기능 |
|--------|------|----------|
| `ProductListPage.tsx` | 일반 상품 CRUD (조회/상태변경/삭제) | ❌ 승인 큐 없음 |
| `ProductDetailPage.tsx` | 상품 생성/편집 | ❌ 승인 버튼 없음 |
| `Approvals.tsx` (dropshipping) | 드롭쉬핑 승인 | ❌ Neture 상품과 무관 |
| `CosmeticsSupplierApprovals.tsx` | 화장품 셀러 승인 | ❌ Neture 상품과 무관 |

**영향**: Admin은 현재 상품 승인을 수행할 수 있는 UI가 없다. API 직접 호출이 필요.

---

### STEP 3: Service 노출 ✅

**B2B 카탈로그 경로**:

| 서비스 | 파일 | 상태 |
|--------|------|------|
| KPA Society | `web-kpa-society/src/pages/branch/BranchProductCatalog.tsx` | ✅ |
| GlycoPharm | `web-glucoseview/src/pages/ProductCatalogPage.tsx` | ✅ |
| Cosmetics | 별도 도메인 (`cosmetics_` prefix) | ✅ (설계상 분리) |

**auto-listing 흐름** (`auto-listing.utils.ts`):

| 함수 | 트리거 | 동작 |
|------|--------|------|
| `autoExpandPublicProduct()` | PUBLIC Offer 승인 시 | 모든 active org에 listing 생성 (is_active=false) |
| `autoListPublicProductsForOrg()` | 새 organization 생성 시 | 해당 org에 기존 PUBLIC 상품 listing 생성 |

**Visibility 필터**:
- `organizations.isActive = true`
- `organization_service_enrollments.status = 'active'`
- `supplier_product_offers.approval_status = 'APPROVED'`
- `neture_suppliers.status = 'ACTIVE'`

---

### STEP 4: Store HUB 진열 ✅

**4-Layer Visibility Gate**:

```
Layer 1: Product Active     → supplier_product_offers.is_active = true
Layer 2: Listing Active     → organization_product_listings.is_active = true
Layer 3: Channel Active     → organization_product_channels.is_active = true
Layer 4: Org Channel Approved → organizations.isActive = true + enrollment.status = 'active'
```

**Operator 상품 관리**: Operator Dashboard에서 listing 활성화 + 가격/채널 설정 가능.

**SQL 안전장치**: `ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING` — 중복 방지.

---

### STEP 5: Store 활용 ✅

| 채널 | 경로 | 상태 |
|------|------|------|
| QR Store | `/s/:orgId` | ✅ |
| Public Store | `/store/:orgId` | ✅ |
| Tablet POS | `/tablet/:orgId` | ✅ |

모든 Store는 O4O Store Template 기반, `checkoutService.createOrder()` 계약 준수.

---

## 3. 발견된 버그 / 문제

### BUG-1: Admin 상품 승인 전용 UI 부재 (HIGH)

**현상**: Neture Admin Dashboard에 Supplier가 등록한 상품(PENDING)을 승인/거절하는 전용 페이지가 없다.

**영향**:
- Admin이 PENDING 상품을 발견하고 승인할 수 있는 워크플로우가 없음
- API(`POST /neture/admin/products/:id/approve`)는 존재하나 UI에서 호출 불가
- 현재는 API 직접 호출 또는 DB 조작으로만 승인 가능

**기존 페이지 분석**:
- `ProductListPage.tsx`: 상품 목록 CRUD (조회, 상태변경: draft/visible/hidden/sold_out, 삭제)
- 상태 필터에 `approvalStatus` 없음, 승인/거절 버튼 없음

**권장 조치**: WO-O4O-ADMIN-PRODUCT-APPROVAL-UI-V1 — Admin Dashboard에 PENDING 상품 승인 큐 + 승인/거절 버튼 추가. `Approvals.tsx` (dropshipping) 패턴 참조.

---

### BUG-2: autoExpandPublicProduct() 이중 호출 (MEDIUM)

**현상**: `autoExpandPublicProduct()`가 두 곳에서 호출된다.

| 위치 | 조건 | 방식 |
|------|------|------|
| `approveProduct()` (Line 507) | PUBLIC + 승인 시 | QueryRunner (트랜잭션) |
| `createSupplierOffer()` (Line 1431-1438) | PUBLIC + APPROVED + isActive | AppDataSource (비동기 fire-and-forget) |

**분석**:
- `createSupplierOffer()`에서의 호출은 **이미 APPROVED 상태로 생성되는 경우**를 처리 (관리자가 직접 APPROVED 상태로 등록 시)
- `ON CONFLICT DO NOTHING`으로 중복 INSERT는 방지됨 → **데이터 손상 없음**
- 그러나 불필요한 DB 쿼리 발생 + 로그 오해 가능

**권장 조치**: `createSupplierOffer()`에서 `autoExpandPublicProduct()` 호출 시점 검토. 일반 Supplier 등록은 항상 PENDING으로 시작하므로, Admin 직접 등록 케이스만 해당.

---

### BUG-3: KPI 크로스 서비스 집계 (MEDIUM)

**현상**: 일부 KPI 집계 쿼리에서 `serviceKey` 필터가 누락되어 다른 서비스의 데이터가 혼입될 수 있다.

**영향**: 서비스별 매출/상품 KPI 정확도 저하 가능.

**권장 조치**: Boundary Policy (F6) 준수 검증 — 모든 KPI 쿼리에 `serviceKey` 필터 추가.

---

## 4. Product Approval v2 시스템

SERVICE 유통타입을 위한 별도 승인 체계가 존재한다.

**파일**: `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts`

| 기능 | 설명 |
|------|------|
| `createServiceApproval()` | SERVICE Offer에 대한 조직별 승인 요청 생성 |
| 검증 | distributionType === SERVICE, supplier ACTIVE, 중복 PENDING/APPROVED 방지 |
| 재요청 | REJECTED/REVOKED 상태에서 재요청 가능 |

**라우트**:
- `POST /neture/admin/service-approvals/:id/approve` — 승인 + Listing 자동 생성
- `POST /neture/admin/service-approvals/:id/reject` — 거절

---

## 5. 파일 매니페스트

### Supplier 등록 (STEP 1)

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 2-Step 등록 위자드 |
| `services/web-neture/src/pages/supplier/SupplierProductCSVImportPage.tsx` | CSV 대량 등록 |
| `apps/api-server/src/modules/neture/neture.service.ts` | createSupplierOffer() |
| `apps/api-server/src/modules/neture/neture.routes.ts` | POST /supplier/products |

### Admin 승인 (STEP 2)

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/neture.service.ts` | approveProduct() / rejectProduct() |
| `apps/api-server/src/modules/neture/neture.routes.ts` | POST /admin/products/:id/approve |
| `apps/admin-dashboard/src/pages/neture/ProductListPage.tsx` | ⚠️ 일반 CRUD (승인 UI 없음) |
| `apps/admin-dashboard/src/pages/neture/ProductDetailPage.tsx` | 상품 편집 (승인 UI 없음) |

### Service 노출 (STEP 3)

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/utils/auto-listing.utils.ts` | autoExpandPublicProduct() / autoListPublicProductsForOrg() |
| `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` | SERVICE 승인 |
| `services/web-kpa-society/src/pages/branch/BranchProductCatalog.tsx` | KPA B2B 카탈로그 |
| `services/web-glucoseview/src/pages/ProductCatalogPage.tsx` | GlycoPharm B2B 카탈로그 |

### Store HUB (STEP 4)

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/store/` | Store 모듈 전체 |
| `apps/api-server/src/entities/organization-product-listing.entity.ts` | Listing 엔티티 |
| `apps/api-server/src/entities/organization-product-channel.entity.ts` | Channel 엔티티 |

### Store 활용 (STEP 5)

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/pages/store/` | QR Store / Public Store |
| `services/web-neture/src/pages/tablet/` | Tablet POS |
| 각 서비스 web의 store 페이지 | 서비스별 Store |

---

## 6. 남은 문제 및 권장 WO

| 우선순위 | 문제 | 권장 WO |
|---------|------|---------|
| **HIGH** | Admin 상품 승인 전용 UI 부재 | WO-O4O-ADMIN-PRODUCT-APPROVAL-UI-V1 |
| MEDIUM | autoExpandPublicProduct() 이중 호출 | 코드 리뷰에서 정리 |
| MEDIUM | KPI serviceKey 필터 누락 | Boundary Policy 준수 검증 WO |

---

*Investigation completed: 2026-03-06*
*Investigator: Claude Code (AI)*
