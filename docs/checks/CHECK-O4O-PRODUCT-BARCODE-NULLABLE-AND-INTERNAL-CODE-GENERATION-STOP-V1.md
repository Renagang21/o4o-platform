# CHECK-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1

> WO: **WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1** (Phase A~C)
> 선행 설계: [CHECK-O4O-PRODUCT-IDENTITY-UUID-AND-EXTERNAL-IDENTIFIER-SEPARATION-DESIGN-V1](CHECK-O4O-PRODUCT-IDENTITY-UUID-AND-EXTERNAL-IDENTIFIER-SEPARATION-DESIGN-V1.md)
> 선행 조사: [CHECK-O4O-INTERNAL-PRODUCT-CODE-STORAGE-AND-USAGE-AUDIT-V1](CHECK-O4O-INTERNAL-PRODUCT-CODE-STORAGE-AND-USAGE-AUDIT-V1.md)
> 커밋: `0b7f70544`
> 일자: 2026-07-10

---

## 1. 목적 / 문제

O4O 는 바코드 미입력 상품에 대해 GS1 200 매장내부예약 대역의 **합성 바코드**(`generateInternalBarcode`)를
자동 생성해 `product_masters.barcode` 에 저장하고, `INTERNAL_O4O` 식별자와 `barcode_source='INTERNAL'` 을
함께 기록해 왔다. 그 결과:

- **정체성(무엇인가)** 과 **바코드(GS1 국제 식별)** 가 뒤섞였다 — 합성 200 코드는 실제 바코드가 아닌데도
  바코드 컬럼/식별자 체계에 진짜 바코드처럼 존재.
- 사용자 화면·검색·CSV 에 합성 코드가 실제 바코드인 양 노출될 수 있었다.
- 이름/제조사 유사도(ILIKE) 기반 자동 매칭과 결합해 서로 다른 상품이 잘못 병합될 위험.

**교정 원칙**: 상품 정체성 = `ProductMaster.id`(UUID) 단일. 바코드는 **실제 바코드만**(없으면 NULL).
합성 코드를 **더 이상 만들지 않는다**(신규 생성 중단). 기존 레거시 데이터는 이 WO 에서 건드리지 않는다(별도 이관 WO).

---

## 2. 범위 (Phase A~C only)

**포함**
- (A) `product_masters.barcode`, `mfds_product_id` NOT NULL 해제 + 엔티티 nullable
- (B) 마이그레이션: DROP NOT NULL + `UNIQUE(barcode)` → partial unique index `WHERE barcode IS NOT NULL`
- (C) 모든 바코드리스 등록 경로에서 합성코드 생성 중단(admin/supplier/image/mobile 공통 catalog 경로),
  API·검색·목록·상세·CSV·UI null-safe 정리

**제외 (별도 WO)**
- 기존 17,168 합성 바코드 일괄 이관/삭제
- `INTERNAL_O4O` 식별자 17,148 삭제
- `barcode_source` 컬럼 정리/드롭
- 합성 `mfds_product_id` 정정
- `STORE_LOCAL`/`PHARMACY_LOCAL`/`SUPPLIER_SKU` 식별자 타입 정리 (census 0행)
- 개별 상품(POWER BONE K2 등) 데이터 수정, 상품 삭제

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | `barcode`/`mfdsProductId` → `string \| null` nullable, 헤더/불변식 주석 정정(정체성=UUID 단일) |
| `apps/api-server/src/database/migrations/20261230000000-ProductMasterBarcodeAndMfdsIdNullable.ts` | (신규) DROP NOT NULL ×2 + `uq_product_masters_barcode` → partial unique `WHERE barcode IS NOT NULL` |
| `apps/api-server/src/modules/neture/services/catalog.service.ts` | `createMasterWithInternalCode` → `createMasterWithoutBarcode`(barcode=null, mfds=null, 이름+제조사 정확 dedup 유지, race re-query 유지). `getProductMasterByBarcode` null/empty guard. `resolveOrCreateMaster` 바코드 빈값 → 무바코드 생성 |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | `validateCreateInput` 합성코드 생성 블록 제거 → 빈 barcode 통과(=NULL 등록) |
| `apps/api-server/src/utils/gtin.ts` | `generateInternalBarcode()` 제거 (validateGtin/isValidGtin/check digit 유지) |
| `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts` | `INTERNAL_O4O` 주석을 LEGACY(신규 생성 중단)로 정정 — 타입은 기존 데이터 위해 유지 |
| `apps/admin-dashboard/src/api/o4o-product-db.api.ts` | `barcode: string` → `string \| null` (ProductMasterRow/Detail/CreatedProductMaster) |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx` | 바코드 컬럼 null → "바코드 없음" |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx` | 대표 바코드 null → "바코드 없음" |
| `services/web-neture/src/pages/admin/AdminMasterManagementPage.tsx` | 검색 필터 `m.barcode.toLowerCase()` → `(m.barcode \|\| '')` null-guard (크래시 방지) |

> 매장 O4O 표준상품 선택 모달(`AddO4oStandardProductModal.tsx`)·매장 취급상품 타입(`o4oStandardProducts.ts`)은
> 이미 `barcode: string \| null` + `\|\| '—'` 로 null-safe → 무변경.
> 실 바코드 스캔 등록 경로(store-tablet register-by-barcode)는 barcode 필수 유지 → 무변경.

---

## 4. 정체성 계약 (변경 후)

- **정체성** = `ProductMaster.id` (UUID). 사용자 화면에 관리 코드로 **노출하지 않음**.
- **barcode** = 실제 GS1 바코드만. 없으면 **NULL**. 화면에는 "바코드 없음".
- **mfds_product_id** = 공식 허가/신고 값만. 없으면 **NULL**.
- **dedup** = 결정적 값만: 실제 바코드 → 공식 ProductIdentifier → 허가번호 → 이름+제조사+규격 정확일치 → (없으면) 운영자 검토.
  ILIKE/유사도 자동 매칭 없음.
- barcode UNIQUE = 값 있는 행에만 (partial unique index). 다중 NULL 허용.

---

## 5. 검증

### 5.1 빌드 / 타입체크

| 앱 | 결과 |
|----|------|
| api-server `tsc -p tsconfig.build.json` | ✅ EXIT=0 (dist 생성, migration 컴파일 확인) |
| api-server `tsc --noEmit` | ✅ WO 파일 0 에러 (`src/scripts/drug-otc-nutrition-combo-*` 사전존재 에러는 동시세션 별건, WO 무관) |
| admin-dashboard | ✅ typecheck + vite build EXIT=0 |
| web-neture | ✅ typecheck + vite build EXIT=0 |
| web-kpa-society | ✅ typecheck + vite build EXIT=0 |

- `dist/utils/gtin.js`: `generateInternalBarcode` 함수 미존재(주석 참조 1건뿐), export=validate/isValid만.
- 프론트 크래시 사이트 전수 점검: `barcode.<method>` 사이트 중 리스트 항목 대상은 web-neture 검색필터 1건 →
  null-guard 처리. 나머지(`form.barcode.trim()`)는 폼 로컬 입력값(항상 string) → 무해.

### 5.2 배포

| 워크플로 | 상태 |
|----------|------|
| Deploy API Server (Cloud Run) + migration | ⏳ (배포 후 리비전/마이그레이션 로그 기입) |
| Deploy Admin Dashboard | ⏳ |
| Deploy Web Services (neture) | ⏳ |

### 5.3 신규 등록 smoke (배포 후)

- [ ] 바코드 입력 등록 → barcode 실제값 저장, 화면 실제 바코드 표시
- [ ] 바코드 미입력 등록 → barcode=NULL, mfds_product_id=NULL, 합성 200 코드 없음, INTERNAL_O4O 식별자 없음
- [ ] 바코드 미입력 다건 등록 → 다중 NULL 공존(partial unique 위반 없음)
- [ ] 목록/상세에서 NULL 상품 → "바코드 없음" 표시, UUID 미노출
- [ ] 실 바코드 스캔 경로 → 종전과 동일 동작

### 5.4 DB post-check (배포 후, read-only)

- [ ] 신규 무바코드 테스트 상품: `barcode IS NULL`, `mfds_product_id IS NULL`, `200%` 바코드 없음, `INTERNAL_O4O` 식별자 없음
- [ ] **레거시 무변경 검증**: 기존 합성 `200%` barcode master 건수 = WO 이전과 동일(17,168), `INTERNAL_O4O` 식별자 건수 동일

---

## 6. 비가역 경계 (down 마이그레이션)

배포 후 신규 바코드리스 등록이 `barcode=NULL` 로 쌓이므로, `down` 에서 `NOT NULL` 재설정은
NULL 행 존재 시 실패한다. 따라서 `down` 은 partial index → 일반 UNIQUE 로만 되돌리고 **NOT NULL 은 재설정하지 않는다**.
사실상 전진 전용(forward-only) 성격.

---

## 7. 결론

신규 합성 내부코드 생성 경로를 **전면 차단**하고, 스키마/엔티티/프론트를 barcode NULL 을 정상 상태로
받아들이도록 정리했다. 상품 정체성은 UUID 단일로 확정. 기존 레거시 17,168 건은 무변경으로 보존되며,
일괄 이관은 후속 WO 로 분리한다.
