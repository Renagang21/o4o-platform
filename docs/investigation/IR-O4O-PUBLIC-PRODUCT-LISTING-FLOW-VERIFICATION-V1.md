# IR-O4O-PUBLIC-PRODUCT-LISTING-FLOW-VERIFICATION-V1

**작성일**: 2026-03-08
**목적**: 공개 제품이 등록 → 승인 → 서비스별 매장 HUB 진열까지 정상적으로 이어지는지 검증

---

## 1. 등록 구조

### 테이블 구조

```
ProductMaster (product_masters)
  ├── barcode (GTIN, UNIQUE)
  ├── regulatory_name, marketing_name
  ├── manufacturer_name
  ├── category_id, brand_id
  └── 1:N → SupplierProductOffer

SupplierProductOffer (supplier_product_offers)
  ├── master_id → ProductMaster
  ├── supplier_id → NetureSupplier
  ├── distribution_type: PUBLIC | SERVICE | PRIVATE
  ├── approval_status: PENDING | APPROVED | REJECTED
  ├── is_active: boolean (default: false)
  ├── price_general, price_gold, price_platinum
  ├── consumer_reference_price
  ├── slug (UNIQUE)
  └── UNIQUE(master_id, supplier_id)
```

### 등록 API

**Endpoint**: `POST /api/v1/neture/supplier/products`
**Auth**: `requireAuth` + `requireActiveSupplier`

### 등록 시 초기 상태

| 필드 | 초기값 | 비고 |
|------|--------|------|
| `approval_status` | `PENDING` | 운영자 승인 대기 |
| `is_active` | `false` | 승인 전 비활성 |
| `distribution_type` | `PRIVATE` (기본값) | 공급자가 명시적으로 PUBLIC 지정 필요 |

### 등록 플로우

```
1. barcode 필수 입력
2. masterId 직접 주입 차단 (보안)
3. Supplier ACTIVE 상태 확인
4. ProductMaster 조회/생성 (resolveOrCreateMaster)
5. SupplierProductOffer 생성 (PENDING, inactive, PRIVATE)
```

---

## 2. 승인 구조

### 승인 API

| Endpoint | 동작 |
|----------|------|
| `POST /api/v1/neture/admin/products/:id/approve` | PENDING → APPROVED |
| `POST /api/v1/neture/admin/products/:id/reject` | PENDING → REJECTED |

**Auth**: `requireAuth` + `requireNetureScope('neture:admin')`

### 승인 시 동작

**APPROVED 처리 시:**

```
1. offer.approvalStatus = APPROVED
2. offer.isActive = true
3. distribution_type === PUBLIC인 경우:
   → autoExpandPublicProduct() 실행
   → 모든 ACTIVE 조직에 organization_product_listings 자동 생성
   → 단, is_active = false로 생성 (매장이 직접 활성화해야 함)
```

**REJECTED 처리 시:**

```
1. offer.approvalStatus = REJECTED
2. 기존 APPROVED product_approvals → REVOKED
3. organization_product_listings → is_active = false
```

### 승인 UI

**파일**: `apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx`
- 통계 대시보드 (PENDING / APPROVED / REJECTED 카운트)
- DataTable (상태, 상품명, 공급자명, 유통타입, 가격, 등록일)
- PENDING 건에만 승인/거절 버튼 표시

### V2 서비스별 승인 (SERVICE/PRIVATE)

```
POST /api/v1/product-policy-v2/service-approval      — SERVICE 승인 요청 생성
POST /api/v1/product-policy-v2/service-approval/:id/approve — 승인 처리
POST /api/v1/product-policy-v2/private-approval       — PRIVATE 승인 요청 생성
POST /api/v1/product-policy-v2/private-approval/:id/approve — 승인 처리
```

---

## 3. 서비스별 HUB 진열 결과

### 4중 가시성 게이트 (Unified Store Public API)

모든 B2C 소비자 노출은 4개 게이트를 모두 통과해야 함:

```
Gate 1: organization_product_listings.organization_id 일치
Gate 2: organization_product_listings.service_key 일치
Gate 3: organization_product_listings.is_active = true
Gate 4: organization_product_channels 활성 + B2C 채널 APPROVED
+ supplier_product_offers.is_active = true
+ neture_suppliers.status = 'ACTIVE'
```

### 서비스별 판정

| 서비스 | service_key | HUB 목록 표시 | 비고 |
|--------|-------------|:-------------:|------|
| KPA-a (대한약사회) | `kpa` | **PASS** | `/o4o/pharmacy/products/catalog` API 정상 동작. PUBLIC + SERVICE 제품 표시. |
| KPA-b (서울시약사회) | `kpa` | **PASS** | KPA-a와 동일 API, organization_id만 다름 |
| KPA-c (종로구약사회) | `kpa` | **PASS** | KPA-a와 동일 API, organization_id만 다름 |
| GlycoPharm | `glycopharm` | **CONDITIONAL** | service_key 하드코딩 이슈 있음 (아래 상세) |
| K-Cosmetics | `cosmetics` | **SEPARATE** | 독립 상품 시스템 사용 (아래 상세) |

---

### KPA-a / KPA-b / KPA-c (PASS)

**API**: `GET /api/v1/o4o/pharmacy/products/catalog`
**파일**: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts`

**카탈로그 쿼리 조건:**

```sql
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE')
  AND spo.is_active = true
  AND s.status = 'ACTIVE'
```

**결론**: 공급자 등록 → 운영자 승인(APPROVED + isActive=true) → 카탈로그에 표시됨.
organization_id별 필터링으로 KPA-a/b/c 모두 동일 구조로 동작.

---

### GlycoPharm (CONDITIONAL)

**API**: `GET /api/v1/glycopharm/stores/:slug/products`
**파일**: `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts`

**발견된 이슈:**

```sql
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = 'kpa'   ← 하드코딩!
  AND opl.is_active = true
```

`service_key`가 `'kpa'`로 하드코딩되어 있음.

**영향:**
- `service_key = 'kpa'`로 등록된 listing만 조회됨
- `autoExpandPublicProduct()`는 `organization_service_enrollments.service_code`를 사용하므로, GlycoPharm 조직의 enrollment가 `'kpa'`가 아닌 `'glycopharm'`이면 listing 자체가 생성되지 않을 수 있음
- 또는 listing이 `service_key = 'glycopharm'`으로 생성되면 이 쿼리에서 조회 불가

**판정**: 실제 동작은 `organization_service_enrollments`의 `service_code` 값과 `autoExpandPublicProduct`의 listing 생성 시 `service_key` 값에 따라 다름. 코드 경로상 **불일치 가능성** 있음.

---

### K-Cosmetics (SEPARATE)

**API**: `GET /api/v1/cosmetics/stores/:storeId/listings`
**파일**: `apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts`

**구조:**
- Neture의 `organization_product_listings` 사용하지 않음
- 독립적인 화장품 상품 시스템 (cosmetics_* 테이블 prefix)
- CLAUDE.md 규칙: "독립 스키마 (`cosmetics_` prefix), E-commerce Core 통해 주문"

**판정**: Neture 공급자 제품 등록/승인 흐름과 무관. 자체 상품 관리 체계 사용.

---

## 4. 누락/예외 서비스

### 예외 1: GlycoPharm service_key 하드코딩

| 항목 | 값 |
|------|------|
| **파일** | `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` |
| **위치** | `queryVisibleProducts` 함수 내 SQL |
| **현상** | `opl.service_key = 'kpa'` 하드코딩 |
| **영향** | GlycoPharm 전용 listing이 있어도 조회 안 될 수 있음 |
| **심각도** | 중 — 현재 GlycoPharm이 KPA 제품을 재활용하는 설계라면 의도적일 수 있음 |

### 예외 2: K-Cosmetics 독립 시스템

| 항목 | 값 |
|------|------|
| **현상** | Neture supplier_product_offers 와 별도 상품 체계 |
| **영향** | Neture에서 등록/승인한 제품이 K-Cosmetics HUB에 자동 진열 안 됨 |
| **심각도** | 낮 — CLAUDE.md에 명시된 설계 원칙 (cosmetics_ prefix 독립 스키마) |

### 예외 3: auto-expand 후 수동 활성화 필요

| 항목 | 값 |
|------|------|
| **현상** | `autoExpandPublicProduct()`가 `is_active = false`로 listing 생성 |
| **영향** | 매장 운영자가 직접 listing을 활성화해야 소비자에게 노출 |
| **심각도** | 정상 — 의도된 설계 (매장 자율 진열) |

---

## 5. 원인 분석

### 전체 흐름 요약

```
공급자: 제품 등록 (PENDING, inactive, PRIVATE)
                 ↓
                 ↓ 공급자가 distributionType을 PUBLIC으로 설정
                 ↓
운영자: 승인 (APPROVED, isActive=true)
                 ↓
                 ↓ PUBLIC인 경우 autoExpandPublicProduct() 실행
                 ↓
자동 생성: organization_product_listings (is_active=false)
                 ↓
                 ↓ 매장 운영자가 listing 활성화
                 ↓
매장 HUB 카탈로그에 표시
                 ↓
                 ↓ 매장 운영자가 채널에 상품 등록
                 ↓
4중 가시성 게이트 통과 → 소비자 노출
```

### 핵심 게이트 정리

| 단계 | 게이트 | 통과 조건 |
|------|--------|-----------|
| 1 | 제품 승인 | `approval_status = 'APPROVED'` |
| 2 | 제품 활성 | `is_active = true` |
| 3 | 공급자 활성 | `neture_suppliers.status = 'ACTIVE'` |
| 4 | Listing 존재 | `organization_product_listings` 레코드 존재 |
| 5 | Listing 활성 | `organization_product_listings.is_active = true` |
| 6 | 채널 매핑 | `organization_product_channels` 레코드 존재 + 활성 |
| 7 | 채널 승인 | `organization_channels.status = 'APPROVED'` |

---

## 6. 후속 수정 필요 항목

### 즉시 확인 필요

| # | 항목 | 설명 |
|---|------|------|
| 1 | GlycoPharm service_key 하드코딩 | `store.controller.ts`의 `'kpa'` 하드코딩이 의도적인지 확인. GlycoPharm 조직의 `organization_service_enrollments.service_code` 값과 `autoExpandPublicProduct`의 listing 생성 시 `service_key` 값을 교차 검증해야 함. |
| 2 | autoExpandPublicProduct의 service_code 출처 | `organization_service_enrollments.service_code`가 실제 어떤 값인지 확인. KPA 조직은 `'kpa'`, GlycoPharm 조직은 `'glycopharm'`인지 `'kpa'`인지. |

### 후속 검증 단계

```
이번 검증 (완료):
  제품 등록 → 운영자 승인 → HUB 카탈로그 표시

다음 검증:
  HUB 카탈로그 → 매장 listing 활성화 → 채널 등록 → Storefront 노출
```

---

## 부록: 핵심 파일 참조

| 역할 | 파일 |
|------|------|
| SupplierProductOffer Entity | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |
| ProductMaster Entity | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| 등록 API | `apps/api-server/src/modules/neture/neture.routes.ts` (POST /supplier/products) |
| 등록 Service | `apps/api-server/src/modules/neture/neture.service.ts` (createSupplierOffer) |
| 승인 API | `apps/api-server/src/modules/neture/neture.routes.ts` (POST /admin/products/:id/approve) |
| 승인 UI | `apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx` |
| Auto-expand | `apps/api-server/src/utils/auto-listing.utils.ts` (autoExpandPublicProduct) |
| KPA 카탈로그 | `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` |
| GlycoPharm 제품 | `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` |
| K-Cosmetics 제품 | `apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts` |
| 통합 Public API | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` |
| V2 정책 승인 | `apps/api-server/src/modules/product-policy-v2/product-policy-v2.internal.routes.ts` |
| OrganizationProductListing Entity | `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` |
