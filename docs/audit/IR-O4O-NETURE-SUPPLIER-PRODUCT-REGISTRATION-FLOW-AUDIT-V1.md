# IR-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-FLOW-AUDIT-V1

> **조사 일시**: 2026-03-15
> **조사 대상**: Neture 공급자 제품 등록 흐름 (Backend + Frontend)
> **Verdict**: **PARTIAL** — 핵심 등록/승인 파이프라인 완성, B2B/B2C 분리 흐름 미구현

---

## 1. 실제 구현 상태 요약

| 기능 | 상태 | 비고 |
|------|------|------|
| **개별 등록** | ✅ IMPLEMENTED | 3단계 위저드 완성 |
| **대량 등록 (Backend)** | ✅ IMPLEMENTED | CSV 파이프라인 (2-phase) |
| **대량 등록 (Supplier UI)** | ❌ MISSING | Admin 전용 페이지만 존재 |
| **B2B 등록** | ✅ IMPLEMENTED | Distribution Type + 3-tier 가격 |
| **B2B + B2C 동시 등록** | ❌ NOT APPLICABLE | 단일 Offer 모델 (분리 구조 아님) |
| **B2C → B2B 데이터 복사** | ❌ DOES NOT EXIST | Clone/Copy 기능 없음 |
| **운영자 승인** | ✅ IMPLEMENTED | PENDING → APPROVED/REJECTED |
| **자동 Publish 방지** | ✅ CORRECT | 기본 PENDING + isActive=false |

---

## 2. 제품 등록 진입 구조

### 2.1 실제 라우트

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/supplier/products/new` | `SupplierProductCreatePage` | 개별 등록 (3단계 위저드) |
| `/supplier/products` | `SupplierProductsPage` | 등록 상품 목록 관리 |
| `/workspace/admin/catalog-import/csv` | `CSVImportPage` | 대량 등록 (Admin 전용) |

### 2.2 설계 의도 vs 실제

```
설계:
  /supplier/products/create
    ├─ [대량 등록]
    └─ [개별 등록]

실제:
  /supplier/products/new     ← 개별 등록 직접 진입
  대량 등록 선택 UI 없음     ← Supplier가 대량 등록 선택 불가
```

**대량 등록 / 개별 등록 선택 화면은 존재하지 않는다.**
Supplier는 개별 등록만 가능하며, CSV Import는 Admin 전용이다.

---

## 3. 개별 등록 흐름 (3단계 위저드)

**파일**: `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx`

### Step 1: 바코드 조회 (Line 263-316)
```
바코드 입력
  ↓
productApi.getMasterByBarcode(barcode)
  ↓
├─ Master 존재 → Step 3 (Offer 등록)
└─ Master 미존재 → Step 2 (수동 입력)
```

### Step 2: Master 정보 입력 (Line 318-545)
- 마케팅명, 규제유형 (건강기능식품/의약외품/화장품/의료기기/일반)
- 규제명 (식약처 공식명) — **필수**
- 제조사명 — **필수**
- MFDS 허가번호, 카테고리, 브랜드, 규격, 원산지, 태그
- 제품 이미지 (최대 10MB)

### Step 3: Offer 등록 (Line 547-709)
- 일반 공급가 (원) — **필수**
- Gold/Platinum 단가 (선택)
- 소비자 참조가 (선택)
- 유통 정책: **PUBLIC / SERVICE / PRIVATE**

### API 호출
```
POST /api/v1/neture/supplier/products
  body: { barcode, manualData?, distributionType?, priceGeneral?, ... }
```

### 등록 결과
```typescript
{
  approvalStatus: 'PENDING',
  isActive: false,
  distributionType: distributionType || 'PRIVATE'
}
```

**→ 자동 Publish 없음. 항상 PENDING 상태로 생성됨. ✅**

---

## 4. 대량 등록 (CSV Import)

### 4.1 Backend 파이프라인

**파일**: `apps/api-server/src/modules/neture/services/csv-import.service.ts`

**2-Phase Pipeline:**

| Phase | API | 설명 |
|-------|-----|------|
| Upload + Validate | `POST /supplier/csv-import/upload` | CSV 파싱 → 바코드 검증 → MFDS 확인 → Batch 생성 |
| Apply | `POST /supplier/csv-import/batches/:id/apply` | Validated rows → Master 생성/연결 → Offer Upsert |

**지원 컬럼**: barcode, supplier_sku, supply_price, msrp, stock_qty, distribution_type, description

**Offer 생성 시**: `approvalStatus = PENDING`, `isActive = false` (동일)

### 4.2 Supplier UI — ❌ MISSING

- Backend endpoint는 Supplier 인증 기반 (`requireActiveSupplier`)으로 존재
- **그러나 Supplier 측 CSV 업로드 UI 페이지가 없음**
- Admin 페이지 (`/workspace/admin/catalog-import/csv`)만 존재
- Supplier는 현재 개별 등록만 가능

---

## 5. B2B / B2C 등록 구조

### 5.1 설계 의도 vs 실제

```
설계:
  개별 등록 → [B2B 등록] or [B2B + B2C 동시 등록]
  B2C 등록 → "B2B 등록 계속" 버튼 → 데이터 복사

실제:
  단일 SupplierProductOffer로 B2B/B2C 통합 관리
  B2B/B2C 선택 UI 없음
  별도 B2C 등록 화면 없음
  B2C → B2B 복사 기능 없음
```

### 5.2 현재 가격 모델 (단일 Offer)

| 필드 | 용도 | 성격 |
|------|------|------|
| `price_general` | B2B 일반 단가 | 필수 |
| `price_gold` | B2B Gold 단가 | 선택 |
| `price_platinum` | B2B Platinum 단가 | 선택 |
| `consumer_reference_price` | B2C 소비자 참조가 | 정보용 (비강제) |

**현재 구조에서 B2B와 B2C는 별도 상품이 아니라 하나의 Offer 내 가격 필드로 관리된다.**

### 5.3 유통 모델 (Distribution Type)

| Type | 승인 필요? | 대상 |
|------|:---------:|------|
| **PUBLIC** | 관리자 제품 승인만 | 모든 Seller에 자동 배포 |
| **SERVICE** | 관리자 제품 승인 + 서비스 승인 | 특정 서비스(KPA 등) 소속 Seller |
| **PRIVATE** | 관리자 제품 승인 + 비공개 승인 | allowedSellerIds에 명시된 Seller만 |

---

## 6. 운영자 승인 구조

### 6.1 승인 페이지

| 페이지 | 경로 | 역할 |
|--------|------|------|
| `AdminProductApprovalPage` | `/workspace/admin/products` | 제품 승인/반려 |
| `AdminSupplierApprovalPage` | `/workspace/admin/suppliers` | 공급자 승인/반려 |
| `AdminServiceApprovalPage` | `/workspace/admin/service-approvals` | 서비스 승인/반려/취소 |

### 6.2 제품 승인 흐름

```
Supplier 등록
  approvalStatus = PENDING
  isActive = false
       ↓
Admin /workspace/admin/products
  [승인] → approvalStatus = APPROVED, isActive = true
         → PUBLIC: 모든 활성 Store에 Listing 자동 생성
         → SERVICE/PRIVATE: 별도 ServiceApproval 필요
  [반려] → approvalStatus = REJECTED
         → 관련 ServiceApproval 전부 REVOKED
         → 관련 Listing 전부 비활성화
```

### 6.3 서비스 승인 흐름 (SERVICE/PRIVATE Distribution)

```
ProductApproval (product_approvals 테이블)
  PENDING → APPROVED → (REVOKED)
            REJECTED

승인 시:
  OrganizationProductListing 자동 생성 (is_active = false)
  → Operator가 수동으로 is_active = true 설정
```

### 6.4 Backend API

| Endpoint | 설명 |
|----------|------|
| `GET /api/v1/neture/admin/products` | 전체 제품 목록 (상태 필터) |
| `GET /api/v1/neture/admin/products/pending` | 대기 제품 목록 |
| `POST /api/v1/neture/admin/products/:id/approve` | 제품 승인 |
| `POST /api/v1/neture/admin/products/:id/reject` | 제품 반려 |
| `GET /api/v1/neture/admin/service-approvals` | 서비스 승인 목록 |
| `POST /api/v1/neture/admin/service-approvals/:id/approve` | 서비스 승인 |
| `POST /api/v1/neture/admin/service-approvals/:id/reject` | 서비스 반려 |
| `POST /api/v1/neture/admin/service-approvals/:id/revoke` | 서비스 취소 |

---

## 7. DB Entity 구조

### 7.1 계층

```
ProductMaster (product_masters)
    ↓ OneToMany
SupplierProductOffer (supplier_product_offers)
    ↓ via ProductApproval (product_approvals)
OrganizationProductListing (organization_product_listings)
```

### 7.2 ProductMaster

**파일**: `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`

| 필드 | 변경 가능 | 설명 |
|------|:---------:|------|
| barcode | ❌ Immutable | GTIN-14 |
| regulatory_type | ❌ Immutable | 규제 유형 |
| regulatory_name | ❌ Immutable | 식약처 공식명 |
| manufacturer_name | ❌ Immutable | 제조사 |
| marketing_name | ✅ | 마케팅명 |
| brand_id | ✅ | 브랜드 FK |
| category_id | ✅ | 카테고리 FK |
| is_mfds_verified | ❌ | 식약처 인증 여부 |

**상태 필드 없음** — Master는 SSOT로서 상태를 갖지 않음.

### 7.3 SupplierProductOffer

**파일**: `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`

| 필드 | 기본값 | 설명 |
|------|--------|------|
| approval_status | PENDING | PENDING / APPROVED / REJECTED |
| is_active | false | Admin 승인 후 true |
| distribution_type | PRIVATE | PUBLIC / SERVICE / PRIVATE |
| price_general | — | B2B 일반 단가 |
| price_gold | null | B2B Gold 단가 |
| price_platinum | null | B2B Platinum 단가 |
| consumer_reference_price | null | B2C 참조가 |
| stock_quantity | 0 | 재고 |
| allowed_seller_ids | [] | PRIVATE 대상 목록 |

### 7.4 ProductApproval

**파일**: `apps/api-server/src/entities/ProductApproval.ts`

| 필드 | 설명 |
|------|------|
| offer_id | SupplierProductOffer FK |
| organization_id | 요청 조직 |
| service_key | 서비스 (kpa 등) |
| approval_type | SERVICE / PRIVATE |
| approval_status | PENDING / APPROVED / REJECTED / REVOKED |
| requested_by | 요청자 |
| decided_by | 결정자 |
| reason | 반려/취소 사유 |

### 7.5 OrganizationProductListing

**파일**: `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts`

| 필드 | 기본값 | 설명 |
|------|--------|------|
| organization_id | — | Store FK |
| master_id | — | ProductMaster FK |
| offer_id | — | Offer FK |
| is_active | false | 진열 여부 (수동 활성화) |
| price | null | Store별 가격 Override |

---

## 8. 핵심 발견 사항

### 8.1 B2C → B2B 복사 기능 — ❌ 존재하지 않음

코드 전체에서 다음이 발견되지 않음:
- Product clone/copy/duplicate 함수
- B2C → B2B 데이터 전송 로직
- 별도 B2C 등록 화면 (`/supplier/products/create-b2c`)
- 별도 B2B 등록 화면 (`/supplier/products/create-b2b`)

**현재 구조**: 하나의 `SupplierProductOffer`가 B2B 가격(3-tier)과 B2C 참조가를 모두 포함.
"B2B" / "B2C"라는 개념 분리가 아닌 **Distribution Type (PUBLIC/SERVICE/PRIVATE)** 으로 유통 범위를 제어.

### 8.2 Supplier 대량 등록 UI — ❌ Missing

Backend API는 Supplier 인증 기반으로 준비됨:
- `POST /api/v1/neture/supplier/csv-import/upload`
- `GET /api/v1/neture/supplier/csv-import/batches`
- `POST /api/v1/neture/supplier/csv-import/batches/:id/apply`

그러나 Supplier용 CSV 업로드 **UI 페이지가 없음**. Admin 전용 페이지만 존재.

### 8.3 자동 Publish 방지 — ✅ 정상

```
생성 시: approvalStatus = PENDING, isActive = false
         → Supplier가 직접 Publish 불가
         → 반드시 Admin 승인 필요

승인 시: approvalStatus = APPROVED, isActive = true
         → PUBLIC: 자동 Listing 생성 (is_active = false → Operator 수동 활성화)
         → SERVICE/PRIVATE: 별도 승인 후 Listing 생성
```

**플랫폼 정책 오류 없음.** 설계 의도대로 PENDING → OPERATOR APPROVAL 구조 유지.

### 8.4 등록 → 승인 → 진열 전체 파이프라인 — ✅ 완성

```
Supplier 등록 (PENDING)
    ↓
Admin 제품 승인 (APPROVED)
    ↓
├─ PUBLIC: 전 Store Listing 자동 생성
├─ SERVICE: Store가 서비스 승인 요청 → Admin 승인 → Listing 생성
└─ PRIVATE: allowedSellerIds 확인 → 승인 → Listing 생성
    ↓
Store Operator가 Listing 활성화 (is_active = true)
    ↓
소비자 노출
```

---

## 9. 결론 및 권장 사항

### Verdict: **PARTIAL**

핵심 파이프라인 (등록 → 승인 → Listing)은 **완전히 구현**되어 있으나,
설계 의도의 일부 UX 흐름은 현재 아키텍처와 다른 방향으로 구현됨.

### 현재 구조 vs 설계 의도 차이

| 설계 의도 | 현재 구현 | 평가 |
|----------|----------|------|
| 대량/개별 선택 화면 | 개별만 가능 (Supplier) | Gap |
| B2B/B2C 선택 → 분리 등록 | 단일 Offer + 가격 필드 | 아키텍처 차이 |
| B2C → B2B 데이터 복사 | 해당 없음 (단일 Offer 모델) | N/A |
| 운영자 승인 (PENDING → APPROVED) | ✅ 완전 구현 | OK |
| 자동 Publish 방지 | ✅ 정상 | OK |

### 권장 다음 단계

**A) 현재 구조 유지 (권장)**

현재 단일 Offer 모델은 실제로 합리적:
- 하나의 상품에 B2B 3-tier 가격 + B2C 참조가를 모두 포함
- Distribution Type으로 유통 범위 제어
- 불필요한 데이터 중복 없음

개선이 필요한 부분:
1. **Supplier CSV 업로드 UI 추가** → `WO-NETURE-SUPPLIER-BULK-UPLOAD-UI-V1`
2. **등록 진입점 개선** (대량/개별 선택) → 위 WO에 포함 가능

**B) B2B/B2C 분리 구조 도입 시**

현재 아키텍처를 크게 변경해야 함:
- SupplierProductOffer를 B2B Offer / B2C Offer로 분리
- ProductMaster → B2C Offer → B2B Offer 3-tier 구조
- 기존 Freeze된 Distribution Engine (F8) 변경 필요 → **WO 승인 필수**

---

## 10. 주요 코드 위치 참조

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/neture.service.ts:1389-1495` | createSupplierOffer() |
| `apps/api-server/src/modules/neture/neture.service.ts:1626-1693` | resolveOrCreateMaster() |
| `apps/api-server/src/modules/neture/neture.service.ts:565-616` | approveProduct() |
| `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` | Supplier API 전체 |
| `apps/api-server/src/modules/neture/controllers/admin.controller.ts` | Admin 승인 API |
| `apps/api-server/src/modules/neture/services/csv-import.service.ts` | CSV 파이프라인 |
| `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` | ServiceApproval v2 |
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | Master SSOT |
| `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | Offer Entity |
| `apps/api-server/src/entities/ProductApproval.ts` | 서비스 승인 Entity |
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 개별 등록 UI |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 등록 상품 목록 |
| `services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx` | 제품 승인 UI |
| `services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx` | 공급자 승인 UI |
| `services/web-neture/src/pages/admin/AdminServiceApprovalPage.tsx` | 서비스 승인 UI |
| `services/web-neture/src/pages/admin/catalog-import/CSVImportPage.tsx` | CSV Import (Admin) |
| `services/web-neture/src/lib/api/supplier.ts:494-514` | createProduct() |
| `services/web-neture/src/lib/api/admin.ts` | Admin API client |
